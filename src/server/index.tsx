import path from 'path';
import httpLib from 'http';
import socketLib from 'socket.io';
import express from 'express';
import * as os from 'os';
import * as api from './api';
import { authMiddleware } from './auth';
import { attachToSocket } from './emitter';
import { setLocation } from './mirroring';
import { logger } from './logging';
import * as dbStorage from './dbStorage';
import * as discord from './discord';
import * as gameStorage from './gameStorage';
import * as serverStore from './serverStore';

const rootDir = path.resolve('.');

const app = express();
const http = new httpLib.Server(app);
const io = socketLib(http);

const program = require('commander');
program.option('--port <port>', 'Port number');
program.parse(process.argv);

const port = program.port || process.env.PORT || 7770;
const discordSecret = program.discordSecret || process.env.DISCORD_SECRET || null;
const maxReplays = parseInt(process.env.MAX_REPLAYS) || 1000;
const cleanupIntervalMinutes = parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 60;
const replaysBasePath = rootDir + "/replays";
const mirrored = !!process.env.MIRRORED;

logger.info(`Settings: port=${port} maxReplays=${maxReplays} cleanupIntervalMinutes=${cleanupIntervalMinutes} mirrored=${mirrored} discordSecretProvided=${!!discordSecret}`);

api.init(port);
dbStorage.init();
discord.init(discordSecret);
gameStorage.initStorage(replaysBasePath);
if (mirrored) {
	setLocation(os.hostname(), process.env.UPSTREAM_SUFFIX || `:${port}`);
}

app.use(express.json());
app.use(authMiddleware);

attachToSocket(io);

app.get('/ping', (req, res) => res.send("OK"));

app.use('/static/rpg-awesome', express.static('./node_modules/rpg-awesome'));
app.use('/static', express.static('./static'));
app.use('/dist', express.static('./dist'));
app.use('/logs', express.static('./logs'));

app.get('/api/acolytefight.d.ts', (req, res) => res.sendFile(rootDir + '/src/typings/acolytefight.d.ts'));
app.get('/api/createTestUser', (req, res) => api.onCreateTestUser(req, res));
app.get('/api/default.acolytefight.json', (req, res) => api.onDefaultSettings(req, res));
app.get('/api/gameStats', (req, res) => api.onGetGameStats(req, res));
app.get('/api/leaderboard', (req, res) => api.onGetLeaderboard(req, res));
app.get('/api/logout', (req, res) => api.onLogout(req, res));
app.get('/api/profile', (req, res) => api.onGetProfile(req, res));
app.get('/api/status', (req, res) => api.onInternalStatus(req, res));
app.get('/api/settings', (req, res) => api.onGetUserSettings(req, res));
app.post('/api/settings', (req, res) => api.onUpdateUserSettings(req, res));
app.get('/login', (req, res) => api.onLogin(req, res));
app.get('/status', (req, res) => api.onExternalStatus(req, res));
app.get('/favicon.ico', (req, res) => res.sendFile(rootDir + '/favicon.ico'));
app.get('/manifest.webmanifest', (req, res) => res.sendFile(rootDir + '/manifest.webmanifest'));


app.get('/:page?', (req, res) => res.sendFile(rootDir + '/index.html'));

setInterval(() => {
	serverStore.cleanupOldRooms(1);
}, cleanupIntervalMinutes * 60 * 1000);

setInterval(() => {
	const status = api.getInternalStatus();
	if (status.numPlayers > 0) {
		logger.info(`Current status: ${(status.serverLoad * 100).toFixed(1)}% load, ${status.numGames} games, ${status.numPlayers} players`);
	}
}, 60 * 1000);

http.on('close', () => {
	logger.info("HTTP server closed, shutting down");
	process.exit();
});

process.on('SIGTERM', () => {
	logger.info("Received shutdown command");
	http.close();
});

http.listen(port, function() {
	logger.info("Started listening on port " + port);
});