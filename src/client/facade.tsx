import pl from 'planck-js';
import { Choices, Spells, TicksPerSecond } from '../game/constants';
import { render, calculateWorldRect, CanvasStack } from './render';
import * as engine from '../game/engine';
import * as m from '../game/messages.model';
import * as w from '../game/world.model';

export { CanvasStack } from './render';

interface NotificationListener {
	(notifications: w.Notification[]): void;
}

let world = engine.initialWorld();

let socket: SocketIOClient.Socket = null;
let tickQueue = new Array<m.TickMsg>();
let replayQueue = new Array<m.TickMsg>();
let notificationListeners = new Array<NotificationListener>();

let nextTarget: pl.Vec2 = null;
let showedHelpText: boolean = false;

let preferredColors = new Map<string, string>(); // player name -> color


const isSafari = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;

export function getCurrentWorld(): w.World {
	return world;
}

export function joinNewGame(playerName: string, keyBindings: w.KeyBindings, observe?: string) {
	leaveCurrentGame();

	world = engine.initialWorld();

	if (observe) {
		socket.emit('watch', { gameId: observe, name: playerName } as m.WatchMsg);
	} else {
		socket.emit('join', { name: playerName, keyBindings } as m.JoinMsg);
	}
}

export function leaveCurrentGame() {
	world.players.forEach(player => {
		preferredColors.set(player.name, player.uiColor);
	});

	if (world.ui.myGameId) {
		const leaveMsg: m.LeaveMsg = { gameId: world.ui.myGameId };
		socket.emit('leave', leaveMsg);
	}
}

export function attachNotificationListener(listener: NotificationListener) {
	notificationListeners.push(listener);
}

export function attachToCanvas(canvasStack: CanvasStack) {
    fullScreenCanvas();

    canvasStack.canvas.onmouseenter = canvasMouseMove;
    canvasStack.canvas.onmousemove = canvasMouseMove;
    canvasStack.canvas.onmousedown = canvasMouseMove;

    window.onkeydown = gameKeyDown;
    window.onresize = fullScreenCanvas;

    canvasStack.canvas.oncontextmenu = (ev) => {
            ev.preventDefault();
    };

    window.requestAnimationFrame(frameLoop);

    function fullScreenCanvas() {
        canvasStack.background.width = document.body.clientWidth;
        canvasStack.background.height = document.body.clientHeight;
        canvasStack.glows.width = document.body.clientWidth;
        canvasStack.glows.height = document.body.clientHeight;
        canvasStack.canvas.width = document.body.clientWidth;
        canvasStack.canvas.height = document.body.clientHeight;
    }

    function frameLoop() {
        frame(canvasStack);
        window.requestAnimationFrame(frameLoop);
    }
}

function frame(canvasStack: CanvasStack) {
	while (tickQueue.length > 0 && tickQueue[0].gameId != world.ui.myGameId) {
		tickQueue.shift(); // Get rid of any leftover ticks from other games
	}
	while (tickQueue.length > 0 && tickQueue[0].tick <= world.tick) {
		let tickData = tickQueue.shift();
		if (tickData.tick < world.tick) {
			continue; // Received the same tick multiple times, skip over it
		}

		applyTickActions(tickData, world);
		engine.tick(world);
	}
	render(world, canvasStack);

	const notifications = engine.takeNotifications(world);
	notify(...notifications);
}

function notify(...notifications: w.Notification[]) {
	if (notifications.length > 0) {
		notificationListeners.forEach(listener => listener(notifications));
	}
}

export function canvasMouseMove(e: MouseEvent) {
	if (!world.ui.myGameId || !world.ui.myHeroId){
		return;
	}

	let rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
	let worldRect = calculateWorldRect(rect);
	let target = pl.Vec2((e.clientX - rect.left - worldRect.left) / worldRect.width, (e.clientY - rect.top - worldRect.top) / worldRect.height);

	if (e.buttons || e.button || (isSafari && e.which)) {
		sendAction(world.ui.myGameId, world.ui.myHeroId, { type: "move", target });
	}

	nextTarget = target; // Set for next keyboard event
}

export function gameKeyDown(e: KeyboardEvent) {
	if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
		if (!showedHelpText) {
			showedHelpText = true;
			notify({ type: "help" });
		}
	}

	if (!world.ui.myGameId || !world.ui.myHeroId) { return; }

	const hero = world.objects.get(world.ui.myHeroId);
	if (!hero || hero.category !== "hero") { return; }

	const key = readKey(e);

	const spellId = hero.keysToSpells.get(key);
	if (!spellId) { return }

	const spell = Spells.all[spellId];
	if (!spell) { return; }

	sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spell.id, target: nextTarget });
}

function readKey(e: KeyboardEvent) {
	switch (e.code) {
		case 'KeyQ': return 'q';
		case 'KeyW': return 'w';
		case 'KeyE': return 'e';
		case 'KeyR': return 'r';
		case 'KeyA': return 'a';
		case 'KeyS': return 's';
		case 'KeyD': return 'd';
		case 'KeyF': return 'f';
		default: return e.key && e.key.toLowerCase();
	}
}

// Sockets
export function attachToSocket(_socket: SocketIOClient.Socket, onConnect: () => void) {
	socket = _socket;
	socket.on('connect', () => {
		console.log("Connected as socket " + socket.id);
		onConnect();
	});
	socket.on('disconnect', () => {
		console.log("Disconnected");
		onDisconnectMsg();
	});
	socket.on('hero', onHeroMsg);
	socket.on('tick', onTickMsg);
	socket.on('watch', onWatchMsg);
}
function onServerStatsMsg(serverStats: m.ServerStats) {
	if (!serverStats) { return; }
	notify({
		type: "serverStats",
		numGames: serverStats.numGames,
		numPlayers: serverStats.numPlayers,
	});
}
function onHeroMsg(data: m.HeroMsg) {
	world = engine.initialWorld();
	tickQueue = [];
	replayQueue = [];

	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;
	console.log("Joined game " + world.ui.myGameId + " as hero id " + world.ui.myHeroId);

	if (data.history) {
		tickQueue = [...data.history, ...tickQueue];
	}

	world.ui.notifications.push({
		type: "new",
		gameId: world.ui.myGameId,
		heroId: world.ui.myHeroId,
	});

	onServerStatsMsg(data.serverStats);
}
function onTickMsg(data: m.TickMsg) {
	if (data.gameId === world.ui.myGameId) {
		if (replayQueue.length > 0) {
			replayQueue.push(data);
		} else {
			tickQueue.push(data);
		}
	}
}
function onWatchMsg(data: m.WatchResponseMsg) {
	if (!(data.gameId && data.history)) {
		return;
	}
	console.log("Watching game " + data.gameId + " with " + data.history.length + " ticks");

	const observerHeroId = "_observer";
	onHeroMsg({
		gameId: data.gameId,
		heroId: observerHeroId,
		history: [],
		serverStats: data.serverStats,
	});

	replayQueue = [...data.history];
	const interval = setInterval(() => {
		if (replayQueue.length > 0) {
			const next = replayQueue.shift();
			tickQueue.push(next);
		} else {
			clearInterval(interval);
		}
	}, 1000.0 / TicksPerSecond);
}
function onDisconnectMsg() {
	world.activePlayers.clear();
	notify({ type: "disconnected" });
}
function sendAction(gameId: string, heroId: string, action: w.Action) {
	const actionMsg: m.ActionMsg = {
		gameId,
		heroId,
		actionType: m.ActionType.GameAction,
		spellId: action.type,
		targetX: action.target.x,
		targetY: action.target.y,
	}
	socket.emit('action', actionMsg);
}
function applyTickActions(tickData: m.TickMsg, world: w.World) {
	if (tickData.gameId !== world.ui.myGameId) {
		return;
	}

	tickData.actions.forEach(actionData => {
		if (actionData.gameId !== world.ui.myGameId) {
			// Skip this action
		} else if (actionData.actionType === m.ActionType.GameAction) {
			world.actions.set(actionData.heroId, {
				type: actionData.spellId,
				target: pl.Vec2(actionData.targetX, actionData.targetY),
			});
		} else if (actionData.actionType === m.ActionType.CloseGame) {
			world.startTick = actionData.closeTick;
			world.ui.notifications.push({
				type: "closing",
				ticksUntilClose: world.startTick - world.tick,
			});
		} else if (actionData.actionType === m.ActionType.Join) {
			world.occurrences.push({
				type: "join",
				heroId: actionData.heroId,
				playerName: actionData.playerName || "Enigma",
				keyBindings: actionData.keyBindings,
				preferredColor: preferredColors.get(actionData.playerName) || null,
			});
		} else if (actionData.actionType === m.ActionType.Leave) {
			world.occurrences.push({
				type: "leave",
				heroId: actionData.heroId,
			});
		} else if (actionData.actionType === m.ActionType.Environment) {
			world.occurrences.push({
				type: "environment",
				seed: actionData.seed,
			});
		}
	});
}
