import cookie from 'cookie';
import crypto from 'crypto';
import express from 'express';
import * as uuid from 'uuid';

import * as dbStorage from './dbStorage';
import * as discord from './discord';
import * as g from './server.model';
import * as m from '../game/messages.model';

export const AuthHeader = "x-enigma-auth";

const accessKeyToUserIdCache = new Map<string, string>();

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    let authToken = parseAuthTokenFromRequest(req);
    if (!authToken) {
        authToken = uuid.v4();
        res.cookie(m.AuthCookieName, authToken, {
            maxAge: 20 * 365 * 24 * 60 * 60 * 1000,
            domain: `.${req.hostname}`,
            httpOnly: true,
        });
    }
    (req as any).enigmaAuthToken = authToken;
    next();
}

export function getAuthToken(req: express.Request) {
    return (req as any).enigmaAuthToken;
}

export function getAuthTokenFromSocket(socket: SocketIO.Socket) {
    if (socket && socket.request) {
        return parseAuthTokenFromRequest(socket.request);
    } else {
        return null;
    }
}

function parseAuthTokenFromRequest(req: express.Request): string | null {
    if (!(req && req.headers)) {
        return null;
    } 

    let headerValue = req.headers[AuthHeader];
    if (headerValue && typeof headerValue === "string") {
        return headerValue
    } 

    if (req.headers.cookie && typeof req.headers.cookie === "string") {
        const cookies = cookie.parse(req.headers.cookie);
        return cookies && cookies[m.AuthCookieName];
    }

    return null;
}

export function getUserHashFromAuthToken(authToken: string | null): string {
    return crypto.createHash('md5').update(authToken).digest('hex');
}

export function discordAccessKey(discordUser: discord.DiscordUser) {
    return `discord.${discordUser.id}`;
}

export function enigmaAccessKey(authToken: string) {
    return `enigma.${authToken}`;
}

export async function getUserIdFromAccessKey(accessKey: string, allowCache: boolean = true): Promise<string> {
    let userId = accessKeyToUserIdCache.get(accessKey);
    if (allowCache && userId) {
        return userId;
    } else {
        userId = await dbStorage.getUserIdFromAccessKey(accessKey);
        accessKeyToUserIdCache.set(accessKey, userId);
        return userId;
    }
}

export async function associateAccessKey(accessKey: string, userId: string): Promise<void> {
    await dbStorage.associateAccessKey(accessKey, userId);
    accessKeyToUserIdCache.set(accessKey, userId);
}