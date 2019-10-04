import _ from 'lodash';
import cookie from 'cookie';
import crypto from 'crypto';
import express from 'express';
import uniqid from 'uniqid';

import * as discord from './discord';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as sanitize from '../../shared/sanitize';
import * as userStorage from '../storage/userStorage';

import { logger } from '../status/logging';

interface CreateUserArgs {
    accessKey: string;
    username: string;
}

let enigmaSecret: string = "Unknown";
const ipAddressRegex = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/;

const accessKeyToUserIdCache = new Map<string, string>();

export function init(_enigmaSecret: string) {
    enigmaSecret = _enigmaSecret;
}

export function getEnigmaSecret() {
    return enigmaSecret;
}

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    let authToken = parseAuthTokenFromRequest(req);
    if (authToken) {
        setAuthToken(req, authToken);
    } else {
        resendAuthToken(req, res);
    }
    next();
}

export function resendAuthToken(req: express.Request, res: express.Response) {
    let authToken = getAuthToken(req);
    if (!authToken) {
        authToken = uniqid('a-');
    }

    sendAuthToken(authToken, req, res);

    return authToken;
}

export function sendAuthToken(authToken: string, req: express.Request, res: express.Response) {
    const maxAge = 20 * 365 * 24 * 60 * 60 * 1000;
    const domain = calculateDomain(req.hostname);
    if (domain) {
        // Unset all the cookies we don't want to have
        res.clearCookie(m.AuthCookieName, { httpOnly: true });
        res.clearCookie(m.AuthCookieName, { httpOnly: true, domain: `.${req.hostname}` });
    }
    res.cookie(m.AuthCookieName, authToken, { maxAge, domain, httpOnly: true });
    setAuthToken(req, authToken);
}

function calculateDomain(hostname: string): string {
    if (hostname || ipAddressRegex.test(hostname)) {
        return null;
    }

    const parts = hostname.split('.');
    if (parts.length > 1) {
        // e.g. .acolytefight.io
        return '.' + _.takeRight(parts, 2).join('.');
    } else {
        return null;
    }
}

export function getAuthToken(req: express.Request) {
    return (req as any).enigmaAuthToken;
}

export function setAuthToken(req: express.Request, authToken: string) {
    (req as any).enigmaAuthToken = authToken;
}

export function getAuthTokenFromSocket(socket: SocketIO.Socket) {
    if (socket && socket.request) {
        return parseAuthTokenFromRequest(socket.request);
    } else {
        return null;
    }
}

export function getUserHashFromSocket(socket: SocketIO.Socket) {
    // If user has cleared cookies, use the socket.id as their identifier
    return getUserHashFromAuthToken(getAuthTokenFromSocket(socket)) || socket.id;
}

function parseAuthTokenFromRequest(req: express.Request): string | null {
    if (!(req && req.headers)) {
        return null;
    } 

    let headerValue = req.headers[m.AuthHeader];
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
    return authToken ? crypto.createHash('md5').update(authToken).digest('hex') : null;
}

export function discordAccessKey(discordUser: discord.DiscordUser) {
    return discordUser ? `${userStorage.DiscordPrefix}${discordUser.id}` : null;
}

export function enigmaAccessKey(authToken: string) {
    return authToken ? `enigma.${authToken}` : null;
}

export function getUserIdFromCache(accessKey: string): string {
    return accessKeyToUserIdCache.get(accessKey);
}

export async function getUserIdFromAccessKey(accessKey: string, allowCache: boolean = true): Promise<string> {
    let userId = accessKeyToUserIdCache.get(accessKey);
    if (allowCache && userId) {
        return userId;
    } else {
        userId = await userStorage.getUserIdFromAccessKey(accessKey);
        accessKeyToUserIdCache.set(accessKey, userId);
        return userId;
    }
}

export async function getUserFromAccessKey(accessKey: string): Promise<g.User> {
    const user = await userStorage.getUserByAccessKey(accessKey);
    if (user) {
        accessKeyToUserIdCache.set(accessKey, user.userId);
        return user;
    } else {
        return null;
    }
}

export async function associateAccessKey(accessKey: string, userId: string): Promise<void> {
    await userStorage.disassociateAccessKey(accessKey);
    await userStorage.associateAccessKey(accessKey, userId);
    accessKeyToUserIdCache.set(accessKey, userId);
}

export async function disassociateAccessKey(accessKey: string): Promise<void> {
    await userStorage.disassociateAccessKey(accessKey);
    accessKeyToUserIdCache.delete(accessKey);
}

export async function loginAsUser(user: CreateUserArgs, enigmaAccessKey: string): Promise<void> {
    const allowCache = false;
    let userId = await getUserIdFromAccessKey(user.accessKey, allowCache)
    if (userId) {
        // Associate this browser with the existing user
        logger.info(`User ${user.accessKey} - ${user.username} - logged in`);
        await associateAccessKey(enigmaAccessKey, userId);

    } else {
        const name = sanitize.sanitizeName(user.username);

        const existingUser = await getUserFromAccessKey(enigmaAccessKey);
        if (existingUser && !existingUser.loggedIn) {
            // Upgrade an existing anonymous user
            logger.info(`User ${user.accessKey} - ${user.username} - upgrading existing anonymous user`);

            userId = existingUser.userId;

            await userStorage.upgradeUser(userId, name, user.accessKey);
        } else {
            // Create a new user
            logger.info(`User ${user.accessKey} - ${user.username} - creating new user`);

            userId = userStorage.generateUserId();
            const userSettings: g.User = {
                userId,
                loggedIn: true,
                settings: {
                    name,
                    buttons: null,
                    rebindings: null,
                    options: null,
                },
            };

            await userStorage.createUser(userSettings, user.accessKey, enigmaAccessKey);
        }
    }
}