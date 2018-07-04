import _ from 'lodash';
import moment from 'moment';
import express from 'express';
import * as g from './server.model';
import * as m from '../game/messages.model';
import { getAuthToken } from './auth';
import { getStore } from './serverStore';
import { getLoadAverage } from './loadMetrics';
import { logger } from './logging';

export function attachApi(app: express.Application) {
    app.get('/games', onGamesList);
    app.get('/status', onStatus);
}

function onGamesList(req: express.Request, res: express.Response) {
    const authToken = getAuthToken(req);
    logger.info("Retrieving games list for user " + authToken);

    let gameMsgs = new Array<m.GameMsg>();
    getStore().activeGames.forEach(game => {
        if (!game.joinable && game.accessTokens.has(authToken)) {
            gameMsgs.push(gameToMsg(game));
        }
    });
    getStore().inactiveGames.forEach(game => {
        if (!game.joinable && game.accessTokens.has(authToken)) {
            gameMsgs.push(gameToMsg(game));
        }
    });

    const result: m.GameListMsg = {
        games: gameMsgs,
    };
    res.send(result);
}

function onStatus(req: express.Request, res: express.Response) {
    const result: m.ServerStatusMsg = {
        serverLoad: getLoadAverage(),
    };
    res.send(result);
}

function gameToMsg(game: g.Game): m.GameMsg {
    return {
        id: game.id,
        createdTimestamp: moment(game.created).format("YYYY-MM-DD HH:mm:ss"),
        playerNames: game.playerNames,
        numActivePlayers: game.active.size,
        joinable: game.joinable,
        numTicks: game.history.length,
    };
}