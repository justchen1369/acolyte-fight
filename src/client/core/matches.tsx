import * as engine from '../../game/engine';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as processor from './processor';
import * as stats from './stats';
import * as storage from '../storage';
import * as ticker from './ticker';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import * as vector from '../../game/vector';
import { notify } from './notifications';
import { getSocket } from './sockets';
import version from '../../game/version';

export interface JoinParams {
	gameId?: string;
	observe?: boolean;
	live?: boolean;
	autoJoin?: boolean;
	roomId?: string;
	locked?: string;
	reconnectKey?: string;
	numBots?: number;
}

export async function joinNewGame(opts: JoinParams): Promise<boolean> {
	const numGames = await storage.getNumGames();
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
				partyId: store.party ? store.party.id : null,
				isMobile: store.touched,
				unranked: store.options.unranked || false,
				observe,
				live,
				locked,
				autoJoin: opts.autoJoin,
				version,
				numBots: opts.numBots || 0,
				numGames,
			};
			getSocket().emit('join', msg, (response: m.JoinResponseMsg) => {
				if (response.success === true) {
					resolve(true);
				} else {
					console.log("Could not join match", response.error);
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

export async function watchLiveGame(autoJoin?: boolean) {
	return await joinNewGame({ observe: true, live: true, autoJoin });
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

		const universeId = world.ui.universeId;
		if (universeId) {
			ticker.purge(world.ui.universeId);
		}

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

	let world: w.World = null;
	const existing = store.world;
	if (existing.ui.myGameId === data.gameId) {
		// Reconnect to game
		console.log("Reconnecting to game", data.gameId);
		world = existing;
	} else if (data.splits && data.splits.some(split => split.gameId === existing.ui.myGameId && existing.tick <= split.tick)) {
		// Split the current game we are already in
		console.log("Fast-forwarding to split game");

		leaveCurrentGame(false);
		world = existing;
		processor.connectToWorld(world, data);
	} else {
		leaveCurrentGame(false);
		world = processor.initialWorld(data);
	}

	ticker.reset(data.history, data.live);

	console.log("Joined game", world.ui.myGameId, world.ui.universeId, world.ui.myHeroId, data.mod);

	StoreProvider.dispatch({ type: "joinMatch", world });
	notify({
		type: "new",
		gameId: world.ui.myGameId,
		heroId: world.ui.myHeroId,
		room: data.room,
	});
}

export function worldInterruptible(world: w.World) {
	return world.activePlayers.size <= 1
		|| !!world.winner
		|| !world.ui.myHeroId
		|| !world.objects.has(world.ui.myHeroId);
}