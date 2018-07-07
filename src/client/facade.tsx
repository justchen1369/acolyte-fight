import pl from 'planck-js';
import { Choices, Spells, TicksPerSecond, TicksPerTurn } from '../game/constants';
import { fullRerender, render, calculateWorldRect, CanvasStack } from './render';
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
let incomingQueue = new Array<m.TickMsg>();

let notificationListeners = new Array<NotificationListener>();

let isMouseDown = false;
let nextTarget: pl.Vec2 = null;
let showedHelpText: boolean = false;

let preferredColors = new Map<string, string>(); // player name -> color


const isSafari = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;

export function getCurrentWorld(): w.World {
	return world;
}

export function displayPlayersOnline() {
	fetch('/status').then(res => res.json()).then((serverStats: m.ServerStats) => {
		world.ui.notifications.push({
			type: "serverStats",
			numGames: serverStats.numGames,
			numPlayers: serverStats.numPlayers,
		});
	});
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

	canvasStack.ui.onmousemove = (ev) => canvasMouseMove(ev);

	canvasStack.ui.onmouseenter = (ev) => canvasMouseMove(ev);
	canvasStack.ui.onmouseleave = (ev) => { isMouseDown = false; };
	
    canvasStack.ui.onmousedown = (ev) => {
		isMouseDown = true;
		canvasMouseMove(ev);
	};
    canvasStack.ui.onmouseup = (ev) => { isMouseDown = false; };

    window.onkeyup = (ev) => gameKeyUp(ev);
    window.onkeydown = (ev) => gameKeyDown(ev);
    window.onresize = fullScreenCanvas;

    canvasStack.ui.oncontextmenu = (ev) => {
            ev.preventDefault();
    };

	window.requestAnimationFrame(frameLoop);
	
	setInterval(incomingLoop, Math.floor(1000 / TicksPerSecond));

    function fullScreenCanvas() {
        canvasStack.background.width = document.body.clientWidth;
        canvasStack.background.height = document.body.clientHeight;
        canvasStack.glows.width = document.body.clientWidth;
        canvasStack.glows.height = document.body.clientHeight;
        canvasStack.canvas.width = document.body.clientWidth;
        canvasStack.canvas.height = document.body.clientHeight;
        canvasStack.ui.width = document.body.clientWidth;
		canvasStack.ui.height = document.body.clientHeight;
		fullRerender(world);
    }

    function frameLoop() {
        frame(canvasStack);
        window.requestAnimationFrame(frameLoop);
	}
	
	function incomingLoop() {
		const AllowedDelayInTicks = 1;

		let numFramesToProcess = 1;

		if (incomingQueue.length === 0) {
			numFramesToProcess = 0;
		} else if (world.ui.isReplay) {
			numFramesToProcess = 1; // Don't catch up to live when watching a replay
		} else if (incomingQueue.length <= TicksPerTurn + AllowedDelayInTicks) {
			numFramesToProcess = 1; // We're on time, process at normal rate
		} else if (incomingQueue.length <= TicksPerTurn * 3) {
			numFramesToProcess = 2; // We're behind, but not by much, catch up slowly
		} else {
			// We're very behind, skip ahead
			numFramesToProcess = incomingQueue.length;
		}

		for (let i = 0; i < numFramesToProcess; ++i) {
			tickQueue.push(incomingQueue.shift());
		}
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

export function gameKeyUp(e: KeyboardEvent) {
	if (!world.ui.myGameId || !world.ui.myHeroId) { return; }
	if (!nextTarget) { return; }

	if (isMouseDown) {
		sendAction(world.ui.myGameId, world.ui.myHeroId, { type: "move", target: nextTarget });
	}
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
function onHeroMsg(data: m.HeroMsg, isReplay: boolean = false) {
	world = engine.initialWorld();
	tickQueue = [];
	incomingQueue = [];

	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;
	world.ui.isReplay = isReplay;
	console.log("Joined game " + world.ui.myGameId + " as hero id " + world.ui.myHeroId);

	if (data.history) {
		tickQueue = [...data.history, ...tickQueue];
	}

	world.ui.notifications.push({
		type: "new",
		gameId: world.ui.myGameId,
		heroId: world.ui.myHeroId,
	});
}
function onTickMsg(data: m.TickMsg) {
	if (data.gameId === world.ui.myGameId) {
		incomingQueue.push(data);
	}
}
function onWatchMsg(data: m.WatchResponseMsg) {
	if (!(data.gameId && data.history)) {
		notify({ type: "replayNotFound" });
		return;
	}
	console.log("Watching game " + data.gameId + " with " + data.history.length + " ticks");

	let history = new Array<m.TickMsg>();
	let newReplayQueue = [...data.history];

	while (newReplayQueue.length > 0 && !isStartGameTick(newReplayQueue[0])) {
		history.push(newReplayQueue.shift());
	}

	const observerHeroId = "_observer";
	const isReplay = true;
	onHeroMsg({
		gameId: data.gameId,
		heroId: observerHeroId,
		history,
	}, isReplay);

	incomingQueue = newReplayQueue;
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

function isStartGameTick(tickData: m.TickMsg) {
	let result = false;
	tickData.actions.forEach(actionData => {
		if (actionData.actionType === m.ActionType.CloseGame) {
			result = true;
		}
	});
	return result;
}