import socketLib from 'socket.io-client';
import pl from 'planck-js';
import * as constants from './constants';
import { Spells } from './constants';
import { render, calculateWorldRect } from './render';
import { world } from './engine';
import * as model from './engine';
const socket = socketLib();

let MaxTickBuffer = 5;

let tickQueue = [];
let nextTarget = null;

attachToSocket(socket);
window.requestAnimationFrame(frame);

// Facade
export function attach() {
	var canvas = document.getElementById("canvas") as HTMLCanvasElement;
	fullScreenCanvas();

	canvas.onmousemove = canvasMouseMove;
	canvas.onmousedown = canvasMouseMove;
	window.onkeydown = gameKeyDown;
	window.onresize = fullScreenCanvas;

	canvas.oncontextmenu = function (e) {
			e.preventDefault();
	};

	function fullScreenCanvas() {
		canvas.width = document.body.clientWidth;
		canvas.height = document.body.clientHeight;
	}
}

function frame() {
	let canvas = document.getElementById('canvas');

	if (tickQueue.length > 0 && tickQueue[0].tick <= world.tick) {
		do {
			let tickData = tickQueue.shift();
			if (tickData.tick < world.tick) {
				continue; // Received the same tick multiple times, skip over it
			}

			applyTickActions(tickData, world);
			model.tick(world);
		} while (tickQueue.length >= MaxTickBuffer);
	}
	render(world, canvas);

	window.requestAnimationFrame(frame);
}

function canvasMouseMove(e) {
	let rect = e.target.getBoundingClientRect();
	let worldRect = calculateWorldRect(rect);
	let target = pl.Vec2((e.clientX - rect.left - worldRect.left) / worldRect.width, (e.clientY - rect.top - worldRect.top) / worldRect.height);

	if (e.buttons || e.button) {
		sendAction(world.ui.myHeroId, { type: "move", target });
	}

	nextTarget = target; // Set for next keyboard event
	return true;
}

function gameKeyDown(e) {
	for (let id in Spells.all) {
		let spell = Spells.all[id];
		if (spell.key === e.key) {
			sendAction(world.ui.myHeroId, { type: spell.id, target: nextTarget });
		}
	}
}

// Sockets
function attachToSocket(socket) {
	socket.on('connect', () => {
		console.log("Connected as socket " + socket.id);
		if (!world.ui.myGameId) {
			socket.emit('join', {});
		}
	});
	socket.on('disconnect', () => {
		console.log("Disconnected");
		onDisconnectMsg();
	});
	socket.on('hero', onHeroMsg);
	socket.on('tick', onTickMsg);
}
function onHeroMsg(data) {
	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;
	console.log("Joined game with " + data.numPlayers + " players as hero id " + world.ui.myHeroId);

	if (data.history) {
		tickQueue = [...data.history, ...tickQueue];
	}
}
function onTickMsg(data) {
	tickQueue.push(data);
}
function onDisconnectMsg() {
	world.activePlayers.clear();
}
function sendAction(heroId, action) {
	socket.emit('action', {
		heroId: heroId,
		actionType: action.type,
		targetX: action.target.x,
		targetY: action.target.y,
	});
}
function applyTickActions(tickData, world) {
	tickData.actions.forEach(actionData => {
		if (actionData.actionType === "join") {
			world.joining.push(actionData.heroId);
		} else if (actionData.actionType === "leave") {
			world.leaving.push(actionData.heroId);
		}else {
			world.actions.set(actionData.heroId, { type: actionData.actionType, target: pl.Vec2(actionData.targetX, actionData.targetY) });
		}
	});
}
