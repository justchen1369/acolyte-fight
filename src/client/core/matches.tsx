import * as engine from '../../game/engine';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as processor from './processor';
import * as stats from './stats';
import * as ticker from './ticker';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import * as vector from '../../game/vector';
import { isMobile } from './userAgent';
import { notify } from './notifications';
import { getSocket } from './sockets';

export interface JoinParams {
	gameId?: string;
	observe?: boolean;
	live?: boolean;
	layoutId?: string;
	roomId?: string;
	locked?: string;
	reconnectKey?: string;
	numBots?: number;
}

export async function joinNewGame(opts: JoinParams): Promise<boolean> {
	return new Promise<boolean>(resolve => {
		const live = opts.live || false;
		const observe = opts.observe || false;
		const locked = opts.locked || null;

		const store = StoreProvider.getState();
		if (store.socketId) {
			const msg: m.JoinMsg = {
				server: store.server,
				gameId: opts.gameId || null,
				name: store.playerName,
				keyBindings: store.keyBindings,
				room: opts.roomId || store.room.id,
				layoutId: opts.layoutId || null,
				isMobile,
				unranked: store.options.unranked || false,
				observe,
				live,
				locked,
				version: engine.version(),
				numBots: opts.numBots || 0,
			};
			getSocket().emit('join', msg, (response: m.JoinResponseMsg) => {
				if (response.success) {
					resolve(true);
				} else {
					StoreProvider.dispatch({ type: "leaveMatch" });
					resolve(false);
				}
			});
		} else {
			// New server? Reload the client, just in case the version has changed.
			if (opts.gameId) {
				window.location.href = url.getPath({ ...store.current, gameId: opts.gameId, server: null });
			} else {
				const page = live ? "watch" : "join";
				window.location.href = url.getPath({ ...store.current, page, gameId: null, server: null, hash: null });
			}
			resolve(true);
		}
	});
}

export async function watchLiveGame() {
	return await joinNewGame({ observe: true, live: true });
}

export async function reconnectToGame() {
	const store = StoreProvider.getState();
	const world = store.world;
	if (world.ui.myGameId && world.ui.myHeroId && world.ui.reconnectKey) {
		await joinNewGame({
			gameId: world.ui.myGameId,
			reconnectKey: world.ui.reconnectKey,
		});
	}
}

export function addBotToCurrentGame() {
	const store = StoreProvider.getState();
	const world = store.world;

	if (world.ui.myGameId && world.ui.myHeroId) {
		const botMsg: m.BotMsg = { gameId: world.ui.myGameId };
		getSocket().emit('bot', botMsg);
	}
}

export function leaveCurrentGame(close: boolean = true) {
	const store = StoreProvider.getState();
	const world = store.world;

	// Save previous game
	stats.save(store.world, store.server); // Note, this is async, but we don't care about waiting for it to finish

	if (world.ui.myGameId) {
		const leaveMsg: m.LeaveMsg = { gameId: world.ui.myGameId };
		getSocket().emit('leave', leaveMsg);
		if (close) {
			StoreProvider.dispatch({ type: "leaveMatch" });
		}
		notify({ type: "exit" });

		console.log("Left game " + world.ui.myGameId);
	}
}

export function watchReplayFromObject(data: m.HeroMsg) {
	onHeroMsg(data);
}

export function onHeroMsg(data: m.HeroMsg) {
	const store = StoreProvider.getState();

	let world: w.World;
	if (store.world.ui.myGameId === data.gameId) {
		// Reconnect to game
		console.log("Reconnecting to game", data.gameId);
		world = store.world;
	} else {
		leaveCurrentGame(false);
		world = processor.initialWorld(data);
	}

	ticker.reset(data.history, data.live);

	console.log("Joined game " + world.ui.myGameId + " as hero id " + world.ui.myHeroId, data.mod);

	StoreProvider.dispatch({ type: "joinMatch", world });
	notify({
		type: "new",
		gameId: world.ui.myGameId,
		heroId: world.ui.myHeroId,
		room: data.room,
		isPrivate: data.isPrivate,
	});
}

export function worldInterruptible(world: w.World) {
	return world.activePlayers.size <= 1
		|| !!world.winner
		|| !world.ui.myHeroId
		|| !world.objects.has(world.ui.myHeroId);
}