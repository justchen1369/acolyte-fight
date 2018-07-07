import path from 'path';
import httpLib from 'http';
import socketLib from 'socket.io';
import express from 'express';
import { authMiddleware } from './auth';
import { attachToSocket } from './connector';
import { attachApi } from './api';
import { getServerStats } from './loadMetrics';
import { logger } from './logging';
import { cleanupOldInactiveGames } from './serverStore';

const rootDir = path.resolve('.');

const app = express();
const http = new httpLib.Server(app);
const io = socketLib(http);

const port = process.env.PORT || 7770;
const maxReplays = parseInt(process.env.MAX_REPLAYS) || 1000;
const cleanupIntervalMinutes = parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 60;

logger.info(`Settings: port=${port} maxReplays=${maxReplays} cleanupIntervalMinutes=${cleanupIntervalMinutes}`);

app.use(express.json());
app.use(authMiddleware);

attachToSocket(io);
attachApi(app);

app.get('/:region?/ping', (req, res) => res.send("OK"));

app.use('/:region?/static/rpg-awesome', express.static('./node_modules/rpg-awesome'));
app.use('/:region?/static', express.static('./static'));
app.use('/:region?/dist', express.static('./dist'));
app.use('/:region?/logs', express.static('./logs'));

app.get('/:region?/play', (req, res) => res.sendFile(rootDir + '/play.html'));
app.get('/:region?/settings', (req, res) => res.sendFile(rootDir + '/settings.html'));
app.get('/:region?/about', (req, res) => res.sendFile(rootDir + '/about.html'));

app.get('/', (req, res) => res.redirect('/play'));

setInterval(() => cleanupOldInactiveGames(maxReplays), cleanupIntervalMinutes * 60 * 1000);

setInterval(() => {
	const stats = getServerStats();
	if (stats.numGames > 0) {
		logger.info(`Current status: ${(stats.serverLoad * 100).toFixed(1)}% load, ${stats.numGames} games, ${stats.numPlayers} players`);
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