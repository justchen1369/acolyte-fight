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

export function getInternalStatus(): m.InternalStatus {
    const store = getStore();
    const location = getLocation();
	return {
        region: location.region,
        host: location.server,
        numGames: store.activeGames.size,
        numPlayers: _.sum(_.values(store.playerCounts)),
        numConnections: store.numConnections,
        breakdown: store.playerCounts,
        serverLoad: loadMetrics.getLoadAverage(),
    };
}

export function getExternalStatus(): m.ExternalStatus {
    const store = getStore();
    const location = getLocation();
	return {
        region: location.region,
        host: location.server,
        numPlayers: games.calculateRoomStats(games.publicCategory()),
    };
}