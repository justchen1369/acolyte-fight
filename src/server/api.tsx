import moment from 'moment';
import express from 'express';
import * as g from './server.model';
import * as m from '../game/messages.model';
import { getStore } from './games';

export function attachApi(app: express.Application) {
    app.get('/games', onGamesList);
}

function onGamesList(req: express.Request, res: express.Response) {
    let gameMsgs = new Array<m.GameMsg>();
    getStore().activeGames.forEach(game => {
        gameMsgs.push(gameToMsg(game));
    });
    getStore().inactiveGames.forEach(game => {
        gameMsgs.push(gameToMsg(game));
    });
    gameMsgs = gameMsgs.filter(msg => !msg.joinable);

    const result: m.GameListMsg = {
        games: gameMsgs,
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