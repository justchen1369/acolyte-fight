import pl from 'planck-js';
import { Spells } from '../game/constants';
import { render, calculateWorldRect } from './render';
import * as engine from './engine';
import * as m from '../game/messages.model';
import * as w from './world.model';

let socket: SocketIOClient.Socket = null;
let tickQueue = new Array<m.TickMsg>();
let world = engine.initialWorld();

let nextTarget: pl.Vec2 = null;

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
	for (let id in Spells.all) {
		let spell = Spells.all[id];
		if (spell.key === e.key) {
			sendAction(world.ui.myHeroId, { type: spell.id, target: nextTarget });
		}
	}
}

// Sockets
export function attachToSocket(_socket: SocketIOClient.Socket) {
	socket = _socket;
	socket.on('connect', () => {
		console.log("Connected as socket " + socket.id);
		if (!world.ui.myGameId) {
			socket.emit('join', {} as m.JoinMsg);
		}
	});
	socket.on('disconnect', () => {
		console.log("Disconnected");
		onDisconnectMsg();
	});
	socket.on('hero', onHeroMsg);
	socket.on('tick', onTickMsg);
}
function onHeroMsg(data: m.HeroMsg) {
	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;
	console.log("Joined game with " + data.numPlayers + " players as hero id " + world.ui.myHeroId);

	if (data.history) {
		tickQueue = [...data.history, ...tickQueue];
	}
}
function onTickMsg(data: m.TickMsg) {
	tickQueue.push(data);
}
function onDisconnectMsg() {
	world.activePlayers.clear();
}
function sendAction(heroId: string, action: w.WorldAction) {
	socket.emit('action', {
		heroId: heroId,
		actionType: action.type,
		targetX: action.target.x,
		targetY: action.target.y,
	} as m.ActionMsg);
}
function applyTickActions(tickData, world) {
	tickData.actions.forEach(actionData => {
		if (actionData.actionType === "join") {
			world.joining.push(actionData.heroId);
		} else if (actionData.actionType === "leave") {
			world.leaving.push(actionData.heroId);
		} else {
			world.actions.set(actionData.heroId, { type: actionData.actionType, target: pl.Vec2(actionData.targetX, actionData.targetY) });
		}
	});
}
