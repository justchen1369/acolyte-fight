import express from 'express';
import { logger } from './logging';
import * as g from './server.model';
import * as m from '../game/messages.model';

let location: g.LocationStore = {
    server: null,
    upstreamSuffix: "",
};

export function getLocation() {
    return location;
}

export function setLocation(hostname: string, upstreamSuffix: string) {
    location.server = sanitizeHostname(hostname);
    location.upstreamSuffix = upstreamSuffix;

    logger.info(`Location: server=${location.server} fqdnSuffix=${location.upstreamSuffix}`);
}

export function sanitizeHostname(hostname: string): string {
    let server = hostname;
	if (server.indexOf('.') !== -1) {
		// Don't use the FQDN, assume that all other servers have the same suffix and can find each other easily
		server = server.substring(0, server.indexOf('.'));
    }

    server = server.replace(/[^A-Za-z0-9_-]/g, '');

    return server;
}