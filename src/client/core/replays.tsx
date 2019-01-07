import _ from 'lodash';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as credentials from './credentials';
import * as matches from './matches';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

export async function checkForReplays(gameStats: d.GameStats[]) {
    const gamesByServer = _.groupBy(gameStats, (x: d.GameStats) => (x.server || ""));
    for (let server in gamesByServer) {
        await checkForReplaysOnServer(gamesByServer[server].map(x => x.id), server);
    }
}

async function checkForReplaysOnServer(gameIds: string[], server: string) {
    const hasReplayLookup = StoreProvider.getState().hasReplayLookup;

    const gameIdsToCheck = _.difference(gameIds, [...hasReplayLookup.keys()]);
    if (gameIdsToCheck.length === 0) {
        return;
    }

    const replayIds = new Set<string>(await listReplays(gameIdsToCheck, server));
    const newReplayLookup = new Map<string, string>();

    const origin = url.getOrigin(server);
    for (const gameId of gameIdsToCheck) {
        let replayUrl: string;
        if (replayIds.has(gameId)) {
            replayUrl = `${origin}/api/games/${gameId}`;
        } else {
            replayUrl = null;
        }

        newReplayLookup.set(gameId, replayUrl);
    }

    StoreProvider.dispatch({ type: "updateHasReplay", hasReplayLookup: newReplayLookup });
}

async function listReplays(gameIds: string[], server: string): Promise<string[]> {
    const request: m.GameListRequest = {
        ids: gameIds,
    };
    const region = url.getRegion(server);
    const origin = url.getOrigin(region);
    const res = await fetch(`${origin}/api/games`, {
        headers: {
            ...credentials.headers(),
            credentials: 'same-origin',
            "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(request),
    });
    const response: m.GameListResponse = await res.json();
    return response.ids;
}

export async function watch(gameId: string, server: string) {
    const replay = await getReplay(gameId, server);
    matches.watchReplayFromObject(replay);
}

async function getReplay(gameId: string, server: string): Promise<m.HeroMsg> {
    const region = url.getRegion(server);
    const origin = url.getOrigin(region);
    const res = await fetch(`${origin}/api/games/${gameId}`, {
        ...credentials.headers(),
        credentials: 'same-origin',
    });
    const response: m.HeroMsg = await res.json();
    return response;
}