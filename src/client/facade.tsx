import pl from 'planck-js';
import { Choices, Spells, TicksPerSecond } from '../game/constants';
import { render, calculateWorldRect } from './render';
import * as engine from './engine';
import * as c from '../game/constants.model';
import * as m from '../game/messages.model';
import * as w from './world.model';

interface NotificationListener {
	(notifications: w.Notification[]): void;
}

export let world = engine.initialWorld();

let socket: SocketIOClient.Socket = null;
let tickQueue = new Array<m.TickMsg>();
let notificationListeners = new Array<NotificationListener>();

let nextTarget: pl.Vec2 = null;
let showedHelpText: boolean = false;

export function attachNotificationListener(listener: NotificationListener) {
	notificationListeners.push(listener);
}

export function attachToCanvas(canvas: HTMLCanvasElement) {
    fullScreenCanvas();

    canvas.onmousemove = canvasMouseMove;
    canvas.onmousedown = canvasMouseMove;
    window.onkeydown = gameKeyDown;
    window.onresize = fullScreenCanvas;

    canvas.oncontextmenu = function (e) {
            e.preventDefault();
    };

    window.requestAnimationFrame(frameLoop);

    function fullScreenCanvas() {
        canvas.width = document.body.clientWidth;
        canvas.height = document.body.clientHeight;
    }

    function frameLoop() {
        frame(canvas);
        window.requestAnimationFrame(frameLoop);
    }
}

export function frame(canvas: HTMLCanvasElement) {
	while (tickQueue.length > 0 && tickQueue[0].tick <= world.tick) {
		let tickData = tickQueue.shift();
		if (tickData.tick < world.tick) {
			continue; // Received the same tick multiple times, skip over it
		}

		applyTickActions(tickData, world);
		engine.tick(world);
	}
	render(world, canvas);

	const notifications = engine.takeNotifications(world);
	notify(notifications);
}

function notify(notifications: w.Notification[]) {
	if (notifications.length > 0) {
		notificationListeners.forEach(listener => listener(notifications));
	}
}

export function canvasMouseMove(e: MouseEvent) {
	let rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
	let worldRect = calculateWorldRect(rect);
	let target = pl.Vec2((e.clientX - rect.left - worldRect.left) / worldRect.width, (e.clientY - rect.top - worldRect.top) / worldRect.height);

	if (e.buttons || e.button) {
		sendAction(world.ui.myHeroId, { type: "move", target });
	}

	nextTarget = target; // Set for next keyboard event
	return true;
}

export function gameKeyDown(e: KeyboardEvent) {
	if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
		if (!showedHelpText) {
			showedHelpText = true;
			notify([{ type: "help" }]);
		}
	}

	if (!world.ui.myHeroId) { return; }

	const hero = world.objects.get(world.ui.myHeroId);
	if (!hero || hero.category !== "hero") { return; }

	const key = readKey(e);

	const spellId = hero.keysToSpells.get(key);
	if (!spellId) { return }

	const spell = Spells.all[spellId];
	if (!spell) { return; }

	sendAction(world.ui.myHeroId, { type: spell.id, target: nextTarget });
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
export function attachToSocket(_socket: SocketIOClient.Socket, playerName: string, keyBindings: c.KeyBindings, observe?: string) {
	socket = _socket;
	socket.on('connect', () => {
		console.log("Connected as socket " + socket.id);
		if (!world.ui.myGameId) {
			if (observe) {
				socket.emit('watch', { gameId: observe, name: playerName } as m.WatchMsg);
			} else {
				socket.emit('join', { name: playerName, keyBindings } as m.JoinMsg);
			}
		}
	});
	socket.on('disconnect', () => {
		console.log("Disconnected");
		onDisconnectMsg();
	});
	socket.on('hero', onHeroMsg);
	socket.on('tick', onTickMsg);
	socket.on('watch', onWatchMsg);
}
function onHeroMsg(data: m.HeroMsg) {
	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;
	console.log("Joined game " + world.ui.myGameId + " as hero id " + world.ui.myHeroId);

	if (data.history) {
		tickQueue = [...data.history, ...tickQueue];
	}

	world.ui.notifications.push({
		type: "myHero",
		gameId: world.ui.myGameId,
		heroId: world.ui.myHeroId,
	});
}
function onTickMsg(data: m.TickMsg) {
	tickQueue.push(data);
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
	});

	let replayQueue = [...data.history];
	const interval = setInterval(() => {
		if (replayQueue.length > 0) {
			onTickMsg(replayQueue.shift());
		} else {
			clearInterval(interval);
		}
	}, 1000.0 / TicksPerSecond);
}
function onDisconnectMsg() {
	world.activePlayers.clear();
}
function sendAction(heroId: string, action: w.Action) {
	socket.emit('action', {
		heroId: heroId,
		actionType: action.type,
		targetX: action.target.x,
		targetY: action.target.y,
	} as m.ActionMsg);
}
function applyTickActions(tickData: m.TickMsg, world: w.World) {
	tickData.actions.forEach(actionData => {
		if (actionData.actionType === "join") {
			world.joinLeaveEvents.push({
				type: "join",
				heroId: actionData.heroId,
				playerName: actionData.playerName || "Enigma",
				keyBindings: actionData.keyBindings,
			});
		} else if (actionData.actionType === "leave") {
			world.joinLeaveEvents.push({
				type: "leave",
				heroId: actionData.heroId,
			});
		} else {
			world.actions.set(actionData.heroId, { type: actionData.actionType, target: pl.Vec2(actionData.targetX, actionData.targetY) });
		}
	});
}
