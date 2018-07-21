import _ from 'lodash';
import moment from 'moment';
import express from 'express';

import * as g from './server.model';
import * as m from '../game/messages.model';
import * as games from './games';

import { getAuthToken } from './auth';
import { getLocation } from './mirroring';
import { getStore } from './serverStore';
import { logger } from './logging';
import { Settings } from '../game/settings';

export function onGamesList(req: express.Request, res: express.Response) {
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

export function onLocation(req: express.Request, res: express.Response) {
    const location = getLocation();
    let locationMsg: m.LocationMsg = {
        currentServer: location.server,
        targetServer: req.query["server"] || location.server,
    };
    res.send(locationMsg);
}

export function onCreateRoom(req: express.Request, res: express.Response) {
    const authToken = getAuthToken(req);

    const input = req.body as m.CreateRoomRequest;
    if (input && input.mod && typeof input.mod === "object") {
        const room = games.initRoom(input.mod);
        const result: m.CreateRoomResponse = {
            roomId: room.id,
            server: getLocation().server,
        };
        logger.info(`Room ${room.id} created by user ${authToken} with mod ${JSON.stringify(input.mod).substr(0, 1000)}`);
        res.send(result);
    } else {
        res.sendStatus(400).send("Bad request");
    }
}

export function onDefaultSettings(req: express.Request, res: express.Response) {
    res.header("Content-Type", "application/json");
    res.send(JSON.stringify(Settings));
}

function gameToMsg(game: g.Game): m.GameMsg {
    return {
        id: game.id,
        createdTimestamp: moment(game.created).format("YYYY-MM-DD HH:mm:ss"),
        playerNames: game.playerNames,
        numActivePlayers: game.active.size,
        joinable: game.joinable,
        numTicks: game.history.length,
        roomId: game.room,
        server: getLocation().server,
    };
}