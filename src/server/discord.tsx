import fetch from 'node-fetch';
import formUrlEncoded from 'form-urlencoded';
import { logger } from './logging';
import urlJoin from 'url-join';

export interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
}

interface DiscordTokenResponse {
    "access_token": string;
    "token_type": string;
    "expires_in": number;
    "refresh_token": string;
    "scope": string;
}

const DiscordUrl = "https://discordapp.com/api";
const ClientId = "496220557185122306";
let ClientSecret = "unknown";
const Scopes = "identify";

export function init(secret: string) {
    ClientSecret = secret;
}

export function getAuthUrl(origin: string) {
    const redirectUrl = getRedirectUrl(origin);
    return `${DiscordUrl}/oauth2/authorize?client_id=${ClientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=${encodeURIComponent(Scopes)}`;
}

function getRedirectUrl(origin: string) {
    return urlJoin(origin, "login");
}

function discordAuthToken(tokenType: string, accessToken: string) {
    return `${tokenType} ${accessToken}`;
}

export async function authenticateWithCode(origin: string, code: string): Promise<DiscordUser> {
    const redirectUrl = getRedirectUrl(origin);
    const data = {
        'client_id': ClientId,
        'client_secret': ClientSecret,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirectUrl,
        'scope': Scopes,
    };
    const res = await fetch(`${DiscordUrl}/oauth2/token`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formUrlEncoded(data),
    })
    if (res.status !== 200) {
        logger.error(`Error authenticating with Discord: ${res.status}` + await res.text());
        return null;
    }

    const json: DiscordTokenResponse = await res.json();
    const auth = discordAuthToken(json.token_type, json.access_token);
    return await getCurrentUser(auth);
}

async function getCurrentUser(auth: string): Promise<DiscordUser> {
    const res = await fetch(`${DiscordUrl}/users/@me`, {
        headers: {
            'Authorization': auth,
        },
    })

    if (res.status === 200) {
        return res.json();
    } else {
        logger.error(`Error retrieving user from Discord: ${res.status}` + await res.text());
        return null;
    }
}