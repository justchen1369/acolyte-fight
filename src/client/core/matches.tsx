import * as ai from './ai';
import * as engine from '../../game/engine';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as ticker from './ticker';
import * as StoreProvider from '../storeProvider';
import { isMobile } from './userAgent';
import { notify } from './notifications';
import { socket } from './sockets';

export function joinNewGame(observeGameId?: string) {
	const store = StoreProvider.getStore();

	leaveCurrentGame();

	const msg: m.JoinMsg = {
		gameId: observeGameId || null,
		name: store.playerName,
		keyBindings: store.keyBindings,
		room: store.room.id,
		party: store.party ? store.party.id : null,
		isBot: ai.playingAsAI(store.room.allowBots) && !observeGameId,
		isMobile,
		observe: !!observeGameId,
	};
	socket.emit('join', msg, (hero: m.JoinResponseMsg) => {
		if (hero) {
			onHeroMsg(hero);
		} else {
			notify({ type: "replayNotFound" });
		}
	});
}

export function addBotToCurrentGame() {
	const store = StoreProvider.getStore();
	const world = store.world;

	if (world.ui.myGameId && world.ui.myHeroId) {
		const botMsg: m.BotMsg = { gameId: world.ui.myGameId };
		socket.emit('bot', botMsg);
	}
}

export function leaveCurrentGame() {
	const store = StoreProvider.getStore();
	const world = store.world;

	world.players.forEach(player => {
		store.preferredColors.set(player.name, player.uiColor);
	});

	if (world.ui.myGameId) {
		const leaveMsg: m.LeaveMsg = { gameId: world.ui.myGameId };
		socket.emit('leave', leaveMsg);
	}

	store.world = engine.initialWorld(store.room.mod, store.room.allowBots);

	notify({ type: "quit" });
}

function onHeroMsg(data: m.JoinResponseMsg) {
	const store = StoreProvider.getStore();

	const world = engine.initialWorld(data.mod, data.allowBots);
	store.world = world;
	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;

	ticker.reset(data.history);

	console.log("Joined game " + world.ui.myGameId + " as hero id " + world.ui.myHeroId, data.mod, data.allowBots);
	notify({
		type: "new",
		gameId: world.ui.myGameId,
		heroId: world.ui.myHeroId,
		room: data.room,
		numGames: data.numGames,
		numPlayers: data.numPlayers,
	});
}

export function worldInterruptible(world: w.World) {
	return world.activePlayers.size <= 1
		|| !!world.winner
		|| !world.ui.myHeroId
		|| !world.objects.has(world.ui.myHeroId);
}