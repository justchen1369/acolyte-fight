import * as banStorage from '../storage/banStorage';
import { delay } from '../../utils/delay';
import { logger } from '../status/logging';

const UpdateIntervalMilliseconds = 5 * 60 * 1000;

let banList = initBans();

interface Bans {
    ips: Set<string>;
    userIds: Set<string>;
    authTokens: Set<string>;
}

function initBans(): Bans {
    return {
        ips: new Set(),
        userIds: new Set(),
        authTokens: new Set(),
    };
}

export async function startUpdateLoop() {
    while (true) {
        await refresh();
        await delay(UpdateIntervalMilliseconds);
    }
}

async function refresh(): Promise<void> {
    const dbBanList = await banStorage.loadAllBans();

    const newBanList = initBans();
    for (const ban of dbBanList) {
        if (ban.ips) {
            for (const ip of ban.ips) {
                newBanList.ips.add(ip);
            }
        }

        if (ban.userIds) {
            for (const userId of ban.userIds) {
                newBanList.userIds.add(userId);
            }
        }

        if (ban.authTokens) {
            for (const authToken of ban.authTokens) {
                newBanList.authTokens.add(authToken);
            }
        }
    }

    banList = newBanList;
    logger.info(`Loaded ${dbBanList.length} bans`);
}

export function isBanned(ips: string[], userId: string, authToken: string): boolean {
    try {
        return banList.userIds.has(userId) || banList.authTokens.has(authToken) || ips.some(ip => banList.ips.has(ip));
    } catch (error) {
        logger.error(error);
        return false;
    }
}