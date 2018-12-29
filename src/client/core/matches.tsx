import * as ai from './ai';
import * as engine from '../../game/engine';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as stats from './stats';
import * as ticker from './ticker';
import * as StoreProvider from '../storeProvider';
import * as sockets from './sockets';
import * as url from '../url';
import * as vector from '../../game/vector';
import { isMobile } from './userAgent';
import { notify } from './notifications';
import { socket } from './sockets';

export interface JoinParams {
	observeGameId?: string;
	live?: boolean;
	layoutId?: string;
}

export async function joinNewGame(opts: JoinParams): Promise<boolean> {
	return new Promise<boolean>(resolve => {
		const live = opts.live || false;
		const observe = live || !!opts.observeGameId;

		const store = StoreProvider.getState();
		if (store.socketId) {
			leaveCurrentGame(false);

			const msg: m.JoinMsg = {
				gameId: opts.observeGameId || null,
				name: store.playerName,
				keyBindings: store.keyBindings,
				room: store.room.id,
				layoutId: opts.layoutId || null,
				isBot: ai.playingAsAI(store) && !opts.observeGameId,
				isMobile,
				observe,
				live,
				version: engine.version(),
			};
			socket.emit('join', msg, (response: m.JoinResponseMsg) => {
				if (response.success) {
					resolve(true);
				} else {
					StoreProvider.dispatch({ type: "leaveMatch" });
					resolve(false);
				}
			});
		} else {
			// New server? Reload the client, just in case the version has changed.
			if (opts.observeGameId) {
				window.location.href = url.getPath({ ...store.current, gameId: opts.observeGameId, server: null });
			} else {
				const hash = live ? "watch" : "join";
				window.location.href = url.getPath({ ...store.current, gameId: null, server: null, hash });
				window.location.reload(); // to get the hash respected
			}
			resolve(true);
		}
	});
}

export async function watchLiveGame() {
	return await joinNewGame({ live: true });
}

export function addBotToCurrentGame() {
	const store = StoreProvider.getState();
	const world = store.world;

	if (world.ui.myGameId && world.ui.myHeroId) {
		const botMsg: m.BotMsg = { gameId: world.ui.myGameId };
		socket.emit('bot', botMsg);
	}
}

export function startCurrentGame() {
	const store = StoreProvider.getState();
	const world = store.world;

	if (world.ui.myGameId && world.ui.myHeroId) {
		sockets.sendAction(world.ui.myGameId, world.ui.myHeroId, { type: w.Actions.Stop, target: vector.zero() });
	}
}

export function leaveCurrentGame(close: boolean = true) {
	const store = StoreProvider.getState();
	const world = store.world;

	// Save previous game
	stats.save(store.world, store.server); // Note, this is async, but we don't care about waiting for it to finish
	world.players.forEach(player => {
		if (player.userHash) {
			ticker.setPreferredColor(player.userHash, player.uiColor);
		}
	});

	if (world.ui.myGameId) {
		const leaveMsg: m.LeaveMsg = { gameId: world.ui.myGameId };
		socket.emit('leave', leaveMsg);
		if (close) {
			StoreProvider.dispatch({ type: "leaveMatch" });
		}
		notify({ type: "exit" });

		console.log("Left game " + world.ui.myGameId);
	}
}

export function replays(ids: string[]): Promise<string[]> {
	const request: m.GameListRequest = { ids };
	return new Promise<string[]>((resolve, reject) => {
		socket.emit('replays', request, (response: m.GameListResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve(response.ids);
			}
		});
	});
}

export function onHeroMsg(data: m.HeroMsg) {
	leaveCurrentGame(false);

	const world = engine.initialWorld(data.mod);
	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;
	world.ui.myPartyId = data.partyId;

	ticker.reset(data.history, data.live);

	console.log("Joined game " + world.ui.myGameId + " as hero id " + world.ui.myHeroId, data.mod, data.allowBots);

	StoreProvider.dispatch({ type: "joinMatch", world });
	notify({
		type: "new",
		gameId: world.ui.myGameId,
		heroId: world.ui.myHeroId,
		room: data.room,
		isPrivate: data.isPrivate,
		numPlayersPublic: data.numPlayersPublic,
		numPlayersInGameMode: data.numPlayersInSegment,
	});
}

export function worldInterruptible(world: w.World) {
	return world.activePlayers.size <= 1
		|| !!world.winner
		|| !world.ui.myHeroId
		|| !world.objects.has(world.ui.myHeroId);
}