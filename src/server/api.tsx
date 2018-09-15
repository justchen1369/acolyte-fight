import _ from 'lodash';
import moment from 'moment';
import express from 'express';

import * as g from './server.model';
import * as m from '../game/messages.model';
import * as games from './games';
import * as loadMetrics from './loadMetrics';

import { getAuthToken } from './auth';
import { getLocation } from './mirroring';
import { getStore } from './serverStore';
import { logger } from './logging';
import { DefaultSettings } from '../game/settings';

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
        numPlayers: games.calculateRoomStats(games.publicCategory()),
    };
    return status;
}