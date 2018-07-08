import express from 'express';
import { logger } from './logging';
import * as g from './server.model';
import * as m from '../game/messages.model';

let location: g.LocationStore = {
    region: null,
    server: null,
    fqdnSuffix: "",
};

export function getLocation() {
    return location;
}

export function setLocation(region: string, hostname: string, fqdnSuffix: string) {
    if (region && hostname && fqdnSuffix) {
        location.region = region;
        location.server = sanitizeHostname(hostname);
        location.fqdnSuffix = fqdnSuffix;

        logger.info(`Location: region=${location.region} server=${location.server} fqdnSuffix=${location.fqdnSuffix}`);
    }
}

export function onLocation(req: express.Request, res: express.Response) {
    let locationMsg: m.LocationMsg = {
        currentRegion: location.region,
        targetRegion: req.params["region"] || location.region,
        currentServer: location.server,
        targetServer: req.query["server"] || location.server,
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