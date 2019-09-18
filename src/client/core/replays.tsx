import _ from 'lodash';
import wu from 'wu';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as credentials from './credentials';
import * as matches from './matches';
import * as regions from './regions';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

export async function checkForReplays(gameStats: d.GameStats[]) {
    const gamesByServer = _.groupBy(gameStats, (x: d.GameStats) => (x.server || ""));
    for (let server in gamesByServer) {
        try {
            await checkForReplaysOnServer(gamesByServer[server].map(x => x.id), server);
        } catch (error) {
            console.error("Failed to load replays from server", server, error);
        }
    }
}

async function checkForReplaysOnServer(gameIds: string[], server: string) {
    const hasReplayLookup = StoreProvider.getState().hasReplayLookup;

    const gameIdsToCheck = _.difference(gameIds, wu(hasReplayLookup.keys()).toArray());
    if (gameIdsToCheck.length === 0) {
        return;
    }

    const replayIds = new Set<string>(await listReplays(gameIdsToCheck, server));
    const newReplayLookup = new Map<string, string>();

    const origin = regions.getOrigin(server);
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
    const region = regions.getRegion(server);
    const origin = regions.getOrigin(region);
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

export async function watch(gameId: string, server: string = null) {
    const replay = await getReplay(gameId, server);
    if (replay) {
        const join = replayToJoinMsg(replay);
        matches.watchReplayFromObject(join);
    } else {
        throw "Replay not found";
    }
}

export function replayToJoinMsg(replay: m.Replay): m.HeroMsg {
    const state = StoreProvider.getState();
    const join: m.HeroMsg = {
        gameId: replay.id,
        universeId: replay.universe,
        heroId: null,
        controlKey: null,
        reconnectKey: null,
        userHash: state.userHash,
        partyId: replay.partyId,
        locked: replay.locked,
        room: replay.roomId,
        mod: replay.mod,
        live: false,
        history: replay.history,
    };
    return join;
}

export async function getReplay(gameId: string, server: string = null): Promise<m.Replay> {
    let prefix = url.base;
    if (server) {
        const region = regions.getRegion(server);
        const origin = regions.getOrigin(region);
        prefix = `${origin}`;
    }
    const res = await fetch(`${prefix}/api/games/${gameId}`, {
        ...credentials.headers(),
        credentials: 'same-origin',
    });
    if (res.status === 200) {
        const response: m.Replay = await res.json();
        return response;
    } else {
        return null;
    }
}