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

const program = require('commander');
program.option('--port <port>', 'Port number');
program.option('--mirrored', 'Redirect to closest mirror, where mirrors are comma separated');
program.option('--cleanupHours <hours>', 'The number of hours to keep replays for');
program.parse(process.argv);

const isMirrored = !!program.mirrored || !!process.env.MIRRORED;
const port = program.port || process.env.PORT || 7770;
const cleanupHours = parseInt(program.cleanupHours) || parseInt(process.env.CLEANUP_HOURS) || 24;

logger.info(`Settings: port=${port} isMirrored=${isMirrored} cleanupHours=${cleanupHours}`);

app.use(express.json());
app.use(authMiddleware);

attachToSocket(io);
attachApi(app);

app.use('/static/rpg-awesome', express.static('./node_modules/rpg-awesome'));
app.use('/static', express.static('./static'));
app.use('/dist', express.static('./dist'));
app.use('/logs', express.static('./logs'));

app.get('/play', (req, res) => res.sendFile(rootDir + '/play.html'));
app.get('/settings', (req, res) => res.sendFile(rootDir + '/settings.html'));
app.get('/about', (req, res) => res.sendFile(rootDir + '/about.html'));

app.get('/', (req, res) => {
	if (isMirrored) {
		res.sendFile(rootDir + '/index.html');
	} else {
		res.redirect('play');
	}
});

setInterval(() => cleanupOldInactiveGames(cleanupHours), 60 * 60 * 1000);

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