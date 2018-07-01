import cookie from 'cookie';
import express from 'express';
import * as uuid from 'uuid';
import * as m from '../game/messages.model';

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    let authToken = parseAuthTokenFromRequest(req);
    if (!authToken) {
        authToken = uuid.v4();
        res.cookie(m.AuthCookieName, authToken, {
            maxAge: 20 * 365 * 24 * 60 * 60 * 1000,
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

function parseAuthTokenFromRequest(req: express.Request) {
    req.rawHeaders;
    if (!(req && req.headers && req.headers.cookie && typeof req.headers.cookie === "string")) {
        console.log("Unable to find cookie header", req.headers);
        return null;
    }
    const cookies = cookie.parse(req.headers.cookie);
    return cookies && cookies[m.AuthCookieName];
}