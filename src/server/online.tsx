import _ from 'lodash';
import * as g from './server.model';
import * as m from '../game/messages.model';
import { getStore } from './serverStore';

let emitOnline: OnlineChangeListener = (segment, diff) => {};

export interface OnlineChangeListener {
	(segment: string, diff: m.OnlineMsg): void;
}

export function attachOnlineEmitter(_emit: OnlineChangeListener) {
	emitOnline = _emit;
}

export function getOnlinePlayers(segment: string): m.OnlinePlayerMsg[] {
    const playerCounts = getStore().playerCounts[segment];
    if (playerCounts) {
        return [...playerCounts.values()].map(onlinePlayerToMsg);
    } else {
        return [];
    }
}

export function appendOnlinePlayers(game: g.Game, playerCounts: g.PlayerCounts) {
	let playerLookup = playerCounts[game.segment];
	if (!playerLookup) {
		playerLookup = playerCounts[game.segment] = new Map<string, g.OnlinePlayer>();
	}
	game.active.forEach(player => {
		const online: g.OnlinePlayer = {
			userHash: player.userHash,
			userId: player.userId,
			name: player.name,
		};
		playerLookup.set(player.userHash, online);
	});
}

export function updateOnlinePlayers(newPlayerCounts: g.PlayerCounts) {
    const oldPlayerCounts = getStore().playerCounts;
    getStore().playerCounts = newPlayerCounts;

    emitOnlineChanges(oldPlayerCounts, newPlayerCounts);
}

function emitOnlineChanges(from: g.PlayerCounts, to: g.PlayerCounts) {
	const segments = _.uniq([...Object.keys(from), ...Object.keys(to)]);
	for (const segment of segments) {
		const diff = diffPlayers(from[segment], to[segment]);
		if (diff && (diff.joined.length + diff.left.length) > 0) {
            emitOnline(segment, diff);
		}
	}
}

function diffPlayers(from: Map<string, g.OnlinePlayer>, to: Map<string, g.OnlinePlayer>): m.OnlineMsg {
	if (!from && !to) {
		return null;
	} else if (!from && to) {
		return { joined: [...to.values()].map(onlinePlayerToMsg), left: [] };
	} else if (from && !to) {
		return { joined: [], left: [...from.values()].map(p => p.userHash) };
	}

	const changes: m.OnlineMsg = { joined: [], left: [] };
	for (const fromHash of from.keys()) {
		if (!to.has(fromHash)) {
			changes.left.push(fromHash);
		}
	}
	for (const toPlayer of to.values()) {
		const fromPlayer = from.get(toPlayer.userHash);
		if (!_.isEqual(fromPlayer, toPlayer)) {
			changes.joined.push(onlinePlayerToMsg(toPlayer));
		}
	}
	return changes;
}

function onlinePlayerToMsg(player: g.OnlinePlayer): m.OnlinePlayerMsg {
	return { userId: player.userId, userHash: player.userHash, name: player.name };
}
