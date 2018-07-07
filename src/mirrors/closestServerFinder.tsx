import * as m from '../game/messages.model';

const each = require('promise-each');

function calculatePing(url: string) {
    const startMilliseconds = new Date().getTime();
	return fetch(url + '/ping', { mode: 'cors' }).then((res) => {
        const ping = new Date().getTime() - startMilliseconds;
        console.log(`Ping ${url} - ${ping} ms. Status ${res.status}.`);
        if (res.status === 200) {
            return ping;
        } else {
            return null;
        }
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
            return calculatePing(url).then(pingMilliseconds => {
                if (pingMilliseconds && pingMilliseconds < bestPingMilliseconds) {
                    bestUrl = url;
                    bestPingMilliseconds = pingMilliseconds;
                }
            });
        }))
        .then(() => bestUrl);
}