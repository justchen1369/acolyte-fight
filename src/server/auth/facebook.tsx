import crypto from 'crypto';
import * as base64url from 'base64-url';
import * as CryptoJS from 'crypto-js';
import * as auth from './auth';

const FacebookAuthTokenPrefix = "fb-";

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
        const hash = crypto.createHash('sha256').update(`${auth.getEnigmaSecret()}.${facebookId}`).digest('base64');
        const hashUrl = base64url.escape(hash);
        return FacebookAuthTokenPrefix + hashUrl;
    } else {
        return null;
    }
}

export function isFacebookAuthToken(authToken: string) {
    return authToken && authToken.startsWith(FacebookAuthTokenPrefix);
}