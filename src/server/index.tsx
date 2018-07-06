import httpLib from 'http';
import socketLib from 'socket.io';
import express from 'express';
import { authMiddleware } from './auth';
import { attachToSocket } from './connector';
import { attachApi } from './api';
import { getStore } from './serverStore';
import { getLoadAverage } from './loadMetrics';
import { logger } from './logging';
import { cleanupOldInactiveGames } from './serverStore';

const app = express();
const http = new httpLib.Server(app);
const io = socketLib(http);

const program = require('commander');
program.option('--port <port>', 'Port number');
program.parse(process.argv);

const port = program.port || process.env.PORT || 7770;
const cleanupHours = 24;

app.use(express.json());
app.use(authMiddleware);

attachToSocket(io);
attachApi(app);
app.use(express.static('./'));

http.listen(port, function() {
	logger.info("Started listening on port " + port);
});

setInterval(() => cleanupOldInactiveGames(cleanupHours), 60 * 60 * 1000);

setInterval(() => {
	if (getStore().activeGames.size > 0) {
		logger.info(`Current load: ${(getLoadAverage() * 100).toFixed(1)}%`);
	}
}, 60 * 1000);

process.on('SIGTERM', function () {
  process.exit(0);
});