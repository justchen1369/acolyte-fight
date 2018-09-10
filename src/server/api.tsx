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
import { DefaultSettings } from '../game/settings';

export function onLocation(req: express.Request, res: express.Response) {
    const location = getLocation();
    let locationMsg: m.LocationMsg = {
        currentServer: location.server,
        targetServer: req.query["server"] || location.server,
    };
    res.send(locationMsg);
}

export function onDefaultSettings(req: express.Request, res: express.Response) {
    res.header("Content-Type", "application/json");
    res.send(JSON.stringify(DefaultSettings));
}