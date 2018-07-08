import express from 'express';
import { getStore } from './serverStore';
import { logger } from './logging';
import * as m from '../game/messages.model';

export function setLocation(region: string, hostname: string) {
    const store = getStore();
    if (region && hostname) {
        store.region = region;
        store.server = sanitizeHostname(hostname);

        logger.info(`Location: region=${store.region} server=${store.server}`);
    }
}

export function onLocation(req: express.Request, res: express.Response) {
    const store = getStore();
    let locationMsg: m.LocationMsg = {
        currentRegion: store.region,
        targetRegion: req.params["region"] || store.region,
        currentServer: store.server,
        targetServer: req.query["server"] || store.server,
    };
    res.send(locationMsg);
}

function sanitizeHostname(hostname: string): string {
    let server = hostname;
	if (server.indexOf('.') !== -1) {
		// Don't use the FQDN, assume that all other servers have the same suffix and can find each other easily
		server = server.substring(0, server.indexOf('.'));
    }

    server = server.replace(/[^A-Za-z0-9_-]/g, '');

    return server;
}