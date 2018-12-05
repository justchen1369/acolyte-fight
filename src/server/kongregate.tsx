import crypto from 'crypto';
import fetch from 'node-fetch';
import * as base64url from 'base64-url';
import * as auth from './auth';

const KongregateAuthTokenPrefix = "kg-";

let KongregateSecret = "unknown";

interface KAuthRequest {
  api_key: string;
  user_id: number;
  game_auth_token: string;
}
interface KAuthResponse {
  success: boolean;
  username?: string;
  user_id?: number;
}

export function init(secret: string) {
    KongregateSecret = secret;
}

export async function getPlayerName(kongregateId: number, signature: string): Promise<string> {
    const req: KAuthRequest = {
        api_key: KongregateSecret,
        user_id: kongregateId,
        game_auth_token: signature,
    };
    console.log(req);

    const res = await fetch("https://api.kongregate.com/api/authenticate.json", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
    });
    if (res.status !== 200) {
        throw "Kongregate API error: " + await res.statusText
    }
    const json: KAuthResponse = await res.json();
    console.log(json);
    if (json.success) {
        return json.username;
    } else {
        return null;
    }
}

export function authToken(kongregateId: number) {
    if (kongregateId) {
        const hash = crypto.createHash('sha256').update(`${auth.getEnigmaSecret()}.${KongregateAuthTokenPrefix}${kongregateId}`).digest('base64');
        const hashUrl = base64url.escape(hash);
        return KongregateAuthTokenPrefix + hashUrl;
    } else {
        return null;
    }
}

export function isKongregateAuthToken(authToken: string) {
    return authToken && authToken.startsWith(KongregateAuthTokenPrefix);
}