var socket = io();
var pl = planck;

var HeroColors = [
	"#bfad8f",
	"#7db37d",
	"#d0c16b",
	"#6d89cc",
	"#cb8fc1",
	"#56b5bf",
	"#a69a7c",
	"#557e6c",
	"#a18e4c",
	"#41569e",
	"#9d6d95",
	"#2bafca",
];
var MyHeroColor = '#00ccff';

var TicksPerSecond = 60;
var MoveSpeedPerTick = 0.12 / TicksPerSecond;
var HeroRadius = 0.01;
var HeroDensity = 1;
var HeroMaxDamping = 5;
var HeroMinDamping = 0.25;
var HeroMaxHealth = 100;

var AllCategories = 0xFFFF;
var HeroCategory = 1;
var ProjectileCategory = 2;

var LavaDamagePerTick = 0.25;
var ShrinkPerTick = 0.00005;

var Pixel = 0.001;
var MaxTickBuffer = 5;
var HealthBarRadius = HeroRadius * 0.9;
var HealthBarHeight = Pixel * 3;
var HealthBarMargin = Pixel * 2;
var ChargingIndicatorMargin = Pixel * 5;
var ChargingIndicatorWidth = Pixel * 2;

var ButtonSpacing = 10;
var ButtonMargin = 5;
var ButtonSize = 50;

function loadImage(path) {
	var img = new Image();
	img.src = path;
	return img;
}

var Icons = {
	thunderball: new Path2D("M22.03 16.844l147 158.125 37.75-14.626 6.75 17.437-110.25 42.72 209.564 230.53.187.25c18.074 22.833 46.023 37.5 77.314 37.5 54.318 0 98.562-44.243 98.562-98.56 0-43.636-28.55-80.77-67.937-93.69l-132.095-73.56-56.75 23.968-7.28-17.22 43.31-18.28-.186-.094 102.624-43.28L22.03 16.843zm368.314 293.5c44.218 0 79.875 35.656 79.875 79.875 0 7.866-1.146 15.45-3.25 22.624L446.155 409l4.688-39.656-22.78 54.22 32.467 4.873c-5.74 10.555-13.776 19.644-23.467 26.625l-51-24.75 37.312-44.78-79.594-40.626 53.064 47.25-43.97 36.47 42.72 41.312c-1.736.11-3.486.156-5.25.156-44.22 0-79.875-35.657-79.875-79.875 0-1.48.045-2.95.124-4.408l30.562 11.47-6.5 25.562 27.75-34.938-49.437-17.72c6.807-26.514 26.865-47.622 52.717-55.967l24.5 35.217 51.438-5.218-41.75-8.72-17.688-24.75c2.68-.27 5.404-.406 8.157-.406z"),
	boltSaw: new Path2D("M118.262 17.338l-.004.002 14.6 33.287L34.74 64.645l46.723 45.552L14.3 183.783l43.804 16.936-9.344 105.706 48.474-8.176 51.393 121.475 26.28-29.786 95.197 94.61 2.335-36.208 112.714 44.967-19.27-43.218 104.538-15.184-42.633-40.883 66.577-72.418-50.224-19.27 8.76-106.876-52.56 8.76L348.946 81.58l-25.695 29.785-89.354-88.77-2.337 39.714-113.298-44.97zm144.8 100.435l52.75 54.9 10.428-26.282 25.125 84.682 19.008-13.43-14.63 63.073 35.02-2.336-50.077 50.225 36.066 17.518.006-.002-.002.005-.004-.002-63.086 14.6 17.443 24.53-79.653-25.698 4.516 32.123-51.422-53.147-11.575 28.618-24.38-82.93-26.116 18.688 17.448-74.754-37.942 2.336 49.354-49.64-35.043-16.938 72.998-16.935-19.215-26.866 76.87 25.113-3.89-27.45zm-23.345 95.846c-14.81 0-18.424 16.9-8.074 37.75 10.35 20.848 30.742 37.747 45.55 37.747 14.81 0 18.424-16.9 8.075-37.748-10.35-20.85-30.742-37.75-45.55-37.75z"),
	lightningHelix: new Path2D("M20.72 19.344v39.718l130.843 73.813L246.5 87.78l-95.53-68.436H20.72zm196.936.093L313 76.78l-45.5 21.657.03.063-96.03 45.625h-.03l-113.94 54.22 161.532 86.093 59.594-39.25-39.344-34.844 26.375-13.094.094.063 78.94-39.157-.095-.062 136.5-67.72L387.47 19.44H217.655zM361.936 170.5l-76.498 37.906 44.812 25.28-37.03 24.376-.064-.062-55.312 36.438.062.03-68.25 44.938 325.281 154.75L307.47 347l9.31-5.22-.03-.03 43.563-24.313-.032-.03 115.97-65.032L361.937 170.5zm13.19 160.063l-33.97 18.968 139.313 74.22-105.345-93.188z"),
	meteorImpact: new Path2D("M63.813 18.156L166.72 231.75l.436-.22c19.154 38.026 58.547 64.19 103.938 64.19 64.132 0 116.344-52.204 116.344-116.345 0-13.892-2.45-27.23-6.938-39.594l.25-.093-1.875-4.125c-1.206-2.955-2.532-5.827-3.97-8.656-.072-.145-.143-.292-.217-.437L325.156 18.155h-20.53l28.812 63.032c-9.563-6.095-20.072-10.8-31.25-13.907l-22.47-49.124h-20.5l20.657 45.22c-2.9-.22-5.828-.345-8.78-.345-6.296 0-12.474.502-18.5 1.47l-21.22-46.344h-20.53l23.28 50.907c-7.435 2.5-14.537 5.745-21.22 9.624l-27.686-60.53h-20.532L197.313 89.5c-7.408 6.096-14.07 13.09-19.782 20.813l-42.155-92.157h-20.5l51.03 111.656c-5.242 11.087-8.81 23.124-10.31 35.782L84.562 18.156h-20.75zm428.937 228.75l-65.406 3.22 17.687 19.186 47.72 36.594v-59zM20.53 266.28v68.5l72.376-35.842 39.5-26.344L20.53 266.28zm387 6.47l33.97 64 51.22 61.75.03-69.063-57.5-44.093-27.72-12.594zm-39.5 25.656l29.595 103.5.125-.062 41.875 92.72 53.094-.002v-66.75l-62.25-75.062-62.44-54.344zm-232.467 2.938l-19.25 6.844-95.782 47.468v98.125l84.345-103.655.03.03 30.657-48.81zm177.218 3.53l-.28 112.376 10.156 77.313h96.47l-38.407-85.032.092-.03-68.03-104.625zm-54.342 8.876L224.5 416.594l-10.25 77.97 89.53-.002-11.03-84.062-34.313-96.75zm-94.657 1.625L93.47 393.75l-71.064 87.313-1.875-1.532v15.033h81.94l40.5-104.063 20.81-75.125zm36.126 4.875l-35.062 65.563-.063.156-42.25 108.592h72.845l10.03-76.187-5.5-98.125z"),
	deadlyStrike: new Path2D("M196.38 16.29l12.018 214.677-69.382-213.75h-19.65l70.52 217.25c-17.16-18.22-34.434-44.74-52.243-80.246 18.864 62.058 35.573 139.067 40.552 192.04L19.38 62.393v38.277l144.89 258.98c-33.493-21.316-67.86-56.375-97.918-92.87 26.712 52.73 55.26 104.847 73.076 160.54L19.378 289.453v28.46l107.997 124.026C99 434.69 70.625 422.05 42.25 408.165c38.03 26.607 62.036 50.897 84.234 85.82H230.84l-6.785-91.082H197.77c0-44.845 2.87-108.728 40.767-115.86-6.993-8.433-11.533-20.27-11.533-33.523 0-23.93 14.228-43.758 32.45-46.127h.005c.303-.038.61-.056.923-.063.934-.02 1.895.063 2.83.063 19.957 0 36.205 20.602 36.205 46.128 0 12.928-4.304 24.595-10.996 32.99 41.4 6.42 40.496 71.424 40.496 116.394h-24.94l-6.003 91.082h90.96c19.418-30.77 60.864-56.727 96.524-75.234-38.585 10.67-75.927 17.602-109.66 21.02l117.97-86.97v-23.218l-125.78 92.728c24.4-49.363 55.902-88.075 90.164-122.648-40.56 27.323-73.25 37.7-107.027 43.785L493.77 158.7v-30.58L339.297 328.19c1.19-51.24 16.946-114.427 39.156-171.047-17.383 25.054-33.876 46.073-49.713 62.742l56.406-202.668h-19.398l-53.412 191.906 3.832-192.834h-119.79z"),
	teleport: new Path2D("M249.334 22.717c-18.64 2.424-35.677 23.574-37.043 51.49v.02c-.057 1.186-.097 2.38-.097 3.59 0 16.362 5.658 30.827 13.942 40.818l10.127 12.213-15.592 2.933c-10.75 2.025-18.622 7.702-25.373 16.978-2.285 3.14-4.384 6.707-6.31 10.62-57.54-6.44-97.91-21.06-97.91-37.952 0-17.363 42.647-31.983 102.75-37.97-.213-2.51-.323-5.057-.323-7.636v-.002c0-.84.024-1.674.047-2.51-96.43 6.77-167.298 29.15-167.3 55.71-.002 25.33 64.462 46.86 154.074 54.67-.19.742-.394 1.465-.576 2.216-2.36 9.72-4.05 20.22-5.268 31.03-.01 0-.02 0-.03.002-.418 3.653-.78 7.34-1.095 11.046l.05-.005c-1.316 15.777-1.772 31.88-1.893 46.95h35.894l2.115 28.4c-68.24-4.994-118.444-21.004-118.444-39.843 0-13.243 24.83-24.89 63.27-32.33.3-4.056.66-8.115 1.076-12.162-76.42 9.353-129.17 29.168-129.172 52.086-.002 28.17 79.71 51.643 185.098 56.768l5.94 79.77c10.5 2.648 24.84 4.162 39.017 4.068 13.79-.092 27.235-1.71 36.45-4l5.263-79.846c105.308-5.14 184.935-28.605 184.935-56.76 0-23.013-53.196-42.895-130.13-52.2.304 4.02.557 8.047.755 12.07 38.883 7.43 63.965 19.17 63.965 32.536 0 18.84-49.804 34.85-117.908 39.844l1.87-28.402h34.18c-.012-15.113-.127-31.27-1.033-47.094.01 0 .02.002.032.004-.214-3.687-.472-7.352-.782-10.986l-.02-.002c-.94-11.157-2.367-21.984-4.546-31.967-.09-.405-.184-.803-.275-1.206 89.518-7.826 153.893-29.344 153.893-54.656 0-26.787-72.076-49.332-169.77-55.887.025.895.053 1.788.053 2.688 0 2.5-.104 4.97-.304 7.407 61.19 5.836 104.61 20.61 104.61 38.2 0 16.805-39.633 31.355-96.524 37.848-2.01-4.283-4.26-8.15-6.762-11.505-6.83-9.167-15.063-14.81-27.14-16.682l-15.913-2.47 10.037-12.59c6.928-8.69 11.912-20.715 13.057-34.268h.002c.163-1.95.25-3.93.25-5.938 0-.77-.022-1.532-.048-2.29-.015-.48-.033-.958-.057-1.434h-.002c-1.48-29.745-20.507-51.3-41.076-51.3-2.528 0-3.966-.087-4.03-.08h-.003zM194.54 355.822c-97.11 6.655-168.573 29.11-168.573 55.8 0 31.932 102.243 57.815 228.367 57.815S482.7 443.555 482.7 411.623c0-26.608-71.02-49.004-167.67-55.736l-.655 9.93c60.363 6.055 103.074 20.956 103.074 38.394 0 22.81-73.032 41.298-163.12 41.298-90.088 0-163.12-18.49-163.12-41.297 0-17.533 43.18-32.502 104.07-38.493l-.74-9.895z"),
	divert: new Path2D("M237.688 20.25L18.344 288.344l174.625 63.094c-8.217 8.152-18.068 15.154-29.876 20.78L276.5 399.282c-10.966 11.894-24.456 22.08-41 30.22l125.563 12.406c-16.877 21.158-38.8 38.795-67.063 52.03l204.688-29.623L412.5 273.125c-1.632 34.214-5.993 66.51-14.688 95.813L320 270.03c-1.03 21.615-3.57 42.188-8.438 61.22l-80.843-72.47c-1.363 11.97-3.38 23.5-6.25 34.408l-45.94-28.657L496.69 20.25h-90.75l-284.72 250.844 158.313 87.03-211.655-76.78L318.5 20.25h-80.813z"),
	shield: new Path2D("M256 16c25 24 100 72 150 72v96c0 96-75 240-150 312-75-72-150-216-150-312V88c50 0 125-48 150-72z"),
}

var Spells = {
	move: {
		id: 'move',
		cooldown: 0,
		action: moveAction,
	},
	fireball: {
		id: 'fireball',
		density: 25,
		radius: 0.005,
		speed: 0.4,
		chargeTicks: 0,
		maxTicks: 1 * TicksPerSecond,
		cooldown: 1 * TicksPerSecond,
		damage: 10,
		explodesOnImpact: true,

		key: 'q',
		icon: Icons.thunderball,

		trailTicks: 30,
		fillStyle: '#ff8800',

		action: spawnProjectileAction,
		render: renderProjectile,
	},
	meteor: {
		id: 'meteor',
		density: 10000,
		radius: 0.03,
		speed: 0.2,
		chargeTicks: 0.1 * TicksPerSecond,
		maxTicks: 12 * TicksPerSecond,
		cooldown: 12 * TicksPerSecond,
		damage: 1,

		key: 'r',
		icon: Icons.meteorImpact,

		trailTicks: 15,
		fillStyle: '#ff0000',

		action: spawnProjectileAction,
		render: renderProjectile,
	},
	lightning: {
		id: 'lightning',
		density: 3,
		radius: 0.0025,
		speed: 3.0,
		chargeTicks: 0,
		maxTicks: 0.5 * TicksPerSecond,
		cooldown: 10 * TicksPerSecond,
		damage: 1,
		explodesOnImpact: true,

		key: 'w',
		icon: Icons.lightningHelix,

		trailTicks: 30,
		fillStyle: '#00ddff',

		action: spawnProjectileAction,
		render: renderRay,
	},
	homing: {
		id: 'homing',
		density: 25,
		radius: 0.003,
		speed: 0.15,
		chargeTicks: 0,
		maxTicks: 6.0 * TicksPerSecond,
		cooldown: 20 * TicksPerSecond,
		damage: 20,
		turnRate: 0.05,
		explodesOnImpact: true,

		key: 'e',
		icon: Icons.boltSaw,

		trailTicks: 30,
		fillStyle: '#44ffcc',

		action: spawnProjectileAction,
		render: renderProjectile,
	},
	bouncer: {
		id: 'bouncer',
		density: 2,
		radius: 0.001,
		speed: 0.75,
		chargeTicks: 0,
		maxTicks: 3.0 * TicksPerSecond,
		cooldown: 10 * TicksPerSecond,
		damage: 2,
		turnRate: 0.025,
		explodesOnImpact: true,
		bounceDamage: 0.95,

		key: 'd',
		icon: Icons.divert,

		trailTicks: 1.0 * TicksPerSecond,
		fillStyle: '#88ee22',

		action: spawnProjectileAction,
		render: renderRay,
	},
	scourge: {
		id: 'scourge',
		radius: HeroRadius * 5,
		chargeTicks: 0.5 * TicksPerSecond,
		maxTicks: 1,
		cooldown: 10 * TicksPerSecond,
		damage: 20,
		selfDamage: 10,
		minImpulseMagnitude: 0.0002,
		maxImpulseMagnitude: 0.0005,

		key: 'f',
		icon: Icons.deadlyStrike,

		trailTicks: 30,
		fillStyle: '#ddbb00',

		action: scourgeAction,
	},
	shield: {
		id: 'shield',
		mass: 100000,
		chargeTicks: 0,
		maxTicks: 1 * TicksPerSecond,
		cooldown: 20 * TicksPerSecond,
		radius: HeroRadius * 2,

		key: 'x',
		icon: Icons.shield,

		fillStyle: '#3366ff',

		action: shieldAction,
	},
	teleport: {
		id: 'teleport',
		maxRange: 0.35,
		chargeTicks: 3,
		cooldown: 15 * TicksPerSecond,

		key: 'z',
		icon: Icons.teleport,

		fillStyle: '#6666ff',

		action: teleportAction,
	},
};

var world = {
	tick: 0,

	numPlayers: 0,
	joining: [],
	leaving: [],
	activePlayers: new Set(),

	objects: new Map(),
	physics: planck.World(),
	actions: new Map(),
	radius: 0.4,

	collisions: [],
	destroyed: [],

	nextHeroId: 0,
	nextBulletId: 0,

	trails: [],
};
world.physics.on('post-solve', onCollision);

var ui = {
	buttons: [
		"teleport",
		"shield",
		null,
		"fireball",
		"lightning",
		"homing",
		"meteor",
		null,
		"bouncer",
		"scourge",
		// "shield",
	],
	target: pl.Vec2(0.5, 0.5),
};

var tickQueue = [];
var tickFuture = [];

var myGameId = null;
var myHeroId = null;

attachToSocket(socket);
window.requestAnimationFrame(frame);

// Facade
function frame() {
	var canvas = document.getElementById('canvas');

	if (tickQueue.length > 0 && tickQueue[0].tick <= world.tick) {
		do {
			var tickData = tickQueue.shift();
			if (tickData.tick < world.tick) {
				continue; // Received the same tick multiple times, skip over it
			}

			applyTickActions(tickData, world);
			tick(world);
		} while (tickQueue.length >= MaxTickBuffer);
	}
	render(world, canvas);

	window.requestAnimationFrame(frame);
}

function canvasMouseMove(e) {
	var rect = e.target.getBoundingClientRect();
	var worldRect = calculateWorldRect(rect);
	var target = pl.Vec2((e.clientX - rect.left - worldRect.left) / worldRect.width, (e.clientY - rect.top - worldRect.top) / worldRect.height);

	if (e.buttons || e.button) {
		sendAction(myHeroId, { type: "move", target });
	}

	ui.target = target; // Set for next keyboard event
	return true;
}

function gameKeyDown(e) {
	for (var id in Spells) {
		var spell = Spells[id];
		if (spell.key === e.key) {
			sendAction(myHeroId, { type: spell.id, target: ui.target });
		}
	}
}

// Sockets
function attachToSocket(socket) {
	socket.on('connect', () => {
		console.log("Connected as socket " + socket.id);
		if (!myGameId) {
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
	myGameId = data.gameId;
	myHeroId = data.heroId;
	console.log("Joined game with " + data.numPlayers + " players as hero id " + myHeroId);

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

// Model
function nextHeroPosition(world) {
	var nextHeroIndex = world.numPlayers;
	var numHeroes = world.numPlayers + 1;
	var radius = 0.25;
	var center = new pl.Vec2(0.5, 0.5);

	var angle = 2 * Math.PI * nextHeroIndex / numHeroes;
	var pos = vectorPlus(vectorMultiply(pl.Vec2(Math.cos(angle), Math.sin(angle)), radius), center);
	return pos;
}

function addHero(world, position, heroId) {
	var body = world.physics.createBody({
		userData: heroId,
		type: 'dynamic',
		position,
		linearDamping: HeroMaxDamping,
	});
	body.createFixture(pl.Circle(HeroRadius), {
		filterCategoryBits: HeroCategory,
		density: HeroDensity,
		restitution: 0.1,
	});

	var hero = {
		id: heroId,
		type: "hero",
		health: HeroMaxHealth,
		body,
		charging: {},
		cooldowns: {},
		fillStyle: HeroColors[world.numPlayers % HeroColors.length],
	};
	world.objects.set(heroId, hero);

	++world.numPlayers;

	return hero;
}

function deactivateHero(world, heroId) {
	world.objects.forEach(obj => {
		if (obj.type === "hero" && obj.id === heroId) {
			obj.fillStyle = '#666666';
		}
	});
}

function cooldownRemaining(world, hero, spell) {
	var next = hero.cooldowns[spell] || 0;
	return Math.max(0, next - world.tick);
}

function setCooldown(world, hero, spell, waitTime) {
	hero.cooldowns[spell] = world.tick + waitTime;
}

function addProjectile(world, hero, target, spell) {
	var id = spell.id + (world.nextBulletId++);

	var from = hero.body.getPosition();
	var position = vectorTowards(from, target, HeroRadius + spell.radius + Pixel);
	var velocity = vectorDirection(target, from, spell.speed);

	var body = world.physics.createBody({
		userData: id,
		type: 'dynamic',
		position,
		linearVelocity: velocity,
		linearDamping: 0,
		bullet: true,
	});
	body.createFixture(pl.Circle(spell.radius), {
		filterCategoryBits: ProjectileCategory,
		filterMaskBits: AllCategories ^ (spell.passthrough ? ProjectileCategory : 0),
		density: spell.density,
		restitution: 1.0,
	});

	var enemy = findNearest(world.objects, target, x => x.type === "hero" && x.id !== hero.id);

	var projectile = {
		id,
		owner: hero.id,
		type: spell.id,
		body,
		uiPreviousPos: vectorClone(position), // uiPreviousPos is only used for the UI and not guaranteed to be sync'd across clients!
		expireTick: world.tick + spell.maxTicks,
		bullet: true,
		targetId: enemy ? enemy.id : null,
	};
	world.objects.set(id, projectile);

	return projectile;
}

// Simulator
function tick(world) {
	++world.tick;
	world.destroyed = [];

	handlePlayerJoinLeave(world);

	var newActions = new Map();
	world.objects.forEach(hero => {
		if (hero.type !== "hero") { return; }
		var action = world.actions.get(hero.id);
		var completed = performHeroActions(world, hero, action);
		if (action && !completed) {
			newActions.set(hero.id, action);
		}
	});
	world.actions = newActions;

	physicsStep(world);

	if (world.collisions.length > 0) {
		handleCollisions(world, world.collisions);
	}
	world.collisions = [];

	homingForce(world);
	decayShields(world);
	applyLavaDamage(world);
	shrink(world);
	updateKnockback(world);

	reap(world);
}

function physicsStep(world) {
	world.objects.forEach(obj => {
		if (obj.step) {
			obj.body.setLinearVelocity(vectorPlus(obj.body.getLinearVelocity(), obj.step));
		}
	});

	world.physics.step(1.0 / TicksPerSecond);

	world.objects.forEach(obj => {
		if (obj.step) {
			obj.body.setLinearVelocity(vectorDiff(obj.step, obj.body.getLinearVelocity())); // Why is this backwards? I don't know, but it works.
			obj.step = null;
		}
	});
}

function handlePlayerJoinLeave(world) {
	if (world.joining.length > 0) {
		world.joining.forEach(heroId => {
			console.log("Player joined:", heroId);
			var hero = find(world.objects, x => x.id === heroId);
			if (!hero) {
				hero = addHero(world, nextHeroPosition(world), heroId);
			}
			world.activePlayers.add(heroId);
		});
		world.joining = [];
	}

	if (world.leaving.length > 0) {
		world.leaving.forEach(heroId => {
			console.log("Player left:", heroId);
			world.activePlayers.delete(heroId);
		});
		world.leaving = [];
	}
}

function performHeroActions(world, hero, nextAction) {
	if (hero.charging && hero.charging.action) {
		var chargingAction = hero.charging.action;
		var chargingSpell = Spells[chargingAction.type];
		hero.charging.proportion += 1.0 / chargingSpell.chargeTicks;
		if (hero.charging.proportion < 1.0) {
			return false; // Blocked charging, cannot perform action
		} else {
			hero.charging = {};
			applyAction(world, hero, chargingAction, chargingSpell);
			return false; // Cannot perform new action, handling charging action
		}
	} else if (!nextAction) {
		// Nothing to do
		return true;
	} else {
		var nextSpell = Spells[nextAction.type];
		if (!nextAction) {
			return true;
		}

		if (nextSpell.cooldown) {
			if (cooldownRemaining(world, hero, nextSpell.id) > 0) {
				return false; // Cannot perform action, waiting for cooldown
			}
		}

		if (nextSpell.chargeTicks > 0) {
			hero.charging = { spell: nextSpell.id, proportion: 0.0, action: nextAction };
			return true; // Action now charging
		} else {
			return applyAction(world, hero, nextAction, nextSpell); // Performed action immediately without charging
		}
	}
}

function applyAction(world, hero, action, spell) {
	if (spell.cooldown) {
		setCooldown(world, hero, spell.id, spell.cooldown);
	}

	return spell.action(world, hero, action, spell);
}

function onCollision(contact) {
	var objA = world.objects.get(contact.getFixtureA().getBody().getUserData());
	var objB = world.objects.get(contact.getFixtureB().getBody().getUserData());
	if (objA.type === "hero" && objB.bullet) {
		world.collisions.push({ hero: objA, projectile: objB });
	} else if (objA.bullet && objB.type === "hero") {
		world.collisions.push({ hero: objB, projectile: objA });
	} else if (objA.bullet && objB.bullet) {
		world.collisions.push({ projectile: objA, other: objB });
		world.collisions.push({ projectile: objB, other: objA });
	}
}

function handleCollisions(world, collision) {
	world.collisions.forEach(collision => {
		if (collision.projectile) {
			var spell = Spells[collision.projectile.type];
			if (collision.hero && collision.hero.shieldTicks > 0) {
				var heroPos = collision.hero.body.getPosition();
				var currentPos = collision.projectile.body.getPosition();
				var currentVelocity = collision.projectile.body.getLinearVelocity();
				var speed = spell.speed || vectorLength(currentVelocity); // Return to initial speed because collision will absorb speed
				var newVelocity = vectorMultiply(vectorUnit(vectorDiff(currentPos, heroPos)), speed);
				collision.projectile.body.setLinearVelocity(newVelocity);

				if (spell.maxTicks) {
					collision.projectile.expireTick = world.tick + spell.maxTicks; // Make the spell last longer
				}

				if (collision.projectile.owner !== collision.hero.id) { // Stop double redirections cancelling out
					// Redirect back to owner
					collision.projectile.targetId = collision.projectile.owner;
					collision.projectile.owner = collision.hero.id;
				}
			} else {
				if (collision.hero && !(collision.hero.id == collision.projectile.owner) && !collision.hero.shield) {
					collision.hero.health -= spell.damage * (collision.projectile.damageMultiplier || 1.0);
				}
				if (spell.bounceDamage && collision.hero) { // Only bounce off heroes, not projectiles
					bounceToNext(collision.projectile, collision.hero || collision.other, spell, world);
				} else if (spell.explodesOnImpact) {
					destroyObject(world, collision.projectile);
				}
			}
		}
	});
}

function find(objects, predicate) {
	var found = null;
	objects.forEach(x => {
		if (predicate(x)) {
			found = x;
		}
	});
	return found;
}

function findNearest(objects, target, predicate) {
	var nearestDistance = Infinity;
	var nearest = null;
	objects.forEach(obj => {
		if (!predicate(obj)) {
			return;
		}

		var distance = vectorDistance(target, obj.body.getPosition());
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearest = obj;
		}
	});
	return nearest;
}

function bounceToNext(projectile, hit, spell, world) {
	var nextTarget = findNearest(
		world.objects,
		projectile.body.getPosition(),
		x => x.type === "hero" && x.id !== hit.id);
	if (!nextTarget) {
		return;
	}

	projectile.targetId = nextTarget.id;

	var newDirection = vectorUnit(vectorDiff(nextTarget.body.getPosition(), projectile.body.getPosition()));
	var newVelocity = vectorMultiply(newDirection, spell.speed);
	projectile.body.setLinearVelocity(newVelocity);

	projectile.damageMultiplier = (projectile.damageMultiplier || 1.0) * spell.bounceDamage;
}

function homingForce(world) {
	world.objects.forEach(obj => {
		if (!(obj.bullet && obj.targetId)) {
			return;
		}

		var spell = Spells[obj.type];
		if (!(spell && spell.turnRate)) {
			return;
		}

		var target = find(world.objects, x => x.id === obj.targetId);
		if (target) {
			var currentSpeed = vectorLength(obj.body.getLinearVelocity());
			var currentDirection = vectorUnit(obj.body.getLinearVelocity());
			var idealDirection = vectorUnit(vectorDiff(target.body.getPosition(), obj.body.getPosition()));
			var newDirection = vectorUnit(vectorPlus(currentDirection, vectorMultiply(idealDirection, spell.turnRate)));
			var newVelocity = vectorMultiply(newDirection, currentSpeed);
			obj.body.setLinearVelocity(newVelocity);
		}
	});
}

function decayShields(world) {
	world.objects.forEach(obj => {
		if (obj.type === "hero" && obj.shieldTicks > 0) {
			--obj.shieldTicks;
			if (obj.shieldTicks === 0) {
				obj.body.resetMassData();
			}
		}
	});
}

function updateKnockback(world) {
	world.objects.forEach(obj => {
		if (obj.type === "hero") {
			var damping = HeroMinDamping + (HeroMaxDamping - HeroMinDamping) * obj.health / HeroMaxHealth;
			obj.body.setLinearDamping(damping);
		}
	});
}

function applyLavaDamage(world) {
	world.objects.forEach(obj => {
		if (obj.type === "hero") {
			var position = obj.body.getPosition();
			if (vectorDistance(position, pl.Vec2(0.5, 0.5)) > world.radius) {
				obj.health -= LavaDamagePerTick;
			}
		}
	});
}

function shrink(world) {
	world.radius = Math.max(0, world.radius - ShrinkPerTick);
}

function reap(world) {
	world.objects.forEach(obj => {
		if (obj.type === "hero") {
			if (obj.health <= 0) {
				destroyObject(world, obj);
			}
		} else if (obj.bullet) {
			var pos = obj.body.getPosition();
			if (world.tick >= obj.expireTick || pos.x < 0 || pos.x > 1 || pos.y < 0 || pos.y > 1) {
				destroyObject(world, obj);
			}
		}
	});
}

function destroyObject(world, object) {
	world.objects.delete(object.id);
	world.physics.destroyBody(object.body);

	object.destroyed = true;
	world.destroyed.push(object);
}

function moveAction(world, hero, action, spell) {
	var current = hero.body.getPosition();
	var target = action.target;
	hero.step = vectorMultiply(vectorTruncate(vectorDiff(target, current), MoveSpeedPerTick), TicksPerSecond);

	return vectorDistance(current, target) < Pixel;
}

function spawnProjectileAction(world, hero, action, spell) {
	addProjectile(world, hero, action.target, spell);
	return true;
}

function teleportAction(world, hero, action, spell) {
	var currentPosition = hero.body.getPosition();
	var newPosition = vectorTowards(currentPosition, action.target, Spells.teleport.maxRange);
	hero.body.setPosition(newPosition);
	return true;
}

function scourgeAction(world, hero, action, spell) {
	hero.health -= spell.selfDamage;

	var heroPos = hero.body.getPosition();
	world.objects.forEach(obj => {
		if (obj.id === hero.id) { return; }

		var objPos = obj.body.getPosition();
		var diff = vectorDiff(objPos, heroPos);
		var proportion = 1.0 - (vectorLength(diff) / (spell.radius + HeroRadius)); // +HeroRadius because only need to touch the edge
		if (proportion <= 0.0) { return; } 

		if (obj.type === "hero") {
			obj.health -= spell.damage;
		}

		var magnitude = spell.minImpulseMagnitude + proportion * (spell.maxImpulseMagnitude - spell.minImpulseMagnitude);
		var impulse = vectorMultiply(vectorUnit(diff), magnitude);
		obj.body.applyLinearImpulse(impulse, vectorZero(), true);
	});

	world.trails.push({
		type: "circle",
		remaining: spell.trailTicks,
		max: spell.trailTicks, 
		pos: vectorClone(hero.body.getPosition()),
		fillStyle: 'white',
		radius: spell.radius,
	});

	return true;
}

function shieldAction(world, hero, action, spell) {
	hero.shieldTicks = spell.maxTicks;
	hero.body.setMassData({
		mass: Spells.shield.mass,
		center: vectorZero(),
		I: 0,
	});

	return true;
}


// Rendering
function render(world, canvas) {
	var rect = canvas.getBoundingClientRect();
	var ctx = canvas.getContext('2d');

	ctx.save();
	clearCanvas(ctx, rect);
	renderWorld(ctx, world, rect);
	renderInterface(ctx, world, rect);
	ctx.restore();
}

function clearCanvas(ctx, rect) {
	ctx.save();

	ctx.fillStyle = '#000000';
	ctx.beginPath();
	ctx.rect(0, 0, rect.width, rect.height);
	ctx.fill();

	ctx.restore();
}

function renderWorld(ctx, world, rect) {
	ctx.save();

	var worldRect = calculateWorldRect(rect);
	ctx.translate(worldRect.left, worldRect.top);
	ctx.scale(worldRect.width, worldRect.height);

	renderMap(ctx, world);

	world.objects.forEach(obj => renderObject(ctx, obj, world));
	world.destroyed.forEach(obj => renderDestroyed(ctx, obj, world));

	var newTrails = [];
	world.trails.forEach(trail => {
		var complete = true;
		complete = renderTrail(ctx, trail);
		if (!complete) {
			newTrails.push(trail);
		}
	});
	world.trails = newTrails;

	ctx.restore();
}

function renderObject(ctx, obj, world) {
	if (obj.type === "hero") {
		renderHero(ctx, obj, world);
	} else if (obj.type in Spells) {
		var spell = Spells[obj.type];
		spell.render(ctx, obj, world, spell);
	}
}

function renderDestroyed(ctx, obj, world) {
	var spell = Spells[obj.type];
	if (spell) {
		spell.render(ctx, obj, world, spell);
	}
}

function calculateWorldRect(rect) {
	var size = Math.min(rect.width, rect.height);
	return {
		left: (rect.width - size) / 2.0,
		top: (rect.height - size) / 2.0,
		width: size,
		height: size,
	};
}

function renderMap(ctx, world) {
	ctx.save();

	ctx.translate(0.5, 0.5);

	ctx.fillStyle = '#333333';
	ctx.beginPath();
	ctx.arc(0, 0, world.radius, 0, 2 * Math.PI);
	ctx.fill();

	ctx.restore();
}

function renderHero(ctx, hero, world) {
	if (hero.destroyed) {
		return;
	}

	var pos = hero.body.getPosition();

	ctx.save();
	ctx.translate(pos.x, pos.y);

	// Fill
	ctx.fillStyle = hero.fillStyle;
	if (!world.activePlayers.has(hero.id)) {
		ctx.fillStyle = '#666666';
	} else if (hero.id === myHeroId) {
		ctx.fillStyle = MyHeroColor;
	}
	ctx.beginPath();
	ctx.arc(0, 0, HeroRadius, 0, 2 * Math.PI);
	ctx.fill();

	// Charging
	if (hero.charging && hero.charging.spell && hero.charging.proportion > 0) {
		ctx.save();

		var spell = Spells[hero.charging.spell];
		ctx.globalAlpha = hero.charging.proportion;
		ctx.strokeStyle = spell.fillStyle;
		ctx.lineWidth = ChargingIndicatorWidth;
		ctx.beginPath();
		ctx.arc(0, 0, HeroRadius + ChargingIndicatorMargin, 0, 2 * Math.PI);
		ctx.stroke();

		ctx.restore();
	}

	// Shield
	if (hero.shieldTicks) {
		var spell = Spells.shield;
		var proportion = 1.0 * hero.shieldTicks / spell.maxTicks;

		ctx.save();

		ctx.globalAlpha = proportion;
		ctx.fillStyle = spell.fillStyle;
		ctx.beginPath();
		ctx.arc(0, 0, spell.radius, 0, 2 * Math.PI);
		ctx.fill();


		ctx.restore();
	}

	// Health bar
	ctx.fillStyle = 'black';
	ctx.beginPath();
	ctx.rect(-HealthBarRadius, -HeroRadius - HealthBarHeight - HealthBarMargin, HealthBarRadius * 2, HealthBarHeight);
	ctx.fill();

	var healthProportion = hero.health / HeroMaxHealth;
	ctx.fillStyle = rgColor(healthProportion);
	ctx.beginPath();
	ctx.rect(-HealthBarRadius, -HeroRadius - HealthBarHeight - HealthBarMargin, HealthBarRadius * 2 * healthProportion, HealthBarHeight);
	ctx.fill();

	ctx.restore();
}

function rgColor(proportion) {
	var hue = proportion * 120.0;
	return 'hsl(' + Math.round(hue, 0) + ', 100%, 50%)';
}

function renderRay(ctx, projectile, world, spell) {
	var pos = projectile.body.getPosition();
	var previous = projectile.uiPreviousPos;
	projectile.uiPreviousPos = vectorClone(pos);

	if (!previous) {
		renderProjectile(ctx, projectile, world, spell);
		return;
	}


	world.trails.push({
		type: 'line',
		remaining: spell.trailTicks,
		max: spell.trailTicks, 
		from: vectorClone(previous),
		to: vectorClone(pos),
		fillStyle: spell.fillStyle,
		width: spell.radius * 2,
	});
}

function renderProjectile(ctx, projectile, world, spell) {
	var pos = projectile.body.getPosition();

	world.trails.push({
		type: 'circle',
		remaining: spell.trailTicks,
		max: spell.trailTicks, 
		pos: vectorClone(pos),
		fillStyle: spell.fillStyle,
		radius: spell.radius,
	});
}

function renderTrail(ctx, trail) {
	var proportion = 1.0 * trail.remaining / trail.max;
	if (proportion <= 0) {
		return true;
	}


	ctx.save(); 

	ctx.globalAlpha = proportion;
	ctx.fillStyle = trail.fillStyle;
	ctx.strokeStyle = trail.fillStyle;

	if (trail.type === "circle") {
		ctx.beginPath();
		ctx.arc(trail.pos.x, trail.pos.y, proportion * trail.radius, 0, 2 * Math.PI);
		ctx.fill();
	} else if (trail.type === "line") {
		ctx.lineWidth = proportion * trail.width;
		ctx.beginPath();
		ctx.moveTo(trail.from.x, trail.from.y);
		ctx.lineTo(trail.to.x, trail.to.y);
		ctx.stroke();
	}

	ctx.restore();

	--trail.remaining;
	return trail.remaining <= 0;
}

function renderInterface(ctx, world, rect) {
	var myHero = world.objects.get(myHeroId);
	if (myHero) {
		renderButtons(ctx, ui.buttons, world, myHero, world.actions, rect);
	}
}

function renderButtons(ctx, buttons, world, hero, actions, rect) {
	var heroAction = actions.get(hero.id);
	var selectedAction = heroAction && heroAction.type;

	var buttonBarWidth = buttons.length * ButtonSize + (buttons.length - 1) * ButtonSpacing;

	ctx.save();
	ctx.translate(rect.width / 2.0 - buttonBarWidth / 2.0, rect.height - ButtonSize - ButtonMargin);

	for (var i = 0; i < buttons.length; ++i) {
		var spell = Spells[buttons[i]];
		if (!spell) {
			continue;
		}

		var isSelected = selectedAction === spell.id;
		var isCharging = hero.charging && hero.charging.spell === spell.id;
		var remainingInSeconds = cooldownRemaining(world, hero, spell.id) / TicksPerSecond;

		ctx.save();
		ctx.translate((ButtonSize + ButtonSpacing) * i, 0);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		// Button
		{
			ctx.save();

			ctx.fillStyle = spell.fillStyle;
			if (remainingInSeconds > 0) {
				ctx.fillStyle = isSelected ? '#cccccc' : '#444444';
			} else if (isCharging) {
				ctx.fillStyle = 'white';
			}

			ctx.beginPath();
			ctx.rect(0, 0, ButtonSize, ButtonSize);
			ctx.fill();

			ctx.restore();
		}
		
		// Icon
		if (spell.icon) {
			ctx.save();

			ctx.globalAlpha = 0.6;
			ctx.fillStyle = 'white';
			ctx.scale(ButtonSize / 512, ButtonSize / 512);
			ctx.fill(spell.icon);

			ctx.restore();
		}

		if (remainingInSeconds > 0) {
		// Cooldown
			var cooldownText = remainingInSeconds > 1 ? remainingInSeconds.toFixed(0) : remainingInSeconds.toFixed(1);

			ctx.font = 'bold ' + (ButtonSize - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, cooldownText, ButtonSize / 2, ButtonSize / 2);
		} else {
			// Keyboard shortcut
			ctx.save();

			ctx.font = 'bold ' + (ButtonSize / 2 - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, spell.key.toUpperCase(), ButtonSize / 4, ButtonSize * 3 / 4);

			ctx.restore();
		}


		ctx.restore();
	}

	ctx.restore();
}

function renderTextWithShadow(ctx, text, x, y) {
	ctx.save();

	ctx.fillStyle = 'black';
	ctx.fillText(text, x + 1, y + 1);

	ctx.fillStyle = 'white';
	ctx.fillText(text, x, y);

	ctx.restore();
}




// Vector utils
function vectorZero() {
	return pl.Vec2(0, 0);
}

function vectorDiff(to, from) {
	return pl.Vec2(to.x - from.x, to.y - from.y);
}

function vectorLength(vec) {
	return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

function vectorUnit(vec) {
	var length = vectorLength(vec);
	return length == 0 ? vec : pl.Vec2(vec.x / length, vec.y / length);
}

function vectorDirection(to, from, length) {
	var diff = vectorDiff(to, from);
	return vectorMultiply(vectorUnit(diff), length);
}

function vectorMultiply(vec, multiplier) {
	return pl.Vec2(vec.x * multiplier, vec.y * multiplier);
}

function vectorTruncate(vec, maxLength) {
	var length = vectorLength(vec);
	if (length > maxLength) {
		return vectorMultiply(vec, maxLength / length);
	} else {
		return vec;
	}
}

function vectorTowards(from, to, distance) {
	var diff = vectorDiff(to, from);
	step = vectorTruncate(diff, distance);
	return vectorPlus(from, step);
}

function vectorPlus(a, b) {
	return pl.Vec2(a.x + b.x, a.y + b.y);
}

function vectorDistance(a, b) {
	return vectorLength(vectorDiff(a, b));
}

function vectorClone(vec) {
	return pl.Vec2(vec.x, vec.y);
}
