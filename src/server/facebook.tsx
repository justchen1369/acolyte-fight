import crypto from 'crypto';
import * as CryptoJS from 'crypto-js';
import * as auth from './auth';

let FacebookSecret = "unknown";

interface SignedRequestPayload {
    algorithm: string; // always equals to HMAC-SHA256
    issued_at: number; // a unix timestamp of when this response was issued. 
    player_id: string; // unique identifier of the player. 
    request_payload: string; // the requestPayload string you specified when calling 
}

export function init(secret: string) {
    FacebookSecret = secret;
}

export function verifyPlayerId(signedRequest: string): string {
    // Adapted from https://developers.facebook.com/docs/games/instant-games/guides/bots-and-server-communication
    let firstpart = signedRequest.split('.')[0];
    firstpart = firstpart.replace(/-/g, '+').replace(/_/g, '/');
    const signature = CryptoJS.enc.Base64.parse(firstpart).toString();
    const dataHash = CryptoJS.HmacSHA256(signedRequest.split('.')[1], FacebookSecret).toString();

    const isValid = signature === dataHash;
    if (!isValid) {
        return null;
    }

    const json = CryptoJS.enc.Base64.parse(signedRequest.split('.')[1]).toString(CryptoJS.enc.Utf8);
    const data: SignedRequestPayload = JSON.parse(json);
    return data.player_id;
}

export function authToken(facebookId: string) {
    if (facebookId) {
        const hash = crypto.createHash('sha256').update(`${auth.getEnigmaSecret()}.${facebookId}`).digest('hex');
        return `fb-${hash}`;
    } else {
        return null;
    }
}

/*
export function verifyPlayerId(signedRequest: string): string {
    const parts = signedRequest.split('.');
    const signature = base64url.decode(parts[0]);
    const payload = base64url.decode(parts[1]);

    const hash = crypto.createHmac('sha256', FacebookSecret).update(payload).read().toString();
    console.log(signature, hash);
    if (signature !== hash) {
        return null;
    }

    const json: SignedRequestPayload = JSON.parse(payload);
    return json.player_id;
}
*/