import _ from 'lodash';
import moment from 'moment';
import express from 'express';
import url from 'url';

import * as g from './server.model';
import * as m from '../game/messages.model';
import * as auth from './auth';
import * as categories from './categories';
import * as discord from './discord';
import * as games from './games';
import * as loadMetrics from './loadMetrics';
import * as percentiles from './percentiles';
import * as sanitize from '../game/sanitize';
import * as statsStorage from './statsStorage';
import * as userStorage from './userStorage';

import { getAuthToken } from './auth';
import { getLocation } from './mirroring';
import { getStore } from './serverStore';
import { logger } from './logging';
import { required, optional } from './schema';
import { DefaultSettings } from '../game/settings';

let port: number = null;

export function init(_port: number) {
    port = _port;
}

export function onDefaultSettings(req: express.Request, res: express.Response) {
    res.header("Content-Type", "application/json");
    res.send(JSON.stringify(DefaultSettings));
}

export function onInternalStatus(req: express.Request, res: express.Response) {
    res.send(getInternalStatus());
}

export function getInternalStatus() {
    const store = getStore();
    const location = getLocation();
	const status: m.InternalStatus = {
        region: location.region,
        host: location.server,
        numUsers: percentiles.estimateNumUsers(m.GameCategory.PvP),
        numGames: store.activeGames.size,
        numPlayers: _.sum(_.values(store.playerCounts)),
        numConnections: store.numConnections,
        breakdown: store.playerCounts,
        serverLoad: loadMetrics.getLoadAverage(),
    };
    return status;
}

export function onExternalStatus(req: express.Request, res: express.Response) {
	res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.send(getExternalStatus());
}

export function getExternalStatus() {
    const location = getLocation();
	const status: m.ExternalStatus = {
        region: location.region,
        host: location.server,
        numPlayers: games.calculateRoomStats(categories.publicCategory()),
    };
    return status;
}

export function onLogin(req: express.Request, res: express.Response) {
    onLoginAsync(req, res).catch(error => handleError(error, res));
}

async function onLoginAsync(req: express.Request, res: express.Response): Promise<void> {
    const authToken = auth.resendAuthToken(req, res);
    const origin = getOrigin(req);
    if (req.query.code && authToken) {
        const code = req.query.code;
        const discordUser = await discord.authenticateWithCode(origin, code);
        if (!discordUser) {
            throw "Unable to find Discord user";
        }

        const allowCache = false;
        let userId = await auth.getUserIdFromAccessKey(auth.discordAccessKey(discordUser), allowCache)
        if (userId) {
            // Associate this browser with the existing user
            logger.info(`Discord user ${discordUser.id} - ${discordUser.username} - logged in`);
            await auth.associateAccessKey(auth.enigmaAccessKey(authToken), userId);

        } else {
            const name = sanitize.sanitizeName(discordUser.username);

            const existingUser = await auth.getUserFromAccessKey(auth.enigmaAccessKey(authToken));
            if (existingUser && !existingUser.loggedIn) {
                // Upgrade an existing anonymous user
                logger.info(`Discord user ${discordUser.id} - ${discordUser.username} - upgrading existing anonymous user`);

                userId = existingUser.userId;

                await userStorage.upgradeUser(userId, name, auth.discordAccessKey(discordUser));
            } else {
                // Create a new user
                logger.info(`Discord user ${discordUser.id} - ${discordUser.username} - creating new user`);

                userId = userStorage.generateUserId();
                const userSettings: g.User = {
                    userId,
                    loggedIn: true,
                    settings: {
                        name,
                        buttons: null,
                        rebindings: null,
                        options: null,
                    },
                };

                await userStorage.createUser(userSettings, auth.discordAccessKey(discordUser), auth.enigmaAccessKey(authToken));
            }
        }

        res.redirect('/');
    } else {
        res.redirect(discord.getAuthUrl(origin));
    }
}

export function onCreateTestUser(req: express.Request, res: express.Response) {
    onCreateTestUserAsync(req, res).catch(error => handleError(error, res));
}

async function onCreateTestUserAsync(req: express.Request, res: express.Response): Promise<void> {
    if (!(req.query.a && req.query.a === "secret123")) {
        res.status(403).send("Forbidden");
        return;
    }

    const authToken = auth.resendAuthToken(req, res);
    const origin = getOrigin(req);

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
;
}

async function onLogoutAsync(req: express.Request, res: express.Response): Promise<void> {
    const authToken = getAuthToken(req);
    if (authToken) {
        const accessKey = auth.enigmaAccessKey(authToken);
        await auth.disassociateAccessKey(accessKey);
    }
    res.send("OK");
}

export function onGetGameStats(req: express.Request, res: express.Response) {
    onGetGameStatsAsync(req, res).catch(error => handleError(error, res));
}

export async function onGetGameStatsAsync(req: express.Request, res: express.Response): Promise<void> {
    const maxLimit = 10;

    const after = req.query.after ? parseInt(req.query.after) : null;
    const before = req.query.before ? parseInt(req.query.before) : null;
    const limit = req.query.limit ? Math.min(maxLimit, parseInt(req.query.limit)) : maxLimit;

    const authToken = getAuthToken(req);
    const userId = await auth.getUserIdFromAccessKey(auth.enigmaAccessKey(authToken));
    if (!userId) {
        res.status(403).send("Forbidden");
        return;
    }

    const allGameStats = await statsStorage.loadGamesForUser(userId, after, before, limit);
    const response: m.GetGameStatsResponse = {
        stats: allGameStats,
    };
    res.send(response);
}

export function onGetDistributions(req: express.Request, res: express.Response) {
    onGetDistributionsAsync(req, res).catch(error => handleError(error, res));
}

export async function onGetDistributionsAsync(req: express.Request, res: express.Response): Promise<void> {
    const distributions = await percentiles.estimateDistributions();
    if (distributions) {
        res.send(distributions);
    } else {
        res.status(404).send("Not found");
    }
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
    res.status(500).send("Internal server error");
}

export async function onGetUserSettingsAsync(req: express.Request, res: express.Response): Promise<void> {
    const authToken = getAuthToken(req);
    const user = await auth.getUserFromAccessKey(auth.enigmaAccessKey(authToken));
    if (user) {
        const result: m.GetUserSettingsResponse = {
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
    } else if (req.query.create) {
        // Create anonymous user
        logger.info(`Creating anonymous user ${authToken}`);
        const userId = userStorage.generateUserId();
        const userSettings: g.User = {
            userId,
            loggedIn: false,
            settings: {
                name: null,
                buttons: null,
                rebindings: null,
                options: null,
            },
        };
        await userStorage.createUser(userSettings, auth.enigmaAccessKey(authToken));

        const result: m.GetUserSettingsResponse = {
            userId: userId,
            loggedIn: false,
            name: null,
            buttons: null,
            rebindings: null,
            options: null,
        };

        res.header("Content-Type", "application/json");
        res.send(result);
    } else {
        res.status(404).send("User not found");
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
    if (!(req.query.category && req.query.limit)) {
        res.status(400).send("Bad request");
        return;
    }

    const category = req.query.category;
    const limit = parseInt(req.query.limit);

    const leaderboard = _.take(await statsStorage.getLeaderboard(category), limit);
    const response: m.GetLeaderboardResponse = {
        leaderboard,
    };
    res.send(response);
}