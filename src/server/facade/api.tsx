import _ from 'lodash';
import fetch from 'node-fetch';
import moment from 'moment';
import msgpack from 'msgpack-lite';
import express from 'express';
import url from 'url';
import wu from 'wu';
import * as http from 'http';

import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as auth from '../auth/auth';
import * as categories from '../../shared/segments';
import * as constants from '../../game/constants';
import * as discord from '../auth/discord';
import * as facebook from '../auth/facebook';
import * as games from '../core/games';
import * as gameStorage from '../storage/gameStorage';
import * as kongregate from '../auth/kongregate';
import * as leaderboards from '../core/leaderboards';
import * as loadMetrics from '../status/loadMetrics';
import * as mirroring from '../core/mirroring';
import * as percentiles from '../core/percentiles';
import * as ratings from '../core/ratings';
import * as sanitize from '../../shared/sanitize';
import * as statsStorage from '../storage/statsStorage';
import * as userStorage from '../storage/userStorage';
import * as winRates from '../core/winRates';

import { getAuthToken } from '../auth/auth';
import { getLocation } from '../core/mirroring';
import { getStore } from '../serverStore';
import { logger } from '../status/logging';
import { required, optional } from '../utils/schema';
import { DefaultSettings } from '../../game/settings';

let port: number = null;

export function init(_port: number) {
    port = _port;
}

export function onDefaultSettings(req: express.Request, res: express.Response) {
    try {
        res.header("Content-Type", "application/json");
        res.send(JSON.stringify(DefaultSettings));
	} catch (exception) {
        handleError(exception, res);
	}
}

export function onInternalStatus(req: express.Request, res: express.Response) {
    try {
        res.send(getInternalStatus());
	} catch (exception) {
        handleError(exception, res);
	}
}

export function getInternalStatus() {
    const store = getStore();
    const location = getLocation();
	const status: m.InternalStatus = {
        region: location.region,
        host: location.server,
        numUsers: percentiles.estimateNumUsers(),
        numGames: store.activeGames.size,
        numPlayers: wu(store.scoreboards.values()).map(scoreboard => scoreboard.online.size).reduce((a, b) => a + b, 0),
        numConnections: store.numConnections,
        serverLoad: loadMetrics.getLoadAverage(),
    };
    return status;
}

export function onExternalStatus(req: express.Request, res: express.Response) {
    try {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.send(getExternalStatus());
	} catch (exception) {
        handleError(exception, res);
	}
}

export function handlePreflightRequest(req: express.Request, res: express.Response) {
    try {
        const allowHeaders = [m.AuthHeader];
        const requestedHeaders = req.headers["access-control-request-headers"];
        if (typeof requestedHeaders === "string") {
            allowHeaders.push(...requestedHeaders.split(",").map(x => x.trim()));
        }

        var headers: http.OutgoingHttpHeaders = {
            'Access-Control-Allow-Headers': allowHeaders,
            'Access-Control-Allow-Origin': req.headers.origin || "*",
            'Access-Control-Allow-Credentials': 'true',
        };
        res.writeHead(200, headers);
        res.end();
	} catch (exception) {
        handleError(exception, res);
	}
}

export function getExternalStatus() {
    const location = getLocation();
	const status: m.ExternalStatus = {
        region: location.region,
        host: location.server,
        numPlayers: games.calculateRoomStats(categories.publicSegment()),
    };
    return status;
}

export function onFacebookLogin(req: express.Request, res: express.Response) {
    onFacebookLoginAsync(req, res).catch(error => handleError(error, res));
}

async function onFacebookLoginAsync(req: express.Request, res: express.Response): Promise<void> {
    const input = req.body as m.FacebookLoginRequest;
    if (!(required(input, "object")
        && required(input.signature, "string"))) {
        res.status(400).send("Bad request");
        return;
    }

    const facebookId = facebook.verifyPlayerId(input.signature);
    if (!facebookId) {
        res.status(403).send("Forbidden");
        return;
    }

    const response: m.FacebookLoginResponse = {
        authToken: facebook.authToken(facebookId),
    };
    res.send(response);
}

export function onKongregateLogin(req: express.Request, res: express.Response) {
    onKongregateLoginAsync(req, res).catch(error => handleError(error, res));
}

async function onKongregateLoginAsync(req: express.Request, res: express.Response): Promise<void> {
    const input = req.body as m.KongregateLoginRequest;
    if (!(required(input, "object")
        && required(input.signature, "string")
        && required(input.kongregateId, "number")
    )) {
        res.status(400).send("Bad request");
        return;
    }

    const name = await kongregate.getPlayerName(input.kongregateId, input.signature);
    if (!name) {
        res.status(403).send("Forbidden");
        return;
    }

    const response: m.KongregateLoginResponse = {
        authToken: kongregate.authToken(input.kongregateId),
        name,
    };
    res.send(response);
}

export function onDiscordLogin(req: express.Request, res: express.Response) {
    onDiscordLoginAsync(req, res).catch(error => handleError(error, res));
}

async function onDiscordLoginAsync(req: express.Request, res: express.Response): Promise<void> {
    const authToken = auth.resendAuthToken(req, res);
    const origin = getOrigin(req);
    if (req.query.code && authToken) {
        const code = req.query.code;
        const discordUser = await discord.authenticateWithCode(origin, code);
        if (!discordUser) {
            throw "Unable to find Discord user";
        }

        await auth.loginAsUser({
            accessKey: auth.discordAccessKey(discordUser),
            username: discordUser.username,
        }, auth.enigmaAccessKey(authToken));
        res.redirect('/');
    } else {
        res.redirect(discord.getAuthUrl(origin));
    }
}

export function onCreateTestUser(req: express.Request, res: express.Response) {
    onCreateTestUserAsync(req, res).catch(error => handleError(error, res));
}

async function onCreateTestUserAsync(req: express.Request, res: express.Response): Promise<void> {
    if (!(req.query.a && req.query.a === auth.getEnigmaSecret())) {
        res.status(403).send("Forbidden");
        return;
    }

    const authToken = auth.resendAuthToken(req, res);

    const allowCache = false;
    let userId = await auth.getUserIdFromAccessKey(auth.enigmaAccessKey(authToken), allowCache)
    if (userId) {
        // Already logged in

    } else {
        // Create a new user
        logger.info(`Creating test user ${authToken}`);
        userId = userStorage.generateUserId();
        const userSettings: g.User = {
            userId,
            loggedIn: true,
            settings: {
                name: null,
                buttons: null,
                rebindings: null,
                options: null,
            },
        };
        await userStorage.createUser(userSettings, auth.enigmaAccessKey(authToken));
    }

    res.redirect('/');
}

export function onLogout(req: express.Request, res: express.Response) {
    onLogoutAsync(req, res).catch(error => handleError(error, res));
}

async function onLogoutAsync(req: express.Request, res: express.Response): Promise<void> {
    const authToken = getAuthToken(req);
    if (authToken && !isLinkedAuthToken(authToken)) {
        const accessKey = auth.enigmaAccessKey(authToken);
        await auth.disassociateAccessKey(accessKey);
    }
    res.send("OK");
}

export function onListGames(req: express.Request, res: express.Response) {
    onListGamesAsync(req, res).catch(error => handleError(error, res));
}

async function onListGamesAsync(req: express.Request, res: express.Response): Promise<void> {
    const input = req.body as m.GameListRequest;
    if (!(required(input, "object")
		&& required(input.ids, "object") && Array.isArray(input.ids) && input.ids.every(id => required(id, "string")))) {
        res.status(400).send("Bad request");
        return;
    }

	const store = getStore();
	const availableIds = input.ids.filter(id => store.activeGames.has(id) || gameStorage.hasGame(id));

    const response: m.GameListResponse = {
        success: true,
        ids: availableIds,
    };
    res.send(response);
}

export function onGetGame(req: express.Request, res: express.Response) {
    onGetGameAsync(req, res).catch(error => handleError(error, res));
}

export async function onGetGameAsync(req: express.Request, res: express.Response): Promise<void> {
    const gameId: string = req.params.gameId;
    if (!(
        required(gameId, "string")
    )) {
        res.status(400).send("Bad request");
        return;
    }

    const store = getStore();
    const replay = store.activeGames.get(gameId) || await gameStorage.loadGame(gameId);
    if (replay) {
        res.send(replay);
    } else {
        const game = await retrieveGameRemotely(gameId);
        if (game) {
            res.send(game);
        } else {
            res.status(404).send("Not found");
        }
    }
}

async function retrieveGameRemotely(gameId: string): Promise<m.Replay> {
    if (!mirroring.isMirrored()) {
        return null;
    }

    const game = await statsStorage.loadGame(gameId);
    if (!game) {
        return null;
    }

    const location = mirroring.getLocation();
    if (game.server === location.server) {
        // Already checked this server, it's me
        return null;
    }

    try {
        const fetchResponse = await fetch(mirroring.getUpstreamUrl(game.server) + `/api/games/${gameId}`);
        if (fetchResponse.status === 200) {
            const replay: m.Replay = await fetchResponse.json();
            return replay;
        } else if (fetchResponse.status === 404) {
            return null;
        } else {
            const error = await fetchResponse.text();
            logger.info(`Retrieve remote replay failed ${fetchResponse.status}: ${error}`);
            return null;
        }
    } catch (exception) {
        logger.info(`Exception retrieving remote replay: ${exception}`);
        return null;
    }
}


export function onGetGameStats(req: express.Request, res: express.Response) {
    onGetGameStatsAsync(req, res).catch(error => handleError(error, res));
}

export async function onGetGameStatsAsync(req: express.Request, res: express.Response): Promise<void> {
    const maxLimit = constants.MaxGamesToKeep;

    const after = req.query.after ? parseInt(req.query.after) : null;
    const before = req.query.before ? parseInt(req.query.before) : null;
    const limit = req.query.limit ? Math.min(maxLimit, parseInt(req.query.limit)) : maxLimit;

    const authToken = getAuthToken(req);
    const userId = req.query.p ? req.query.p : await auth.getUserIdFromAccessKey(auth.enigmaAccessKey(authToken));
    if (!userId) {
        res.status(403).send("Forbidden");
        return;
    }

    const allGameStats = await statsStorage.loadGamesForUser(userId, after, before, limit);
    const response: m.GetGameStatsResponse = {
        stats: allGameStats,
    };
    const buffer = msgpack.encode(response);
    res.send(buffer);
}

export function onGetRatingAtPercentile(req: express.Request, res: express.Response) {
    onGetRatingAtPercentileAsync(req, res).catch(error => handleError(error, res));
}

export async function onGetRatingAtPercentileAsync(req: express.Request, res: express.Response): Promise<void> {
    if (!(req.query.category && req.query.percentile)) {
        res.status(400).send("Bad request");
        return;
    }

    const rating = percentiles.estimateRatingAtPercentile(req.query.category, parseInt(req.query.percentile));
    const response: m.GetRatingAtPercentileResponse = { rating };
    res.send(response);
}

export function onGetLeagues(req: express.Request, res: express.Response) {
    onGetLeaguesAsync(req, res).catch(error => handleError(error, res));
}

export async function onGetLeaguesAsync(req: express.Request, res: express.Response): Promise<void> {
    const Placements = constants.Placements;
    if (!(required(req.params.category, "string"))) {
        res.status(400).send("Bad request");
        return;
    }

    await percentiles.ready.promise;

    const category = req.params.category;

    const leagues: m.League[] = [
        estimateLeague(category, "Grandmaster", Placements.Grandmaster),
        estimateLeague(category, "Master", Placements.Master),
        estimateLeague(category, "Diamond", Placements.Diamond),
        estimateLeague(category, "Platinum", Placements.Platinum),
        estimateLeague(category, "Gold", Placements.Gold),
        estimateLeague(category, "Silver", Placements.Silver),
        estimateLeague(category, "Bronze", Placements.Bronze),
        estimateLeague(category, "Wood", Placements.Wood),
    ];

    const response: m.GetLeaguesResponse = { leagues };
    res.send(response);
}

function estimateLeague(category: string, name: string, minPercentile: number): m.League {
    return {
        name,
        minPercentile,
        minRating: percentiles.estimateRatingAtPercentile(category, minPercentile),
    };
}

export function onGetProfile(req: express.Request, res: express.Response) {
    onGetProfileAsync(req, res).catch(error => handleError(error, res));
}

export async function onGetProfileAsync(req: express.Request, res: express.Response): Promise<void> {
    const userId = req.query.p;
    if (!userId) {
        res.status(400).send("Bad request");
        return;
    }

    const profile = await statsStorage.getProfile(userId);
    if (profile) {
        res.send(profile);
    } else {
        res.status(404).send("Not found");
    }
}

export function onGetUserSettings(req: express.Request, res: express.Response) {
    onGetUserSettingsAsync(req, res).catch(error => handleError(error, res));
}

function handleError(error: any, res: express.Response) {
    if (error instanceof Error && error.stack) {
        logger.error(`${error.name} - ${error.message}: ${error.stack}`);
    } else {
        logger.error(error);
    }
    res.status(500).send(`${error}`);
}

export async function onGetUserSettingsAsync(req: express.Request, res: express.Response): Promise<void> {
    const authToken = getAuthToken(req);
    const userHash = auth.getUserHashFromAuthToken(authToken);
    const user = await auth.getUserFromAccessKey(auth.enigmaAccessKey(authToken));
    if (user) {
        const result: m.GetUserSettingsResponse = {
            userHash,
            userId: user.userId,
            loggedIn: user.loggedIn,
            name: user.settings && user.settings.name,
            buttons: user.settings && user.settings.buttons,
            rebindings: user.settings && user.settings.rebindings,
            options: user.settings && user.settings.options,
        };

        res.header("Content-Type", "application/json");
        res.send(result);

        // Do this after the result has been sent as there is no need to wait for this
        await userStorage.touch(user.userId);
    } else if (required(req.query.create, "string") && sanitize.validName(req.query.create)) {
        // Create anonymous user
        const name: string = req.query.create;

        let loggedIn = false;
        if (isLinkedAuthToken(authToken)) {
            loggedIn = true;
        }

        logger.info(`Creating ${loggedIn ? "linked" : "anonymous"} user ${authToken}: ${name}`);
        const userId = userStorage.generateUserId();
        const userSettings: g.User = {
            userId,
            loggedIn,
            settings: {
                name,
                buttons: null,
                rebindings: null,
                options: null,
            },
        };
        await userStorage.createUser(userSettings, auth.enigmaAccessKey(authToken));

        const result: m.GetUserSettingsResponse = {
            userHash,
            userId: userId,
            loggedIn,
            name,
            buttons: null,
            rebindings: null,
            options: null,
        };

        res.header("Content-Type", "application/json");
        res.send(result);
    } else {
        const result: m.GetUserSettingsResponse = {
            userHash,
        };

        res.header("Content-Type", "application/json");
        res.send(result);
    }
}

export function onUpdateUserSettings(req: express.Request, res: express.Response) {
    onUpdateUserSettingsAsync(req, res).catch(error => handleError(error, res));
}

export async function onUpdateUserSettingsAsync(req: express.Request, res: express.Response): Promise<void> {
    const input = req.body as m.UpdateUserSettingsRequest;
    if (!(required(input, "object")
        && required(input.name, "string")
        && required(input.buttons, "object") && Object.keys(input.buttons).map(key => input.buttons[key]).every(x => required(x, "string"))
        && required(input.rebindings, "object") && Object.keys(input.rebindings).map(key => input.rebindings[key]).every(x => optional(x, "string"))
        && required(input.options, "object")
        && optional(input.options.wheelOnRight, "boolean")
    )) {
        res.status(400).send("Bad request");
        return;
    }

    const authToken = getAuthToken(req);
    const userId = await auth.getUserIdFromAccessKey(auth.enigmaAccessKey(authToken))
    if (userId) {
        const user: Partial<g.User> = {
            userId: userId,
            settings: {
                name: input.name,
                buttons: input.buttons,
                rebindings: input.rebindings,
                options: input.options,
            },
        };
        await userStorage.updateUser(user);

        const result: m.UpdateUserSettingsResponse = {};
        res.header("Content-Type", "application/json");
        res.send(result);
    } else {
        res.status(404).send("User not found");
    }
}

function getOrigin(req: express.Request): string {
    let origin = `${req.protocol}://${req.hostname}`;
    if (port !== 80) {
        origin += `:${port}`;
    }
    return origin;
}

export function onGetLeaderboard(req: express.Request, res: express.Response) {
    onGetLeaderboardAsync(req, res).catch(error => handleError(error, res));
}

export async function onGetLeaderboardAsync(req: express.Request, res: express.Response): Promise<void> {
    if (!(req.query.category)) {
        res.status(400).send("Bad request");
        return;
    }

    const category = req.query.category;

    const leaderboardBuffer = await leaderboards.getLeaderboard(category);
    res.send(leaderboardBuffer);
}

function isLinkedAuthToken(authToken: string) {
    return facebook.isFacebookAuthToken(authToken) || kongregate.isKongregateAuthToken(authToken);
}

export function onGetWinRateDistribution(req: express.Request, res: express.Response) {
    onGetWinRateDistributionAsync(req, res).catch(error => handleError(error, res));
}

export async function onGetWinRateDistributionAsync(req: express.Request, res: express.Response): Promise<void> {
    if (!(req.query.a && req.query.a === auth.getEnigmaSecret())) {
        res.status(403).send("Forbidden");
        return;
    }

    const distribution = await winRates.calculateWinRateDistribution(m.GameCategory.PvP);
    if (req.header('content-type') === "application/json") {
        res.send(distribution);
    } else {
        res.send(jsonToCsv(distribution));
    }
}

function jsonToCsv(array: any[]) {
    if (array.length === 0) {
        return "";
    }

    const rows = new Array<string>();

    const keys = Object.keys(array[0]);
    rows.push(keys.join(","));

    for (const obj of array) {
        rows.push(keys.map(k => `${obj[k]}`).join(","));
    }

    return rows.join("\n");
}

export function onReevaluateAco(req: express.Request, res: express.Response) {
    onReevaluateAcoAsync(req, res).catch(error => handleError(error, res));
}

export async function onReevaluateAcoAsync(req: express.Request, res: express.Response): Promise<void> {
    if (!(req.query.a && req.query.a === auth.getEnigmaSecret())) {
        res.status(403).send("Forbidden");
        return;
    }

    const numAffected = await ratings.reevaluteAco();
    res.send(`${numAffected} rows affected`);
}

export function onRecalculateDistributions(req: express.Request, res: express.Response) {
    onRecalculateDistributionsAsync(req, res).catch(error => handleError(error, res));
}

export async function onRecalculateDistributionsAsync(req: express.Request, res: express.Response): Promise<void> {
    if (!(req.query.a && req.query.a === auth.getEnigmaSecret())) {
        res.status(403).send("Forbidden");
        return;
    }

    await percentiles.refreshCumulativeFrequencies();
    res.send('OK');
}