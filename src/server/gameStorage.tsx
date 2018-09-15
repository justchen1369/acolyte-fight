import fs from 'fs';
import zlib from 'zlib';
import * as g from './server.model';
import { getStore } from './serverStore';

let basePath: string = null;

export function initStorage(_basePath: string) {
    if (!fs.existsSync(_basePath)) {
        fs.mkdirSync(_basePath);
    }
    basePath = _basePath;
}

export function hasGame(id: string): boolean {
    const store = getStore();
    return store.storedGameIds.has(id);
}

export function loadGame(id: string): Promise<g.Replay> {
    const store = getStore();
    if (!store.storedGameIds.has(id)) {
        return null;
    }

    return new Promise<g.Replay>((resolve, reject) => {
        fs.readFile(gamePath(id), (err, data) => {
            if (err) {
                reject(err);
            } else {
                zlib.gunzip(data, (err2, data2) => {
                    if (err2) {
                        reject(err2);
                    } else {
                        const replay = JSON.parse(data2.toString('utf8')) as g.Replay;
                        resolve(replay);
                    }
                });
            }
        })
    });
}

export function saveGame(game: g.Game) {
    if (!game) {
        return;
    }

    const replay = extractReplay(game);
    const json = JSON.stringify(replay);
    zlib.gzip(new Buffer(json, 'utf8'), (err, result) => {
        if (err) {
            console.error("Unable to compress replay", game.id, err);
        } else {
            fs.writeFile(gamePath(game.id), result, (error) => {
                if (error) {
                    console.error(`Error writing ${game.id} to file: ${error}`);
                } else {
                    const store = getStore();
                    store.storedGameIds.add(game.id);
                }
            });
        }
    });
}

function gamePath(id: string) {
    return `${basePath}/${id}.json.gz`;
}

function extractReplay(game: g.Game): g.Replay {
    const replay: g.Replay = {
        id: game.id,
        category: game.category,
        roomId: game.roomId,
        privatePartyId: game.privatePartyId,

        mod: game.mod,
        allowBots: game.allowBots,

        numPlayers: game.numPlayers,
        history: game.history,
    };
    return replay;
}