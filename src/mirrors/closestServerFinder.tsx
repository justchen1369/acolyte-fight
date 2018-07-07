import * as m from '../game/messages.model';

const each = require('promise-each');

function calculatePing(url: string) {
    const startMilliseconds = new Date().getTime();
	return fetch(url + '/status').then(res => res.json()).then((serverStats: m.ServerStats) => {
        const ping = new Date().getTime() - startMilliseconds;
        console.log("Ping (ms)", url, startMilliseconds);
        return ping;
    }).catch(error => {
        console.error("Unable to ping server", url, error);
        return null;
    });
}

export function findClosestServer(serverList: string[]) {
    let bestPingMilliseconds: number = Infinity;
    let bestUrl: string = null;

    return Promise.resolve(serverList)
        .then(each((url: string) => {
            calculatePing(url).then(pingMilliseconds => {
                if (pingMilliseconds && pingMilliseconds < bestPingMilliseconds) {
                    bestUrl = url;
                    bestPingMilliseconds = pingMilliseconds;
                }
            });
        }))
        .then(() => bestUrl);
}