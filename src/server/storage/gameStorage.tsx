import fs from 'fs';
import msgpack from 'msgpack-lite';
import zlib from 'zlib';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import { getStore } from '../serverStore';
import { logger } from '../logging';

let basePath: string = null;

const MsgpackExtension = '.msgpack.gz';
const JsonExtension = '.json';

function exists(path: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
        fs.exists(path, resolve);
    });
}

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

export async function loadGame(id: string): Promise<m.Replay> {
    try {
        const path = gamePath(id);
        if (await exists(path + MsgpackExtension)) {
            const compressed = await readFile(path + MsgpackExtension);
            const encoded = await gunzip(compressed);
            const replay = msgpack.decode(encoded) as m.Replay;
            return replay;
        } else if (await exists(path + JsonExtension)) {
            const buffer = await readFile(path + JsonExtension);
            return JSON.parse(buffer.toString());
        } else {
            return null;
        }
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
        await writeFile(gamePath(game.id) + MsgpackExtension, compressed);

        const store = getStore();
        store.storedGameIds.add(game.id);

    } catch (error) {
        logger.error(`Error writing ${game.id} to file: ${error}`);
    }
}

function gamePath(id: string) {
    return `${basePath}/${id}`;
}

function extractReplay(game: g.Game): m.Replay {
    const replay: m.Replay = {
        id: game.id,
        universe: game.universe,
        segment: game.segment,
        roomId: game.roomId,
        partyId: game.partyId,
        locked: game.locked,

        mod: game.mod,

        history: game.history,
    };
    return replay;
}