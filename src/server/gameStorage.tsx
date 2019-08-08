import fs from 'fs';
import msgpack from 'msgpack-lite';
import zlib from 'zlib';
import * as g from './server.model';
import { getStore } from './serverStore';
import { logger } from './logging';

let basePath: string = null;

function readFile(path: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function writeFile(path: string, data: Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(path, data, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function gzip(data: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(data, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function gunzip(data: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        zlib.gunzip(data, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

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

export async function loadGame(id: string): Promise<g.Replay> {
    try {
        const compressed = await readFile(gamePath(id));
        const encoded = await gunzip(compressed);
        const replay = msgpack.decode(encoded) as g.Replay;
        return replay;
    } catch (error) {
        // Replay does not exist
        logger.info(`Failed to read replay ${id}: ${error}`);
        return null;
    }
}

export async function saveGame(game: g.Game) {
    try {
        if (!game) {
            return;
        }

        const replay = extractReplay(game);
        const encoded = msgpack.encode(replay);
        const compressed = await gzip(encoded);
        await writeFile(gamePath(game.id), compressed);

        const store = getStore();
        store.storedGameIds.add(game.id);

    } catch (error) {
        logger.error(`Error writing ${game.id} to file: ${error}`);
    }
}

function gamePath(id: string) {
    return `${basePath}/${id}.msgpack.gz`;
}

function extractReplay(game: g.Game): g.Replay {
    const replay: g.Replay = {
        id: game.id,
        segment: game.segment,
        roomId: game.roomId,
        partyId: game.partyId,
        isPrivate: game.isPrivate,
        locked: game.locked,

        mod: game.mod,

        numPlayers: game.numPlayers,
        history: game.history,
    };
    return replay;
}