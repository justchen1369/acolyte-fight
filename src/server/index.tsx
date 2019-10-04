import cors from 'cors';
import fs from 'fs';
import path from 'path';
import httpLib from 'http';
import httpsLib from 'https';
import msgpackParser from 'socket.io-msgpack-parser';
import socketLib from 'socket.io';
import express from 'express';
import compression from 'compression';
import * as os from 'os';
import * as m from '../shared/messages.model';
import * as api from './facade/api';
import * as auth from './auth/auth';
import { authMiddleware } from './auth/auth';
import { attachToSocket } from './facade/emitter';
import { setLocation } from './core/mirroring';
import { logger } from './status/logging';
import * as decaying from './ratings/decaying';
import * as deflating from './ratings/deflating';
import * as dbStorage from './storage/dbStorage';
import * as discord from './auth/discord';
import * as emitter from './facade/emitter';
import * as facebook from './auth/facebook';
import * as kongregate from './auth/kongregate';
import * as gameStorage from './storage/gameStorage';
import * as matchmaking from './core/matchmaking';
import * as modder from './core/modder';
import * as online from './core/online';
import * as percentiles from './ratings/percentiles';
import * as serverStore from './serverStore';
import * as statsStorage from './storage/statsStorage';
import * as ticker from './core/ticker';
import * as winRates from './ratings/winRates';

const rootDir = path.resolve('.');

const program = require('commander');
program.option('--port <port>', 'Port number');
program.parse(process.argv);

const port = program.port || process.env.PORT || 7770;
const enigmaSecret = process.env.ENIGMA_SECRET || null;
const discordSecret = process.env.DISCORD_SECRET || null;
const facebookSecret = process.env.FACEBOOK_SECRET || null;
const kongregateSecret = process.env.KONGREGATE_SECRET || null;
const httpsKeyPath = process.env.HTTPS_KEY || null;
const httpsCertPath = process.env.HTTPS_CERT || null;
const maxReplays = parseInt(process.env.MAX_REPLAYS) || 1000;
const cleanupIntervalMinutes = parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 60;
const replaysBasePath = rootDir + "/replays";
const mirrored = !!process.env.MIRRORED;

logger.info(`Settings: port=${port} maxReplays=${maxReplays} cleanupIntervalMinutes=${cleanupIntervalMinutes} mirrored=${mirrored} discordSecretProvided=${!!discordSecret} facebookSecretProvided=${!!facebookSecret} kongregateSecretProvided=${!!kongregateSecret} enigmaSecretProvided=${!!enigmaSecret} httpsKeyPath=${httpsKeyPath} httpsCertPath=${httpsCertPath}`);

api.init(port);
auth.init(enigmaSecret);
dbStorage.init();
discord.init(discordSecret);
facebook.init(facebookSecret);
kongregate.init(kongregateSecret);
gameStorage.initStorage(replaysBasePath);
modder.init();
percentiles.init();
ticker.init();
if (mirrored) {
	setLocation(os.hostname(), process.env.UPSTREAM_SUFFIX || `:${port}`);
}


const app = express();
app.use(cors());
app.options('*', cors());
app.use(compression());

const http = createServer(app, httpsKeyPath, httpsCertPath);
const io = socketLib(http, {
	wsEngine: "uws",
	handlePreflightRequest: api.handlePreflightRequest,
	parser: msgpackParser,
	origins: '*:*',
	pingTimeout: 30000,
} as any); // needs to be as any because handlePreflightRequest not documented

app.use(express.json());
app.use(authMiddleware);

attachToSocket(io);

app.get('/ping', (req, res) => res.send("OK"));

app.use('/cdn', express.static('./cdn', { maxAge: '1y', immutable: true }));
app.use('/icons', express.static('./icons', { maxAge: '1h' }));
app.use('/static', express.static('./static'));
app.use('/dist', express.static('./dist'));
app.use('/logs', express.static('./logs'));

app.get('/api/acolytefight.d.ts', (req, res) => res.sendFile(rootDir + '/src/typings/acolytefight.d.ts'));
app.get('/api/ai.contracts.ts', (req, res) => res.sendFile(rootDir + '/src/client/ai/ai.contracts.ts'));
app.get('/api/createTestUser', (req, res) => api.onCreateTestUser(req, res));
app.get('/api/default.acolytefight.json', (req, res) => api.onDefaultSettings(req, res));
app.post('/api/facebook', (req, res) => api.onFacebookLogin(req, res));
app.post('/api/games', (req, res) => api.onListGames(req, res));
app.get('/api/games/:gameId', (req, res) => api.onGetGame(req, res));
app.get('/api/gameStats', (req, res) => api.onGetGameStats(req, res));
app.post('/api/kongregate', (req, res) => api.onKongregateLogin(req, res));
app.get('/api/leaderboard', (req, res) => api.onGetLeaderboard(req, res));
app.get('/api/leagues/:category', (req, res) => api.onGetLeagues(req, res));
app.get('/api/logout', (req, res) => api.onLogout(req, res));
app.get('/api/profile', (req, res) => api.onGetProfile(req, res));
app.get('/api/ratingAtPercentile', (req, res) => api.onGetRatingAtPercentile(req, res));
app.post('/api/ratings/recalculatePercentiles', (req, res) => api.onRecalculateDistributions(req, res));
app.post('/api/ratings/reevaluate', (req, res) => api.onReevaluateAco(req, res));
app.get('/api/status', (req, res) => api.onInternalStatus(req, res));
app.get('/api/settings', (req, res) => api.onGetUserSettings(req, res));
app.post('/api/settings', (req, res) => api.onUpdateUserSettings(req, res));
app.get('/api/winRateDistribution', (req, res) => api.onGetWinRateDistribution(req, res));
app.get('/login', (req, res) => api.onDiscordLogin(req, res));
app.get('/status', (req, res) => api.onExternalStatus(req, res));
app.get('/favicon.ico', (req, res) => res.sendFile(rootDir + '/favicon.ico'));
app.get('/manifest.webmanifest', (req, res) => res.sendFile(rootDir + '/manifest.webmanifest'));


app.get('/audioWorker.html', (req, res) => res.sendFile(rootDir + '/audioWorker.html'));
app.get('/:page?', (req, res) => res.sendFile(rootDir + '/index.html'));

online.init().catch(logger.error);

setInterval(() => {
	winRates.updateWinRateDistribution(m.GameCategory.PvP).catch(logger.error);
}, 24 * 60 * 60 * 1000); // slow-changing data
winRates.updateWinRateDistribution(m.GameCategory.PvP).catch(logger.error);

setInterval(async () => {
	try {
		modder.cleanupOldRooms(1);
		await statsStorage.cleanupGames(7);
		await decaying.decrementAco();
		await deflating.deflateAcoIfNecessary(m.GameCategory.PvP);
	} catch (exception) {
		logger.error(exception);
	}
}, cleanupIntervalMinutes * 60 * 1000);
deflating.deflateAcoIfNecessary(m.GameCategory.PvP).catch(logger.error);
decaying.decrementAco().catch(logger.error);

setInterval(async () => {
	try {
		const status = api.getInternalStatus();
		if (status.numPlayers > 0) {
			logger.info(`Current status: ${(status.serverLoad * 100).toFixed(1)}% load, ${status.numGames} games, ${status.numPlayers} players`);
		}

		online.cleanupScoreboards();
	} catch (exception) {
		logger.error(exception);
	}
}, 60 * 1000);

http.on('close', () => {
	logger.info("HTTP server closed, shutting down");
	process.exit();
});

process.on('SIGINT', () => {
	logger.info("Received SIGINT");
	emitter.shutdown();
	http.close();
});

process.on('SIGTERM', () => {
	logger.info("Received SIGTERM");
	emitter.shutdown();
	http.close();
});

http.listen(port, function() {
	logger.info("Started listening on port " + port);
});

function createServer(app: express.Express, httpsKeyPath: string, httpsCertPath: string): httpLib.Server | httpsLib.Server {
	if (httpsKeyPath && httpsCertPath) {
		const privateKey  = fs.readFileSync(httpsKeyPath, 'utf8');
		const certificate = fs.readFileSync(httpsCertPath, 'utf8');
		const credentials = {key: privateKey, cert: certificate};
		const https = httpsLib.createServer(credentials, app);
		return https;
	} else {
		return httpLib.createServer(app);
	}
}