import _ from 'lodash';
import moment from 'moment';
import pl, { World } from 'planck-js';
import wu from 'wu';
import * as Immutable from 'immutable';
import * as arrayUtils from '../utils/arrayUtils';
import * as colorWheel from './colorWheel';
import * as constants from './constants';
import * as n from './networking.model';
import * as shapes from './shapes';
import * as vector from './vector';
import * as w from './world.model';
import { modToSettings } from './modder';

import { Alliances, Categories, TicksPerSecond } from './constants';

const NeverTicks = 1e6;
const Precision = 0.0001;
const BotsExitAfterTicks = 2 * TicksPerSecond;
const vectorZero = vector.zero();
const vectorCenter = pl.Vec2(0.5, 0.5);

interface BuffContext {
	fromHeroId?: string;
	spellId?: string;
	durationMultiplier?: number;
}

interface ProjectileConfig {
	owner?: string;
	initialFilterGroupIndex?: number;
	filterGroupIndex?: number;
	direction?: pl.Vec2;
	releaseTarget?: pl.Vec2;
}

interface DetonateConfig {
	damageMultiplier?: number;
	radiusMultiplier?: number;
	impulseMultiplier?: number;

	sourceId: string;
	color?: string;
	defaultSound?: string;
	buffDurationMultiplier?: number;
}

export interface ResolvedKeyBindings {
	keysToSpells: Map<string, string>;
	spellsToKeys: Map<string, string>;
}

type DiscriminateBehaviour<T extends w.Behaviour['type']> = Extract<w.Behaviour, {type: T}>

type BehaviourHandlers = {
  [P in w.Behaviour['type']]?: (behaviour: DiscriminateBehaviour<P>, world: w.World) => boolean
};

// Reset planck.js constants
{
	const settings = (pl as any).internal.Settings;

	// Planck.js considers collisions to be inelastic if below this threshold.
	// We want all thresholds to be elastic.
	settings.velocityThreshold = 0;

	// We need to adjust this because our scale is not a normal scale and the defaults let some small projectiles tunnel through others
	settings.linearSlop = 0.0001; // Must be smaller than every impulse used in the game
	settings.linearSlopSquared = Math.pow(settings.linearSlop, 2.0);
	settings.polygonRadius = (2.0 * settings.linearSlop);
	settings.aabbExtension = 20 * settings.linearSlop;
}

export function version() {
	return "1.0.1151";
}

export function initialWorld(mod: Object): w.World {
	const settings = modToSettings(mod);
	const World = settings.World;
	const Visuals = settings.Visuals;

	const def: pl.WorldDef = {
		positionIterations: 3,
		velocityIterations: 3,
	};

	let world: w.World = {
		seed: null,
		color: Visuals.DefaultWorldColor,
		background: Visuals.Background,
		startMessage: World.DefaultGameStartMessage,

		tick: 0,
		startTick: constants.Matchmaking.MaxHistoryLength,

		actionMessages: [],
		controlMessages: [],
		snapshots: [],
		syncs: [],

		activePlayers: Immutable.Set<string>(), // hero IDs
		players: Immutable.Map<string, w.Player>(), // hero ID -> player
		controlKeys: new Map(),
		spellRecords: new Map(),
		teams: Immutable.Map<string, w.Team>(), // hero ID -> team
		teamAssignments: Immutable.Map<string, string>(), // hero ID -> team ID
		scores: Immutable.Map<string, w.HeroScore>(), // hero ID -> score
		winner: null,
		winners: null,

		objects: new Map(),
		behaviours: [],
		physics: pl.World(def),
		collisions: new Map(),

		actions: new Map(),

		initialRadius: World.InitialRadius,
		shrink: 1,
		angle: 0,
		shape: shapes.createCircle(1),

		nextPositionId: 0,
		nextObjectId: 0,
		nextColorId: 0,
		nextBuffId: 0,

		settings,
		mod,

		ui: {
			createTime: moment(),
			myRoomId: null,
			myGameId: null,
			myHeroId: null,
			myPartyId: null,
			myUserHash: null,
			universeId: null,
			controlKey: null,
			reconnectKey: null,
			live: false,
			renderedTick: null,
			sentSnapshotTick: 0,
			playedTick: -1,
			toolbar: {},
			destroyed: [],
			shakes: [],
			highlights: [],
			events: new Array<w.WorldEvent>(),
			underlays: [],
			trails: [],
			changedTrailHighlights: new Map(),
			notifications: [],
			camera: {
				zoom: 1,
				center: pl.Vec2(0.5, 0.5),
			},
		},
	};
	world.physics.on('post-solve', (contact) => onPostSolve(world, contact));

	return world;
}

function onPostSolve(world: w.World, contact: pl.Contact) {
	const collision = createCollisionFromContact(world, contact);
	if (collision) {
		world.collisions.set(contact, collision);
	}
}

function createCollisionFromContact(world: w.World, contact: pl.Contact): w.Collision {
	if (!contact.isTouching()) {
		return null;
	}

	const a = world.objects.get(contact.getFixtureA().getBody().getUserData());
	const b = world.objects.get(contact.getFixtureB().getBody().getUserData());
	if (!(a && b)) {
		return null;
	}

	const manifold = contact.getWorldManifold(); // If no collision manifold, this is a sensor
	const collisionPoint = manifold ? vector.average(manifold.points) : null;
	return { a, b, point: collisionPoint };
}

// Not guaranteed to return each object once
function queryExtent(world: w.World, epicenter: pl.Vec2, radius: number, callback: (obj: w.WorldObject) => void) {
	const topLeft = epicenter.clone();
	topLeft.x -= radius;
	topLeft.y -= radius;

	const bottomRight = epicenter.clone();
	bottomRight.x += radius;
	bottomRight.y += radius;

	const aabb = pl.AABB(topLeft, bottomRight);
	world.physics.queryAABB(aabb, (fixture) => {
		const obj = world.objects.get(fixture.getBody().getUserData());
		if (obj) {
			callback(obj);
		}
		return true;
	});
}

export function isGameStarting(world: w.World) {
	return world.startTick < constants.Matchmaking.MaxHistoryLength;
}

export function isDead(heroId: string, world: w.World) {
	// Use player.dead rather than check for hero in world.objects because the hero object may take a while to appear while their user ID is retrieved from the database
	const player = world.players.get(heroId);
	return player && player.dead;
}

export function takeNotifications(world: w.World): w.Notification[] {
	const notifications = world.ui.notifications;
	if (notifications.length > 0) {
		world.ui.notifications = [];
	}
	return notifications;
}

function addObstacle(world: w.World, position: pl.Vec2, angle: number, shape: shapes.Shape, layout: ObstacleLayout) {
	const Obstacle = world.settings.Obstacle;
	const template = world.settings.ObstacleTemplates[layout.type || "default"];

	const obstacleId = "obstacle" + (world.nextObjectId++);
	const body = world.physics.createBody({
		userData: obstacleId,
		type: template.static ? 'static' : 'dynamic',
		position,
		angle,
		linearDamping: template.linearDamping || Obstacle.LinearDamping,
		angularDamping: template.angularDamping || Obstacle.AngularDamping,
	});

	const sensor = template.sensor || false;
	const collideWith = template.collideWith !== undefined ? template.collideWith : Categories.All;

	const hitbox: pl.Shape =
		template.circularHitbox
		? pl.Circle(layout.extent / shapes.calculateMaxExtentMultiplier(layout.numPoints || 0))
		: shapes.shapeToPlanck(shape);
	body.createFixture(hitbox, {
		density: template.density || Obstacle.Density,
		filterCategoryBits: Categories.Obstacle,
		filterMaskBits: collideWith,
		isSensor: sensor,
	});

	const health = layout.health || template.health;
	const obstacle: w.Obstacle = {
		id: obstacleId,
		owner: null,
		type: layout.type,
		category: "obstacle",
		categories: Categories.Obstacle,
		body,

		static: template.static,
		sensor,
		collideWith,
		expireOn: template.expireOn || Categories.None,
		undamageable: template.undamageable,
		swappable: !sensor,

		render: template.render || [],
		strike: template.strike,
		sound: template.sound,

		shape,

		health,
		maxHealth: health,

		createTick: world.tick,

		damage: template.damage || 0,
		selfDamage: template.selfDamage || 0,
		buffs: template.buffs || [],
		detonate: template.detonate,
		mirror: template.mirror,
		impulse: template.impulse || 0,
		conveyor: template.conveyor,

		hitInterval: template.hitInterval || 1,
		hitTickLookup: new Map<string, number>(),
	};

	// Obstacles start immovable
	world.behaviours.push({
		type: "fixate",
		untilGameStarted: true,
		objId: obstacleId,
		pos: position,
		angle,
		proportion: Obstacle.ReturnProportion,
		speed: Obstacle.ReturnMinSpeed,
		turnRate: Obstacle.ReturnTurnRate * 2 * Math.PI,
	});

	if (template.decayPerSecond > 0) {
		world.behaviours.push({
			type: "decayHealth",
			objId: obstacleId,
			decayPerTick: template.decayPerSecond / TicksPerSecond,
		});
	}

	world.objects.set(obstacle.id, obstacle);
	return obstacle;
}

function addShield(world: w.World, hero: w.Hero, spell: ReflectSpell) {
	const shieldId = "shield" + (world.nextObjectId++);

	const body = world.physics.createBody({
		userData: shieldId,
		type: 'static',
		position: vector.clone(hero.body.getPosition()),
	});

	let points: pl.Vec2[] = null;
	let revs = spell.angularWidthInRevs || 1;
	if (revs <= 0.5) {
		points = new Array<pl.Vec2>();

		let numPoints = spell.numPoints || 7;
		for (let i = 0; i <= numPoints; ++i) {
			let proportion = (i / numPoints) - 0.5;
			points.push(vector.fromAngle(revs * vector.Tau * proportion, spell.radius));
		}
	}

	let shape: pl.Shape = points ? pl.Polygon(points) : pl.Circle(spell.radius);
	body.createFixture(shape, {
		filterCategoryBits: Categories.Shield,
		filterMaskBits: Categories.Hero | Categories.Projectile,
		filterGroupIndex: hero.filterGroupIndex,
	});

	const shield: w.Shield = {
		id: shieldId,
		category: "shield",
		type: "reflect",
		sound: spell.sound,
		categories: Categories.Shield,
		body,
		createTick: world.tick,
		expireTick: world.tick + spell.maxTicks,
		growthTicks: 0,
		damageMultiplier: spell.damageMultiplier,
		takesOwnership: spell.takesOwnership,
		blocksTeleporters: spell.blocksTeleporters,
		owner: hero.id,
		radius: spell.radius,
		points,
		turnRate: (spell.maxTurnRatePerTickInRevs || 1) * vector.Tau,
		color: spell.color,
		glow: spell.glow,
		bloom: spell.bloom,
		strike: spell.strike,
	};

	world.objects.set(shield.id, shield);
	world.behaviours.push({ type: "reflectFollow", shieldId: shield.id });

	if (revs >= 1) {
		// Only consider a shield if fully enclosed
		hero.shieldIds.add(shield.id);
	}

	return shield;
}

function addWall(world: w.World, hero: w.Hero, spell: WallSpell, position: pl.Vec2, angle: number, points: pl.Vec2[], extent: number) {
	const shieldId = "shield" + (world.nextObjectId++);

	const body = world.physics.createBody({
		userData: shieldId,
		type: spell.density > 0 ? 'dynamic' : 'static',
		position,
		angle,
		linearDamping: spell.linearDamping,
		angularDamping: spell.angularDamping,
		bullet: spell.ccd !== undefined ? spell.ccd : true,
	});

	body.createFixture(pl.Polygon(points), {
		filterCategoryBits: spell.categories !== undefined ? spell.categories : Categories.Shield,
		filterMaskBits: spell.collideWith !== undefined ? spell.collideWith : Categories.Hero | Categories.Projectile,
		filterGroupIndex: spell.selfPassthrough ? hero.filterGroupIndex : undefined,
		density: spell.density,
	});

	const shield: w.Shield = {
		id: shieldId,
		category: "shield",
		type: "wall",
		sound: spell.sound,
		categories: Categories.Shield,
		body,
		createTick: world.tick,
		expireTick: world.tick + spell.maxTicks,
		growthTicks: spell.growthTicks,
		damageMultiplier: spell.damageMultiplier,
		takesOwnership: spell.takesOwnership,
		conveyable: spell.conveyable,
		bumpable: spell.bumpable,
		swappable: spell.swappable,
		blocksTeleporters: spell.blocksTeleporters,
		owner: hero.id,
		points,
		extent,
		color: spell.color,
		selfColor: spell.selfPassthrough,
		glow: spell.glow,
		bloom: spell.bloom,
		strike: spell.strike,
	};

	world.objects.set(shield.id, shield);

	return shield;
}

function addSaber(world: w.World, hero: w.Hero, spell: SaberSpell, angleOffset: number) {
	const shieldId = "shield" + (world.nextObjectId++);

	const heroAngle = hero.target ? vector.angleDiff(hero.target, hero.body.getPosition()) : hero.body.getAngle();
	const angle = heroAngle + angleOffset;
	const position = hero.body.getPosition();

	const body = world.physics.createBody({
		userData: shieldId,
		type: 'static',
		position,
		angle,
	});

	const halfWidth = spell.width / 2;
	const points = [
		pl.Vec2(0, -halfWidth),
		pl.Vec2(0, halfWidth),
		pl.Vec2(spell.length, halfWidth),
		pl.Vec2(spell.length, -halfWidth),
	];

	body.createFixture(pl.Polygon(points), {
		filterCategoryBits: spell.categories,
		filterMaskBits: spell.collidesWith,
		filterGroupIndex: hero.filterGroupIndex,
	});

	const shield: w.Shield = {
		id: shieldId,
		category: "shield",
		type: "saber",
		sound: spell.sound,
		categories: spell.categories,
		body,
		createTick: world.tick,
		expireTick: world.tick + spell.maxTicks,
		growthTicks: 5,
		channelling: spell.channelling,

		damageTemplate: spell.damageTemplate,
		hitTickLookup: new Map(),
		hitInterval: spell.hitInterval,
		hitBuffs: spell.hitBuffs,

		damageMultiplier: spell.damageMultiplier,
		takesOwnership: spell.takesOwnership,
		destroying: true,
		blocksTeleporters: spell.blocksTeleporters,

		owner: hero.id,
		points,

		color: spell.color,
		glow: spell.glow,
		bloom: spell.bloom,
		strike: spell.strike,

		spellId: spell.id,
		angleOffset,
		width: spell.width,
		length: spell.length,
		shiftMultiplier: spell.shiftMultiplier,
		speedMultiplier: spell.speedMultiplier,
		maxSpeed: spell.maxSpeed,
		turnRate: spell.maxTurnRatePerTickInRevs * (2 * Math.PI),
		trailTicks: spell.trailTicks,

		uiPreviousAngle: null,
	};

	world.objects.set(shield.id, shield);

	return shield;
}

function addHero(world: w.World, heroId: string) {
	const Matchmaking = world.settings.Matchmaking;
	const Hero = world.settings.Hero;
	const World = world.settings.World;

	const heroIndex = generateHeroIndex(world);
	const filterGroupIndex = -(heroIndex + 1); // +1 because 0 means group index doesn't apply

	let position;
	let angle;
	{
		const offset =
			shapes.proportionalEdgePoint(world.shape, vectorZero, world.angle, heroIndex / Matchmaking.MaxPlayers, World.HeroLayoutProportion)
			.mul(calculateWorldMinExtent(world));

		position = offset.clone().add(vectorCenter);
		angle = vector.angle(offset) + Math.PI; // Face inward
	}

	let body = world.physics.createBody({
		userData: heroId,
		type: 'dynamic',
		position,
		angle,
		linearDamping: Hero.Damping,
		angularDamping: Hero.AngularDamping,
		allowSleep: false,
	} as pl.BodyDef);
	const collideWith = Categories.All ^ Categories.Shield;
	body.createFixture(pl.Circle(Hero.Radius), {
		filterCategoryBits: Categories.Hero,
		filterMaskBits: collideWith,
		filterGroupIndex,
		density: Hero.Density,
		restitution: 1.0,
	});

	let hero: w.Hero = {
		id: heroId,
		owner: heroId,
		category: "hero",
		heroIndex,
		filterGroupIndex,
		initialCollideWith: collideWith,
		collideWith,
		categories: Categories.Hero,
		health: Hero.MaxHealth,
		maxHealth: Hero.MaxHealth,
		body,
		swappable: true,
		initialRadius: Hero.Radius,
		radius: Hero.Radius,
		linearDamping: Hero.Damping,
		armorProportion: 0,
		armorModifiers: new Map(),
		damageSources: new Map<string, number>(),
		damageSourceHistory: [],
		moveSpeedPerSecond: Hero.MoveSpeedPerSecond,
		maxSpeed: Hero.MaxSpeed,
		revolutionsPerTick: Hero.RevolutionsPerTick,
		casting: null,
		cooldowns: {},
		cooldownRates: {},
		createTick: world.tick,
		throttleUntilTick: 0,
		keysToSpells: new Map<string, string>(),
		spellsToKeys: new Map<string, string>(),
		spellChangedTick: new Map<string, number>(),
		shieldIds: new Set<string>(),
		horcruxIds: new Set<string>(),
		focusIds: new Map<string, string>(),
		buffs: new Map<string, w.Buff>(),
		uiHealth: Hero.MaxHealth,
		uiDestroyedBuffs: [],
	};
	world.objects.set(heroId, hero);
	world.scores = world.scores.set(heroId, initScore(heroId));

	world.behaviours.push({ type: "cooldown", heroId: hero.id });
	world.behaviours.push({ type: "limitSpeed", objId: hero.id, speedLimit: Hero.MaxSpeed });
	world.behaviours.push({ type: "expireBuffs", heroId: hero.id });
	world.behaviours.push({ type: "burn", heroId: hero.id });
	world.behaviours.push({ type: "decayMitigation", heroId: hero.id });

	console.log("Adding hero", heroId, heroIndex);
	return hero;
}

function generateHeroIndex(world: w.World) {
	const usedIndexes = new Set(
		wu(world.objects.values())
		.filter(x => x.category === "hero" && (!x.exitTick || world.tick < x.exitTick))
		.map(x => (x as w.Hero).heroIndex));
	const Matchmaking = world.settings.Matchmaking;
	for (let i = 0; i < Matchmaking.MaxPlayers; ++i) {
		if (!usedIndexes.has(i)) {
			return i;
		}
	}

	// Should never happen - more heroes than maximum allowed
	return usedIndexes.size;
}

export function formatHeroId(index: number): string {
	return "hero" + index;
}

function applyPosDelta(obj: w.WorldObject, delta: pl.Vec2) {
	if (obj.posDelta) {
		obj.posDelta.add(delta);
	} else {
		obj.posDelta = delta;
	}
}

function applyVelocityDelta(obj: w.WorldObject, delta: pl.Vec2) {
	if (obj.velocityDelta) {
		obj.velocityDelta.add(delta);
	} else {
		obj.velocityDelta = delta;
	}
}

function applyImpulseDelta(obj: w.WorldObject, delta: pl.Vec2) {
	if (obj.impulseDelta) {
		obj.impulseDelta.add(delta);
	} else {
		obj.impulseDelta = delta;
	}
}

export function cooldownRemaining(world: w.World, hero: w.Hero, spellId: string) {
	return Math.max(0, hero.cooldowns[spellId] || 0);
}

function setCooldown(world: w.World, hero: w.Hero, spellId: string, cooldown: number) {
	if (cooldown > 0) {
		hero.cooldowns[spellId] = cooldown;
	} else {
		delete hero.cooldowns[spellId];
	}
}

function cooldown(behaviour: w.CooldownBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	for (const spellId in hero.cooldowns) {
		let cooldown = cooldownRemaining(world, hero, spellId);

		let cooldownRate = hero.cooldownRates[spellId];
		if (typeof cooldownRate !== 'number') {
			cooldownRate = 1;
		}

		cooldown = Math.max(0, cooldown - cooldownRate);
		setCooldown(world, hero, spellId, cooldown);
	}

	return true;
}

function addProjectile(world: w.World, hero: w.Hero, target: pl.Vec2, spell: Spell, projectileTemplate: ProjectileTemplate, config: ProjectileConfig = {}) {
	const from = hero.body.getPosition();

	let direction = vector.unit(config.direction || vector.diff(target, from));
	if (direction.x === 0 && direction.y === 0) {
		direction = vector.fromAngle(hero.body.getAngle());
	}

	const position = vector.clone(hero.body.getPosition());
	const angle = vector.angle(direction);

	const projectile = addProjectileAt(world, position, angle, target, spell.id, projectileTemplate, {
		...config,
		owner: hero.id,
		initialFilterGroupIndex: hero.filterGroupIndex,
	});

	if (projectileTemplate.horcrux) {
		hero.horcruxIds.add(projectile.id);
	}

	return projectile;
}

function addProjectileAt(world: w.World, position: pl.Vec2, angle: number, target: pl.Vec2, type: string, projectileTemplate: ProjectileTemplate, config: ProjectileConfig = {}) {
	const index = world.nextObjectId++;
	const id = type + index;
	const velocity = vector.fromAngle(angle).mul(projectileTemplate.speed);
	const diff = vector.diff(target, position);

	const categories = projectileTemplate.categories === undefined ? (Categories.Projectile | Categories.Blocker) : projectileTemplate.categories;
	const collideWith = projectileTemplate.collideWith !== undefined ? projectileTemplate.collideWith : Categories.All;

	const filterGroupIndex = config.filterGroupIndex || -(index + 1); // +1 because 0 means group index doesn't apply

	const knockbackScaling = calculateScaling(config.owner, world, projectileTemplate.knockbackScaling);
	let body = world.physics.createBody({
		userData: id,
		type: 'dynamic',
		position,
		linearVelocity: velocity,
		linearDamping: 0,
		bullet: projectileTemplate.ccd !== undefined ? projectileTemplate.ccd : true,
	});
	body.createFixture(pl.Circle(projectileTemplate.radius), {
		filterGroupIndex: config.initialFilterGroupIndex || filterGroupIndex,
		filterCategoryBits: categories,
		filterMaskBits: collideWith,
		density: projectileTemplate.density * knockbackScaling,
		restitution: projectileTemplate.restitution !== undefined ? projectileTemplate.restitution : 1.0,
		isSensor: projectileTemplate.sensor,
	});

	if (projectileTemplate.sense) {
		body.createFixture(pl.Circle(projectileTemplate.radius), {
			filterGroupIndex: config.initialFilterGroupIndex || filterGroupIndex,
			filterCategoryBits: categories,
			filterMaskBits: projectileTemplate.sense,
			density: 1e-6,
			isSensor: true,
		});
	}

	let targetObj = findNearest(world.objects, target, x => x.category === "hero" && !!(calculateAlliance(config.owner, x.id, world) & Alliances.Enemy));
	const ticksToCursor = ticksTo(diff.length(), velocity.length())

	let projectile: w.Projectile = {
		id,
		owner: config.owner,
		category: "projectile",
		categories,
		type,
		body,
		filterGroupIndex,
		speed: projectileTemplate.speed,
		fixedSpeed: projectileTemplate.fixedSpeed !== undefined ? projectileTemplate.fixedSpeed : true,
		attractable: projectileTemplate.attractable !== undefined ? projectileTemplate.attractable : true,
		bumpable: projectileTemplate.bumpable,
		conveyable: projectileTemplate.conveyable,
		linkable: projectileTemplate.linkable,
		swappable: projectileTemplate.swappable !== undefined ? projectileTemplate.swappable : true,

		target: {
			heroId: targetObj ? targetObj.id : null,
			pos: target,
			releasePos: config.releaseTarget || target,
		},
		hitTickLookup: new Map<string, number>(),
		hitInterval: projectileTemplate.hitInterval,

		damageTemplate: {
			damage: projectileTemplate.damage,
			damageScaling: projectileTemplate.damageScaling,
			lifeSteal: projectileTemplate.lifeSteal,
			noHit: projectileTemplate.noHit,
			noKnockback: projectileTemplate.noKnockback,
			source: projectileTemplate.source,
		},
		partialDamage: projectileTemplate.partialDamage,
		partialDetonateImpulse: projectileTemplate.partialDetonateImpulse,
		partialDetonateRadius: projectileTemplate.partialDetonateRadius,
		partialBuffDuration: projectileTemplate.partialBuffDuration,

		bounce: projectileTemplate.bounce,
		gravity: projectileTemplate.gravity,
		link: projectileTemplate.link,
		detonate: projectileTemplate.detonate && instantiateDetonate(projectileTemplate.detonate, config.owner, world),
		buffs: projectileTemplate.buffs,
		swapWith: projectileTemplate.swapWith,
		shieldTakesOwnership: projectileTemplate.shieldTakesOwnership !== undefined ? projectileTemplate.shieldTakesOwnership : true,

		createTick: world.tick,
		expireTick:
			world.tick + Math.min(
				projectileTemplate.maxTicks,
				projectileTemplate.expireAfterCursorTicks !== undefined ? ticksToCursor + projectileTemplate.expireAfterCursorTicks : NeverTicks,
			),
		minTicks: projectileTemplate.minTicks || 0,
		maxTicks: projectileTemplate.maxTicks,
		collideWith,
		sense: (projectileTemplate.sense || 0) | (projectileTemplate.sensor ? projectileTemplate.collideWith : 0),
		expireOn: projectileTemplate.expireOn !== undefined ? projectileTemplate.expireOn : (Categories.All ^ Categories.Shield),
		expireAgainstHeroes: projectileTemplate.expireAgainstHeroes !== undefined ? projectileTemplate.expireAgainstHeroes : constants.Alliances.All,
		expireAgainstObjects: projectileTemplate.expireAgainstObjects !== undefined ? projectileTemplate.expireAgainstObjects : constants.Alliances.All,
		expireOnMirror: projectileTemplate.expireOnMirror,
		destructible: projectileTemplate.destructible && {
			against: projectileTemplate.destructible.against !== undefined ? projectileTemplate.destructible.against : constants.Alliances.All,
		},

		sound: projectileTemplate.sound,
		soundHit: projectileTemplate.soundHit,

		color: projectileTemplate.color,
		renderers: projectileTemplate.renderers,
		radius: projectileTemplate.radius,

		uiPath: [vector.clone(position)],
	};

	world.objects.set(id, projectile);

	if (projectile.fixedSpeed) {
		world.behaviours.push({ type: "decaySpeed", projectileId: projectile.id });
	}
	if (projectile.detonate) {
		world.behaviours.push({ type: "detonate", projectileId: projectile.id });
	}
	if (!projectileTemplate.selfPassthrough) {
		world.behaviours.push({ type: "removePassthrough", projectileId: projectile.id });
	}

	instantiateProjectileBehaviours(projectileTemplate.behaviours, projectile, world);

	return projectile;
}

export function calculateScaling(heroId: string, world: w.World, scaling: boolean = false) {
	if (!scaling) {
		return 1;
	}

	if (!heroId) {
		// Environment doesn't scale
		return 1;
	}

	return 1;
}

function ticksTo(distance: number, speed: number) {
	return Math.floor(TicksPerSecond * distance / speed);
}

function instantiateProjectileBehaviours(templates: BehaviourTemplate[], projectile: w.Projectile, world: w.World) {
	if (!templates) {
		return;
	}

	templates.forEach(template => {
		let behaviour: w.Behaviour = null;
		if (template.type === "homing") {
			behaviour = instantiateHoming(template, projectile, world);
		} else if (template.type === "accelerate") {
			behaviour = instantiateAccelerate(template, projectile, world);
		} else if (template.type === "attract") {
			behaviour = instantiateAttract(template, projectile, world);
		} else if (template.type === "aura") {
			behaviour = instantiateAura(template, projectile, world);
		} else if (template.type === "strafe") {
			behaviour = instantiateStrafe(template, projectile, world);
		} else if (template.type === "updateCollideWith") {
			behaviour = instantiateUpdateProjectileFilter(template, projectile, world);
		} else if (template.type === "partial") {
			behaviour = instantiateUpdatePartial(template, projectile, world);
		} else if (template.type === "clearHits") {
			behaviour = { type: "clearHits", projectileId: projectile.id };
		} else if (template.type === "expireOnOwnerDeath") {
			behaviour = instantiateExpireOnOwnerDeath(template, projectile, world);
		} else if (template.type === "expireOnOwnerRetreat") {
			behaviour = instantiateExpireOnOwnerRetreat(template, projectile, world);
		} else if (template.type === "expireOnChannellingEnd") {
			behaviour = instantiateExpireOnChannellingEnd(template, projectile, world);
		}

		const trigger = template.trigger;
		if (!trigger) {
			world.behaviours.push(behaviour);
		} else if (trigger.atCursor) {
			const distanceToCursor = vector.distance(projectile.target.pos, projectile.body.getPosition());
			const speed = projectile.body.getLinearVelocity().length();
			const ticksToCursor = ticksTo(distanceToCursor, speed);

			let waitTicks = ticksToCursor;
			if (trigger.minTicks) {
				waitTicks = Math.max(waitTicks, trigger.minTicks);
			}
			if (trigger.afterTicks) {
				waitTicks = Math.min(waitTicks, trigger.afterTicks);
			}
			world.behaviours.push({
				type: "delayBehaviour",
				afterTick: world.tick + waitTicks,
				delayed: behaviour,
			});
		} else if(trigger.afterTicks) {
			world.behaviours.push({
				type: "delayBehaviour",
				afterTick: world.tick + (trigger.afterTicks || 0),
				delayed: behaviour,
			});
		} else {
			throw "Unknown behaviour trigger: " + trigger;
		}
	});
}

function instantiateHoming(template: HomingTemplate, projectile: w.Projectile, world: w.World): w.HomingBehaviour {
	let maxTicks = NeverTicks;
	if (template.redirect) {
		maxTicks = 0;
	} else if (template.maxTicks) {
		maxTicks = template.maxTicks;
	}

	return {
		type: "homing",
		projectileId: projectile.id,
		turnRate: template.revolutionsPerSecond !== undefined ? template.revolutionsPerSecond * 2 * Math.PI : Infinity,
		maxTurnProportion: template.maxTurnProportion !== undefined ? template.maxTurnProportion : 1.0,
		minDistanceToTarget: template.minDistanceToTarget || 0,
		targetType: template.targetType || w.HomingTargets.enemy,
		newSpeed: template.newSpeed,
		expireWithinAngle: template.expireWithinRevs !== undefined ? (template.expireWithinRevs * 2 * Math.PI) : null,
		expireTick: world.tick + maxTicks,
	};
}

function instantiateAccelerate(template: AccelerateTemplate, projectile: w.Projectile, world: w.World): w.AccelerateBehaviour {
	return {
		type: "accelerate",
		projectileId: projectile.id,
		accelerationPerTick: template.accelerationPerSecond / TicksPerSecond,
		maxSpeed: template.maxSpeed,
	};
}

function instantiateAttract(template: AttractTemplate, projectile: w.Projectile, world: w.World): w.AttractBehaviour {
	return {
		type: "attract",
		objectId: projectile.id,
		owner: projectile.owner,
		against: template.against !== undefined ? template.against : Alliances.All,
		collideLike: template.collideLike,
		categories: template.categories !== undefined ? template.categories : Categories.All,
		notCategories: template.notCategories !== undefined ? template.notCategories : Categories.None,
		radius: template.radius,
		accelerationPerTick: template.accelerationPerTick,
		maxSpeed: template.maxSpeed,
		hitInterval: 1,
		hitTickLookup: new Map(),
	};
}

function instantiateAura(template: AuraTemplate, projectile: w.Projectile, world: w.World): w.AuraBehaviour {
	return {
		type: "aura",
		objectId: projectile.id,
		owner: projectile.owner,
		against: template.against !== undefined ? template.against : Alliances.Enemy,
		remainingHits: template.maxHits !== undefined ? template.maxHits : NeverTicks,
		packet: template.packet,
		radius: template.radius,
		buffs: template.buffs,
		hitInterval: template.tickInterval,
		hitTickLookup: new Map(),
	};
}

function instantiateStrafe(template: StrafeTemplate, projectile: w.Projectile, world: w.World): w.StrafeBehaviour {
	return {
		type: "strafe",
		projectileId: projectile.id,
		previousOwner: null,
		previousPos: null,
		maxSpeed: template.maxSpeed,
	};
}

function instantiateUpdateProjectileFilter(template: UpdateCollideWithTemplate, projectile: w.Projectile, world: w.World): w.UpdateCollideWithBehaviour {
	return {
		type: "updateCollideWith",
		projectileId: projectile.id,
		collideWith: template.collideWith,
	};
}

function instantiateUpdatePartial(template: UpdatePartialTemplate, projectile: w.Projectile, world: w.World): w.UpdatePartialBehaviour {
	return {
		type: "updatePartial",
		projectileId: projectile.id,
		partialDamage: template.partialDamage,
		partialDetonateRadius: template.partialDetonateRadius,
		partialDetonateImpulse: template.partialDetonateImpulse,
		partialBuffDuration: template.partialBuffDuration,
	};
}

function instantiateExpireOnOwnerDeath(template: ExpireOnOwnerDeathTemplate, projectile: w.Projectile, world: w.World): w.ExpireOnOwnerDeathBehaviour {
	return {
		type: "expireOnOwnerDeath",
		projectileId: projectile.id,
	};
}

function instantiateExpireOnOwnerRetreat(template: ExpireOnOwnerRetreatTemplate, projectile: w.Projectile, world: w.World): w.ExpireOnOwnerRetreatBehaviour {
	let anchorPoint = pl.Vec2(0.5, 0.5);

	const owner = world.objects.get(projectile.owner);
	if (owner && owner.category === "hero") {
		anchorPoint = vector.clone(owner.body.getPosition());
	}

	return {
		type: "expireOnOwnerRetreat",
		projectileId: projectile.id,
		maxDistance: template.maxDistance,
		anchorPoint,
	};
}

function instantiateExpireOnChannellingEnd(template: ExpireOnChannellingEndTemplate, projectile: w.Projectile, world: w.World): w.ExpireOnChannellingEndBehaviour {
	return {
		type: "expireOnChannellingEnd",
		projectileId: projectile.id,
	};
}

// Simulator
export function tick(world: w.World) {
	++world.tick;

	handleOccurences(world);
	handleActions(world);

	act(world);

	handleBehaviours(world, {
		delayBehaviour,
		homing,
		accelerate,
		linkForce,
		gravityForce,
		attract,
		aura,
		reflectFollow,
		saberSwing,
		thrustVelocity,
		thrustFollow,
		updateCollideWith,
		updatePartial,
		clearHits,
	});

	move(world);
	physicsStep(world);

	handleBehaviours(world, {
		detonate, // Detonate before objects switch owners so its predictable who owns the detonate
	});

	handleCollisions(world);

	handleBehaviours(world, {
		cooldown,
		fixate,
		decaySpeed,
		limitSpeed,
		decayHealth,
		strafe,
		burn,
		removePassthrough,
		thrustDecay,
		decayMitigation,
		expireBuffs,
		expireOnOwnerDeath,
		expireOnOwnerRetreat,
		expireOnChannellingEnd,
	});

	applyLavaDamage(world);
	shrink(world);

	reap(world);
	captureSnapshot(world);
}

function handleBehaviours(world: w.World, handlers: BehaviourHandlers) {
	const done = new Set<w.Behaviour>();
	world.behaviours.forEach(behaviour => {
		const handler = handlers[behaviour.type];
		if (handler) {
			const keep = (handler as any)(behaviour, world);
			if (!keep) {
				done.add(behaviour);
			}
		}
	});

	if (done.size > 0) {
		world.behaviours = world.behaviours.filter(b => !done.has(b));
	}
}

function delayBehaviour(behaviour: w.DelayBehaviour, world: w.World) {
	if (world.tick >= behaviour.afterTick) {
		world.behaviours.push(behaviour.delayed);
		return false;
	} else {
		return true;
	}
}

function physicsStep(world: w.World) {
	const granularity = 1000;
	world.physics.step(Math.floor(granularity / TicksPerSecond) / granularity);
}

function decayHealth(behaviour: w.DecayHealthBehaviour, world: w.World) {
	const obj = world.objects.get(behaviour.objId);
	if (!(obj && (obj.category === "obstacle" || obj.category === "hero"))) {
		return false;
	}

	const packet: w.DamagePacket = {
		fromHeroId: null,
		damage: behaviour.decayPerTick,
		lifeSteal: 0,
		isLava: true,
	};
	if (obj.category === "obstacle") {
		applyDamageToObstacle(obj, packet, world);
	} else if (obj.category === "hero") {
		applyDamage(obj, packet, world);
	}

	return true;
}

function decaySpeed(behaviour: w.DecaySpeedBehaviour, world: w.World) {
	const obj = world.objects.get(behaviour.projectileId);
	if (!(obj && obj.category === "projectile")) {
		return false;
	}

	const velocity = obj.body.getLinearVelocity();
	const currentSpeed = velocity.length();

	const diff = obj.speed - currentSpeed;
	if (Math.abs(diff) > world.settings.World.SlopSpeed) {
		const newSpeed = currentSpeed + diff * world.settings.World.ProjectileSpeedDecayFactorPerTick;
		if (currentSpeed > 0) {
			velocity.mul(newSpeed / currentSpeed);
		} else {
			// Stationary - take direction from heading
			velocity.set(vector.fromAngle(obj.body.getAngle()).mul(newSpeed));
		}
		obj.body.setLinearVelocity(velocity);
	}
	return true;
}

function limitSpeed(behaviour: w.LimitSpeedBehaviour, world: w.World) {
	const obj = world.objects.get(behaviour.objId);
	if (!obj) {
		return false;
	}

	const velocity = obj.body.getLinearVelocity();
	if (velocity.length() > behaviour.speedLimit + world.settings.World.SlopSpeed) {
		velocity.clamp(behaviour.speedLimit);
		obj.body.setLinearVelocity(velocity);
	}
	return true;
}

function fixate(behaviour: w.FixateBehaviour, world: w.World) {
	if (behaviour.untilGameStarted && world.tick >= world.startTick) {
		return true;
	}

	const obj = world.objects.get(behaviour.objId);
	if (!obj) {
		return false;
	}

	// Correct position
	{
		const pos = obj.body.getPosition();
		const diff = vector.diff(behaviour.pos, pos);
		if (diff.length() > 0) {
			const step = vector.truncate(diff, Math.max(behaviour.speed / TicksPerSecond, behaviour.proportion * vector.length(diff)));
			obj.body.setPosition(pos.add(step));
		}
	}


	// Correct angle
	{
		const angle = obj.body.getAngle();
		const diff = vector.angleDelta(angle, behaviour.angle);
		if (Math.abs(diff) > 0) {
			const maxStep = Math.max(behaviour.proportion * Math.abs(diff), behaviour.turnRate);
			obj.body.setAngle(vector.turnTowards(angle, behaviour.angle, maxStep));
		}
	}

	return true;
}

function updateHeroMass(hero: w.Hero) {
	let radius = hero.initialRadius;
	let restrictCollideWith = Categories.All;
	let appendCollideWith = Categories.None;
	hero.buffs.forEach(b => {
		if (b.type === "mass") {
			radius = Math.max(radius, b.radius);
			if (_.isNumber(b.restrictCollideWith)) {
				restrictCollideWith &= b.restrictCollideWith;
			}
			if (_.isNumber(b.appendCollideWith)) {
				appendCollideWith |= b.appendCollideWith;
			}
		}
	});
	hero.radius = radius;

	const collideWith = (hero.initialCollideWith | appendCollideWith) & restrictCollideWith;

	let fixture = hero.body.getFixtureList();
	while (fixture) {
		if (!fixture.isSensor()) { // Exclude sensors, just do physical collisions
			updateMaskBits(fixture, collideWith);
		}
		fixture = fixture.getNext();
	}

	hero.collideWith = collideWith;
}

function removePassthrough(passthrough: w.RemovePassthroughBehaviour, world: w.World) {
	const projectile = world.objects.get(passthrough.projectileId);
	if (!(projectile && projectile.category === "projectile")) {
		return false;
	} 

	// Projectiles will passthrough their owner until they are clear of their owner - this is so they don't die on spawn because the hero is walking in the same direction as the spawning projectile.
	// Also allows meteor to be shot further back and so is more likely to push back another hero if they are at point blank range.
	const hero = world.objects.get(projectile.owner);
	if (!hero || (hero.category === "hero" && projectileClearedHero(projectile, hero))) {
		let fixture = projectile.body.getFixtureList();
		while (fixture) {
			updateGroupIndex(fixture, projectile.filterGroupIndex);
			fixture = fixture.getNext();
		}
		return false;
	} else {
		return true;
	}
}

function updateCollideWith(behaviour: w.UpdateCollideWithBehaviour, world: w.World) {
	const projectile = world.objects.get(behaviour.projectileId);
	if (!(projectile && projectile.category === "projectile")) {
		return false;
	} 

	projectile.collideWith = behaviour.collideWith;
	updateMaskBits(projectile.body.getFixtureList(), behaviour.collideWith);
	return false;
}

function updatePartial(behaviour: w.UpdatePartialBehaviour, world: w.World) {
	const projectile = world.objects.get(behaviour.projectileId);
	if (!(projectile && projectile.category === "projectile")) {
		return false;
	} 

	const afterTicks = world.tick - projectile.createTick; // Only start the growth from now
	if (behaviour.partialDamage !== undefined) {
		projectile.partialDamage = instantiatePartial(behaviour.partialDamage, afterTicks);
	}
	if (behaviour.partialDetonateImpulse !== undefined) {
		projectile.partialDetonateImpulse = instantiatePartial(behaviour.partialDetonateImpulse, afterTicks);
	}
	if (behaviour.partialDetonateRadius !== undefined) {
		projectile.partialDetonateRadius = instantiatePartial(behaviour.partialDetonateRadius, afterTicks);
	}
	if (behaviour.partialBuffDuration !== undefined) {
		projectile.partialBuffDuration = instantiatePartial(behaviour.partialBuffDuration, afterTicks);
	}

	return false;
}

function instantiatePartial(partial: PartialDamageParameters, afterTicks: number): PartialDamageParameters {
	if (partial) {
		return { ...partial, afterTicks };
	} else {
		return null;
	}
}

function clearHits(behaviour: w.ClearHitsBehaviour, world: w.World) {
	const projectile = world.objects.get(behaviour.projectileId);
	if (!(projectile && projectile.category === "projectile")) {
		return false;
	} 

	projectile.hitTickLookup.clear();
	return false;
}

function projectileClearedHero(projectile: w.Projectile, hero: w.Hero) {
	const NumTicksCleared = 3;
	const distance = vector.distance(hero.body.getPosition(), projectile.body.getPosition());
	return distance > hero.radius + projectile.radius + (NumTicksCleared * hero.moveSpeedPerSecond / TicksPerSecond) + constants.Pixel;
}

function handleOccurences(world: w.World) {
	const newOccurences = new Array<n.ControlMsg>();

	world.controlMessages.forEach(ev => {
		let success = true;
		if (ev.type === n.ActionType.CloseGame) {
			success = handleClosing(ev, world);
		} else if (ev.type === n.ActionType.Teams) {
			success = handleTeams(ev, world);
		} else if (ev.type === n.ActionType.Bot) {
			success = handleBotting(ev, world);
		} else if (ev.type === n.ActionType.Join) {
			success = handleJoining(ev, world);
		} else if (ev.type === n.ActionType.Leave) {
			success = handleLeaving(ev, world);
		} else if (ev.type === n.ActionType.Environment) {
			success = seedEnvironment(ev, world);
		} else if (ev.type === n.ActionType.Finish) {
			success = handleFinishing(ev, world);
		}

		if (!success) {
			newOccurences.push(ev);
		}
	});
	world.controlMessages = newOccurences;

	if (world.syncs.length > 0) {
		world.syncs.forEach(ev => handleSync(ev, world));
		world.syncs.length = 0;
	}
}

function seedEnvironment(ev: n.EnvironmentMsg, world: w.World) {
	if (world.seed !== null) {
		return true;
	}
	world.seed = ev.seed;
	console.log("Environment seed " + world.seed);

	const World = world.settings.World;
	const Layouts = world.settings.Layouts;

	const layoutIds = World.Layouts || Object.keys(Layouts);
	const layouts = layoutIds.sort().map(key => Layouts[key]).filter(x => !!x);
	const layout = layouts[world.seed % layouts.length];

	if (layout.startMessage) {
		world.startMessage = layout.startMessage;
	}

	if (layout.color) {
		world.color = layout.color;
	}
	if (layout.background) {
		world.background = layout.background;
	}
	
	if (layout.numPoints) {
		// A polygon's extent needs to be larger than a circle's radius for them to look the same size
		const radiusMultiplier = shapes.calculateMaxExtentMultiplier(layout.numPoints);
		world.shape = shapes.createRadial(layout.numPoints, radiusMultiplier);
	} else {
		world.shape = shapes.createCircle(1);
	}
	world.initialRadius = (layout.radiusMultiplier || 1) * World.InitialRadius;
	world.angle = vector.Tau * (layout.angleOffsetInRevs || 0);

	layout.obstacles.forEach(obstacleTemplate => instantiateObstacles(obstacleTemplate, world));

	return true;
}

function instantiateObstacles(template: ObstacleLayout, world: w.World) {
	const shape = instantiateShape(template);

	for (let i = 0; i < template.numObstacles; ++i) {
		if (template.pattern && !template.pattern[i % template.pattern.length]) {
			continue;
		}

		const proportion = i / template.numObstacles;
		const baseAngle = proportion * (2 * Math.PI);
		const layoutAngleOffset = (template.layoutAngleOffsetInRevs || 0) * 2 * Math.PI;
		const orientationAngleOffset = (template.orientationAngleOffsetInRevs || 0) * 2 * Math.PI;
		const position = vector.fromAngle(baseAngle + layoutAngleOffset).mul(template.layoutRadius).add(vectorCenter);

		const angle = baseAngle + layoutAngleOffset + orientationAngleOffset;
		addObstacle(world, position, angle, shape, template);
	}
}

function instantiateShape(layout: ObstacleLayout): shapes.Shape {
	if (!layout.numPoints && layout.angularWidthInRevs) {
		// Arc
		const angularWidth = 2 * Math.PI * layout.angularWidthInRevs;
		return shapes.createArc(layout.layoutRadius, layout.extent, angularWidth / 2);
	} else if (layout.numPoints === 0) {
		// Circle
		return shapes.createCircle(layout.extent);
	} else if (layout.angularWidthInRevs) {
		// Trapezoid
		const adjacentAngle = Math.PI * layout.angularWidthInRevs;
		const hypotonuseMultiplier = 1 / Math.cos(adjacentAngle);

		const topLeft = vector.fromAngle(-adjacentAngle, hypotonuseMultiplier * (layout.layoutRadius + layout.extent));
		const bottomLeft = vector.fromAngle(-adjacentAngle, hypotonuseMultiplier * (layout.layoutRadius - layout.extent));

		const topRight = vector.fromAngle(adjacentAngle, hypotonuseMultiplier * (layout.layoutRadius + layout.extent));
		const bottomRight = vector.fromAngle(adjacentAngle, hypotonuseMultiplier * (layout.layoutRadius - layout.extent));

		const objCenter = vector.fromAngle(0, layout.layoutRadius);
		const points = new Array<pl.Vec2>();
		points.push(vector.diff(topLeft, objCenter));
		points.push(vector.diff(topRight, objCenter));
		points.push(vector.diff(bottomRight, objCenter));
		points.push(vector.diff(bottomLeft, objCenter));

		return shapes.createPolygon(points);
	} else {
		// Radial polygon
		return shapes.createRadial(layout.numPoints, layout.extent);
	}
}

export function allowSpellChoosing(world: w.World, heroId: string) {
	if (heroId) {
		// Only allow spells to be changed before game starts or if hero has died
		return world.tick < world.startTick || !!world.winner || !world.objects.has(heroId);
	} else {
		// Cannot choose spells if observing
		return false;
	}
}

function handleSync(ev: w.Snapshot, world: w.World) {
	const mySnapshot = dequeueSnapshot(ev.tick, world);
	const theirSnapshot: w.Snapshot = ev;

	theirSnapshot.objectLookup.forEach((theirHeroSnapshot, objId) => {
		const myHeroSnapshot = mySnapshot.objectLookup.get(objId);

		const obj = world.objects.get(objId);
		if (!(obj)) {
			// Cannot sync non-existent hero
			return;
		}

		if (myHeroSnapshot && !theirHeroSnapshot) {
			// Sync death
			if (obj.category === "hero" || obj.category === "obstacle") {
				obj.health = 0;
			}
		} else if (!(myHeroSnapshot && theirHeroSnapshot)) {
			// Dead in my version but not in theirs, can't sync this
		} else {
			if ((obj.category === "hero" || obj.category === "obstacle") &&
				(myHeroSnapshot.health !== undefined && theirHeroSnapshot.health !== undefined)) {
				const healthDiff = theirHeroSnapshot.health - myHeroSnapshot.health;
				obj.health = Math.min(obj.maxHealth, obj.health + healthDiff);
			}
			if (myHeroSnapshot.angle !== undefined && theirHeroSnapshot.angle !== undefined) {
				const angleDiff = theirHeroSnapshot.angle - myHeroSnapshot.angle;
				obj.body.setAngle(obj.body.getAngle() + angleDiff);
			}

			const posDiff = vector.diff(theirHeroSnapshot.pos, myHeroSnapshot.pos);
			if (posDiff.lengthSquared() > Precision * Precision) {
				const position = obj.body.getPosition();
				position.add(posDiff);
				obj.body.setPosition(position);

				if (!obj.uiEase) {
					obj.uiEase = vector.zero();
				}
				obj.uiEase.sub(posDiff);
			}
		}

	});

	return true;
}

function dequeueSnapshot(tick: number, world: w.World) {
	while (world.snapshots.length > 0) {
		const snapshot = world.snapshots.shift();
		if (snapshot.tick === tick) {
			return snapshot;
		}
	}
	return null;
}

function handleSpellChoosing(ev: n.SpellsMsg, heroId: string, world: w.World) {
	if (!allowSpellChoosing(world, heroId)) {
		return true;
	}

	const hero = world.objects.get(heroId);
	if (hero && hero.category === "hero") {
		if (hero.casting && hero.casting.uninterruptible) {
			return false;
		}

		assignKeyBindingsToHero(hero, ev.keyBindings, world);
		removeUnknownProjectilesFromHero(hero, world); // Disallow strategies which use two spells that should never co-occur
	}

	return true;
}

function handleClosing(ev: n.CloseGameMsg, world: w.World) {
	const isNew = ev.closeTick < world.startTick; // This message gets sent twice, don't respond to it multiple times
	world.startTick = ev.closeTick;

	if (world.tick >= world.startTick) {
		// Close any customising dialogs as they cannot be used anymore now the game has started
		world.ui.toolbar.customizingBtn = null;

		world.objects.forEach(hero => {
			if (hero.category === "hero") {
				resetHeroOnGameStart(hero, world);
			}
		});
	}

	world.ui.notifications.push({
		type: "closing",
		ticksUntilClose: ev.waitPeriod,
		message: world.startMessage,
	});

	return true;
}

function resetHeroOnGameStart(hero: w.Hero, world: w.World) {
	if (!isInsideMap(hero, world)) {
		const RecoverProportion = 0.75;

		const oldOffset = vector.diff(hero.body.getPosition(), vectorCenter);
		const newOffset = vector.relengthen(oldOffset, calculateWorldMinExtent(world) * RecoverProportion);
		const newPos = vectorCenter.clone().add(newOffset);
		const adjustment = vector.diff(newPos, hero.body.getPosition());

		if (!hero.uiEase) {
			hero.uiEase = vector.zero();
		}
		hero.uiEase.addMul(-1, adjustment);

		applyPosDelta(hero, adjustment);
	}

	// Clear any stockpiled burns
	hero.buffs.forEach(buff => {
		if (buff.resetOnGameStart) {
			buff.expireTick = Math.min(buff.expireTick, world.startTick);
		}
	});
}

function handleTeams(ev: n.TeamsMsg, world: w.World) {
	if (ev.teams) {
		assignTeams(ev.teams, world);
		world.ui.notifications.push({
			type: "teams",
			teamSizes: ev.teams.map(x => x.length),
		});
	}

	return true;
}

function assignTeams(teams: string[][], world: w.World) {
	const Visuals = world.settings.Visuals;

	for (let i = 0; i < teams.length; ++i) {
		const team = teams[i];
		const teamId = `team${i}`;
		const teamColor = team.some(heroId => isPresentOrPastSelf(heroId, world)) ? Visuals.AllyColor : Visuals.TeamColors[i];

		for (let j = 0; j < team.length; ++j) {
			const heroId = team[j];
			world.teamAssignments = world.teamAssignments.set(heroId, teamId);

			const player = world.players.get(heroId);
			player.uiColor = isPresentOrPastSelf(heroId, world) ? Visuals.MyHeroColor : colorWheel.teamColor(teamColor);
		}

		world.teams = world.teams.set(teamId, {
			teamId,
			color: teamColor,
			heroIds: team,
		});
	}

	world.teamAssignments.forEach((teamId, heroId) => {
		console.log("Team", teamId, heroId);
	});
}

function isPresentOrPastSelf(heroId: string, world: w.World) {
	if (heroId === world.ui.myHeroId) {
		return true;
	}

	const player = world.players.get(heroId);
	if (player && player.userHash === world.ui.myUserHash) {
		return true;
	}

	return false;
}

function handleBotting(ev: n.BotActionMsg, world: w.World) {
	const Visuals = world.settings.Visuals;
	const World = world.settings.World;

	console.log("Bot joined:", ev.heroId);

	let hero = world.objects.get(ev.heroId);
	if (!hero) {
		if (world.players.has(ev.heroId)) {
			console.log("Cannot revive player", ev.heroId);
			return true;
		}

		hero = addHero(world, ev.heroId);
		assignKeyBindingsToHero(hero, ev.keyBindings, world);
	} else if (hero.category !== "hero") {
		throw "Player tried to join as non-hero: " + ev.heroId;
	}

	const player: w.Player = {
		heroId: hero.id,
		controlKey: ev.controlKey,
		userId: null,
		userHash: null,
		name: World.BotName,
		uiBaseColor: Visuals.BotColor,
		uiColor: Visuals.BotColor,
		isMobile: false,
		isBot: true,
		isSharedBot: true,
	};

	world.players = world.players.set(hero.id, player);
	world.activePlayers = world.activePlayers.delete(hero.id);
	world.controlKeys.set(ev.controlKey, hero.id);

	world.ui.notifications.push({ type: "bot", player });

	return true;
}

function handleJoining(ev: n.JoinActionMsg, world: w.World) {
	console.log("Player joined:", ev.heroId, ev.playerName, ev.userHash, ev.userId);
	let hero = world.objects.get(ev.heroId);
	if (!hero) {
		if (world.players.has(ev.heroId)) {
			console.log("Cannot revive player", ev.heroId);
			return true;
		}

		hero = addHero(world, ev.heroId);
		assignKeyBindingsToHero(hero, ev.keyBindings, world);
	} else if (hero.category !== "hero") {
		throw "Player tried to join as non-hero: " + ev.heroId;
	}

	const uiBaseColor = chooseNewPlayerColor(ev.userHash, world);

	const player: w.Player = {
		heroId: hero.id,
		controlKey: ev.controlKey,
		userId: ev.userId,
		userHash: ev.userHash,
		name: ev.playerName,
		uiBaseColor,
		uiColor: choosePlayerColor(hero.id, ev.userHash, uiBaseColor, world),
		isBot: false,
		isSharedBot: false,
		isMobile: ev.isMobile,
	};

	world.players = world.players.set(hero.id, player);
	world.activePlayers = world.activePlayers.add(hero.id);
	world.controlKeys.set(ev.controlKey, hero.id);

	world.ui.notifications.push({ type: "join", player });

	return true;
}

function choosePlayerColor(heroId: string, userHash: string, baseColor: string, world: w.World) {
	const Visuals = world.settings.Visuals;
	
	if (heroId === world.ui.myHeroId || userHash === world.ui.myUserHash) {
		return Visuals.MyHeroColor;
	} else if (world.teamAssignments.has(heroId)) {
		const teamId = world.teamAssignments.get(heroId);
		const team = world.teams.get(teamId);
		return colorWheel.teamColor(team.color);
	} else {
		return baseColor
	}
}

function chooseNewPlayerColor(userHash: string, world: w.World) {
	const Visuals = world.settings.Visuals;

	const preferredColor = colorWheel.getPreferredColor(userHash);

	let alreadyUsedColors = new Set<string>();	
	world.objects.forEach(hero => {
		if (hero && hero.category === "hero") {
			const player = world.players.get(hero.id);
			if (player && player.userHash !== userHash) {
				// If player reconnecting, allow their color to be reused
				alreadyUsedColors.add(player.uiBaseColor);
			}
		}
	});
 	let uiColor: string = null;
	if (preferredColor) {
		uiColor = colorWheel.takeColor(preferredColor, alreadyUsedColors, Visuals.Colors)
	} else {
		uiColor = colorWheel.takeColor(null, alreadyUsedColors, Visuals.Colors);
	}

	if (!uiColor) {
		uiColor = Visuals.Colors[0];
	}

	colorWheel.setPreferredColor(userHash, uiColor);
 	return uiColor;	
}

function handleLeaving(ev: n.LeaveActionMsg, world: w.World) {
	console.log(`Player left: ${ev.heroId} split=${ev.split} controlKey=${ev.controlKey}`);
	const player = world.players.get(ev.heroId);
	if (!player) {
		return true;
	}

	world.controlKeys.delete(player.controlKey);
	world.activePlayers = world.activePlayers.delete(ev.heroId);

	world.ui.notifications.push({ type: "leave", player, split: ev.split });

	const hero = world.objects.get(ev.heroId);
	if (hero && hero.category == "hero") {
		if (world.winner) {
			hero.exitTick = world.tick;

			// Mark player as dead so they cannot reconnect to this game
			const newPlayer: w.Player = {
				...player,
				dead: true,
			};

			world.players = world.players.set(ev.heroId, newPlayer);
		} else if (ev.controlKey) {
			// Replace leaving hero with bot
			const newPlayer: w.Player = {
				...player,
				controlKey: ev.controlKey,
				isBot: true,
				isSharedBot: true,
				isMobile: false,
			};

			world.players = world.players.set(ev.heroId, newPlayer);
			world.controlKeys.set(newPlayer.controlKey, ev.heroId);
		} else {
			// This player split off from this game
			hero.exitTick = world.tick;
			removeProjectilesForHero(hero.id, world); // Don't let their leftover projectiles affect the game

			// Mark player as left so they don't get rated
			const newPlayer: w.Player = {
				...player,
				left: true,
			};

			world.players = world.players.set(ev.heroId, newPlayer);
		}
	}

	return true;
}

function handleFinishing(ev: n.FinishGameMsg, world: w.World) {
	world.finished = true;

	return true;
}

function removeBots(world: w.World) {
	let newPlayers = world.players;

	world.players.forEach(player => {
		if (player.isBot) {
			const hero = world.objects.get(player.heroId);
			if (hero && hero.category === "hero") {
				hero.exitTick = world.tick + BotsExitAfterTicks;
			}

			// Mark player as dead so they cannot reconnect to this game
			const newPlayer = {
				...player,
				dead: true,
			};
			newPlayers = newPlayers.set(player.heroId, newPlayer);
		}
	});

	world.players = newPlayers;
}

function handleActions(world: w.World) {
	world.actionMessages.forEach(actionData => {
		const heroId = world.controlKeys.get(actionData.c);
		if (heroId) {
			if (actionData.type === n.ActionType.GameAction) {
				world.actions.set(heroId, {
					type: actionData.s,
					target: pl.Vec2(actionData.x, actionData.y),
					release: actionData.r,
				});
			} else if (actionData.type === n.ActionType.Spells) {
				handleSpellChoosing(actionData, heroId, world);
			}
		}
	});
	world.actionMessages.length = 0;
}

function act(world: w.World) {
	const nextActions = new Map<string, w.Action>();
	world.objects.forEach(hero => {
		if (hero.category !== "hero") { return; }

		let action = world.actions.get(hero.id);
		if (action) {
			hero.target = action.target;
		}

		if (action && action.release) {
			if (hero.casting && hero.casting.action.type === action.type) {
				hero.casting.releaseTick = world.tick;
			}
			action = null;
		}

		if (action) {
			const spell = world.settings.Spells[action.type];
			if (spell) {
				const done = applyPreAction(world, hero, action, spell);
				if (done) {
					action = null;
				}
			}
		}

		if (hero.casting) {
			if (action && hero.casting.action !== action) {
				// Casting something new counts as releasing
				hero.casting.releaseTick = world.tick;
			}

			if (!action || hero.casting.uninterruptible) {
				// Wait until casting action is completed
				nextActions.set(hero.id, action);
				action = hero.casting.action;
			} else {
				// Allow the casting action to be interrupted
			}
		}

		performHeroActions(world, hero, action);

		const movementProportion = calculateMovementProportion(hero, world);
		moveTowards(world, hero, hero.moveTo, movementProportion);
	});
	world.actions = nextActions;
}

function assignKeyBindingsToHero(hero: w.Hero, keyBindings: KeyBindings, world: w.World) {
	const resolved = resolveKeyBindings(keyBindings, world.settings);

	const previousSpellIds = wu(hero.keysToSpells.values()).toArray();
	hero.keysToSpells = resolved.keysToSpells;
	hero.spellsToKeys = resolved.spellsToKeys;
	const newSpellIds = wu(hero.keysToSpells.values()).toArray();

	// Set some cooldown to make it flash on change
	const changedSpellIds = _.difference(newSpellIds, previousSpellIds);
	changedSpellIds.forEach(spellId => {
		hero.spellChangedTick.set(spellId, world.tick);
		attachSpell(spellId, hero, world);
	});

	if (world.tick < world.startTick) {
		// Record which spells were used for stats later
		world.spellRecords.set(hero.id, newSpellIds);
	}
}

function attachSpell(spellId: string, hero: w.Hero, world: w.World) {
	const spell = world.settings.Spells[spellId];
	if (spell.passive) {
		applyBuffsFrom(spell.buffs, hero.id, hero, world, {
			spellId,
		});
	}
}

export function resolveKeyBindings(keyBindings: KeyBindings, settings: AcolyteFightSettings): ResolvedKeyBindings {
	const Choices = settings.Choices;

	let keysToSpells = new Map<string, string>();
	let spellsToKeys = new Map<string, string>();
	for (var key in Choices.Options) {
		let spellId = keyBindings[key];

		const validOptions = _.flatten(Choices.Options[key]);
		if (!(validOptions.indexOf(spellId) >= 0)) {
			spellId = validOptions[0];
		}

		keysToSpells.set(key, spellId);
		spellsToKeys.set(spellId, key);
    }
    return {
        keysToSpells: keysToSpells,
        spellsToKeys: spellsToKeys,
    };
}

function removeUnknownProjectilesFromHero(hero: w.Hero, world: w.World) {
	world.objects.forEach(obj => {
		if (obj.category === "projectile" && obj.owner === hero.id && !hero.spellsToKeys.has(obj.type)) {
			obj.expireTick = world.tick;
		}
	});
}

function removeProjectilesForHero(heroId: string, world: w.World) {
	world.objects.forEach(obj => {
		if (obj.category === "projectile" && obj.owner === heroId) {
			obj.expireTick = world.tick;
		}
	});
}

function performHeroActions(world: w.World, hero: w.Hero, action: w.Action) {
	if (!action || !isValidAction(action, hero)) {
		return; // Nothing to do
	}
	const spell = world.settings.Spells[action.type];
	if (!spell) {
		return; // Unknown spell
	}

	const uninterruptible = _.isNil(spell.interruptibleAfterTicks) || spell.interruptibleAfterTicks > 0;

	// Start casting a new spell
	if (!hero.casting || action !== hero.casting.action) {
		if (hero.casting) {
			// Cancel previous spell
			const previousSpell = world.settings.Spells[hero.casting.action.type];
			if (previousSpell) {
				cancelCooldown(hero, previousSpell.id, previousSpell.interruptCancel, world);
			}
		}

		hero.casting = {
			id: world.nextObjectId++,
			action: action,
			color: spell.color,
			stage: w.CastStage.Cooldown,
			initialAngle: vector.angleDiff(action.target, hero.body.getPosition()),
		};

		if (!w.Actions.NonGameStarters.some(x => x === spell.id)) {
			const player = world.players.get(hero.id);
			if (player) {
				player.nonIdle = true;
			}
		}
	}

	if (hero.casting.stage === w.CastStage.Cooldown) {
		hero.casting.movementProportion = 1.0;

		if (spell.cooldown) {
			const cooldown = cooldownRemaining(world, hero, spell.id);
			if (cooldown > 0) {
				if (cooldown > world.settings.Hero.MaxCooldownWaitTicks) {
					// Just cancel spells if they're too far off cooldown
					hero.casting = null;

					world.ui.events.push({
						type: "cast",
						success: false,
						tick: world.tick,
						heroId: hero.id,
						target: action.target,
						spellId: action.type,
					});
				}
				return;
			}
		}

		hero.casting.movementProportion = 0.0;
		++hero.casting.stage;
	}

	if (hero.casting.stage === w.CastStage.Throttle) {
		hero.casting.movementProportion = 1.0;

		if (spell.throttle) {
			if (world.tick < hero.throttleUntilTick) {
				return;
			}
			hero.throttleUntilTick = world.tick + world.settings.Hero.ThrottleTicks;
		}

		hero.casting.movementProportion = 0.0;
		++hero.casting.stage;
	}

	if (hero.casting.stage === w.CastStage.Orientating) {
		hero.casting.uninterruptible = uninterruptible;

		const angleDiff = spell.untargeted ? 0 : turnTowards(hero, action.target);
		if (spell.maxAngleDiffInRevs !== undefined && angleDiff > spell.maxAngleDiffInRevs * 2 * Math.PI) {
			return; // Wait until are facing the target
		}

		if (spell.cooldown && cooldownRemaining(world, hero, spell.id) > 0) {
			// Recheck cooldown just before casting because refract can become invalid by this point
			hero.casting = null;
			return;
		}

		hero.casting.castStartTick = world.tick;
		hero.casting.uninterruptible = false;
		++hero.casting.stage;
	}

	if (spell.strikeCancel && hero.strikeTick && hero.strikeTick >= hero.casting.castStartTick) {
		// Spell cancelled by getting struck
		cancelCooldown(hero, spell.id, spell.strikeCancel, world);
		hero.casting.stage = w.CastStage.Complete;
	}

	if (spell.release && spell.release.interrupt && hero.casting.releaseTick && world.tick >= hero.casting.castStartTick + (spell.release.interruptibleAfterTicks || 0)) {
		// Spell cancelled by releasing button
		hero.casting.stage = w.CastStage.Complete;
	}

	if (hero.casting.stage === w.CastStage.Charging) {
		// Entering charging stage
		if (!hero.casting.chargeStartTick) {
			hero.casting.chargeStartTick = world.tick;
			hero.casting.uninterruptible = uninterruptible;
			hero.casting.movementProportion = spell.movementProportionWhileCharging;

			applyBuffsFrom(spell.chargeBuffs, hero.id, hero, world, {
				spellId: spell.id,
			});

			world.ui.events.push({
				type: "cast",
				success: true,
				tick: world.tick,
				heroId: hero.id,
				target: action.target,
				spellId: action.type,
			});
		}
		// Orientate during charging
		if (spell.revsPerTickWhileCharging > 0 && hero.target) {
			turnTowards(hero, hero.target, spell.revsPerTickWhileCharging);
		}

		// Update charging status
		const ticksCharging = world.tick - hero.casting.chargeStartTick;
		hero.casting.proportion = Math.min(1, ticksCharging / spell.chargeTicks);
		
		// Waiting for charging to complete
		if (spell.release && spell.release.maxChargeTicks) {
			if (!(hero.casting.releaseTick || ticksCharging >= spell.release.maxChargeTicks)) {
				return;
			}
		} else {
			if (spell.chargeTicks && ticksCharging < spell.chargeTicks) {
				return;
			}
		}

		// Exiting charging stage
		hero.casting.proportion = null;
		hero.casting.uninterruptible = false;
		hero.casting.movementProportion = 0.0;
		++hero.casting.stage;
	}

	if (hero.casting.stage === w.CastStage.Channelling) {
		// Start channelling
		if (!hero.casting.channellingStartTick) {
			hero.casting.channellingStartTick = world.tick;
			hero.casting.uninterruptible = uninterruptible;
			hero.casting.movementProportion = spell.movementProportionWhileChannelling;

			if (spell.cooldown) {
				setCooldown(world, hero, spell.id, spell.cooldown);
			}

			if (hero.casting.color) {
				hero.uiCastTrail = {
					spellId: hero.casting.action.type,
					color: hero.casting.color,
					glow: spell.glow,
					castTick: world.tick,
				};
			}
		}

		// Update interruptibility
		hero.casting.uninterruptible =
			_.isNil(spell.interruptibleAfterTicks)
			|| (world.tick - hero.casting.channellingStartTick) < spell.interruptibleAfterTicks;

		// Orientate during channelling
		hero.body.setAngularVelocity(0); // Don't allow a spray to go everywhere if hit creates angular momentum
		if (spell.revsPerTickWhileChannelling > 0 && hero.target) {
			turnTowards(hero, hero.target, spell.revsPerTickWhileChannelling);
		}

		const done = applyAction(world, hero, action, spell);
		if (done) {
			hero.casting.uninterruptible = false;
			hero.casting.movementProportion = 0.0;
			++hero.casting.stage;
		}
	}

	if (hero.casting.stage === w.CastStage.Complete) {
		hero.casting = null;
	}
}

function cancelCooldown(hero: w.Hero, spellId: string, cancelParams: SpellCancelParams, world: w.World) {
	if (!cancelParams) { return };

	const channellingTime = hero.casting.channellingStartTick ? world.tick - hero.casting.channellingStartTick : 0;
	const maxChannellingTicks = cancelParams.maxChannelingTicks ? cancelParams.maxChannelingTicks : Infinity;
	if (cancelParams.cooldownTicks !== undefined && channellingTime <= maxChannellingTicks) {
		setCooldown(world, hero, spellId, cancelParams.cooldownTicks);
	}
}

function turnTowards(hero: w.Hero, target: pl.Vec2, revsPerTick?: number) {
	if (revsPerTick === undefined) {
		revsPerTick = hero.revolutionsPerTick;
	}

	const targetAngle = vector.angleDiff(target, hero.body.getPosition());
	const currentAngle = hero.body.getAngle();

	const newAngle = vector.turnTowards(currentAngle, targetAngle, revsPerTick * 2 * Math.PI);
	hero.body.setAngle(newAngle);

	return Math.abs(vector.angleDelta(newAngle, targetAngle));
}

function isValidAction(action: w.Action, hero: w.Hero) {
	if (action.type === w.Actions.Move
		|| action.type === w.Actions.MoveAndCancel
		|| action.type === w.Actions.Stop
		|| action.type === w.Actions.Retarget) {

		return true;
	} else {
		return hero.spellsToKeys.has(action.type);
	}
}

function applyPreAction(world: w.World, hero: w.Hero, action: w.Action, spell: Spell): boolean {
	switch (spell.action) {
		case "move": return movePreAction(world, hero, action, spell);
		case "retarget": return true; // All actions retarget - nothing extra to do
		default: return false;
	}
}

function movePreAction(world: w.World, hero: w.Hero, action: w.Action, spell: MoveSpell) {
	hero.moveTo = action.target;

	// To cancel, say we're not done, this makes the move spell replace the current spell and cancel
	const done = !spell.cancelChanneling;
	return done;
}

function applyAction(world: w.World, hero: w.Hero, action: w.Action, spell: Spell): boolean {
	spellPreactions(world, hero, action, spell);

	switch (spell.action) {
		case "stop": return stopAction(world, hero, action, spell); // Do nothing
		case "buff": return buffAction(world, hero, action, spell);
		case "projectile": return spawnProjectileAction(world, hero, action, spell);
		case "charge": return chargeProjectileAction(world, hero, action, spell);
		case "spray": return sprayProjectileAction(world, hero, action, spell);
		case "focus": return focusAction(world, hero, action, spell);
		case "saber": return saberAction(world, hero, action, spell);
		case "scourge": return scourgeAction(world, hero, action, spell);
		case "teleport": return teleportAction(world, hero, action, spell);
		case "thrust": return thrustAction(world, hero, action, spell);
		case "wall": return wallAction(world, hero, action, spell);
		case "shield": return shieldAction(world, hero, action, spell);
		default: return true;
	}
}

function spellPreactions(world: w.World, hero: w.Hero, action: w.Action, spell: Spell) {
	if (world.tick === hero.casting.channellingStartTick) {
		if (spell.unlink) {
			hero.link = null;
		}

		if (spell.debuff) {
			hero.cleanseTick = world.tick;
		}

		if (spell.buffs) {
			applyBuffsFrom(spell.buffs, hero.id, hero, world, {
				spellId: spell.id,
			});
		}
	}
}

function handleCollisions(world: w.World) {
	let contact = world.physics.getContactList();
	while (contact) {
		if (!world.collisions.has(contact)) {
			// Sensors won't be in the collision array yet
			const collision = createCollisionFromContact(world, contact);
			if (collision) {
				world.collisions.set(contact, collision);
			}
		}
		contact = contact.getNext();
	}

	world.collisions.forEach(collision => handleCollision(world, collision));
	world.collisions.clear();
}

function handleCollision(world: w.World, collision: w.Collision) {
	if (collision) {
		handleCollisionBetween(world, collision.a, collision.b, collision.point);
		handleCollisionBetween(world, collision.b, collision.a, collision.point);
	}
}

function handleCollisionBetween(world: w.World, object: w.WorldObject, hit: w.WorldObject, collisionPoint: pl.Vec2) {
	if (object.category === "projectile") {
		if (collisionPoint) {
			object.uiPath.push(collisionPoint);
		}

		if (hit.category === "hero") {
			handleProjectileHitHero(world, object, hit);
		} else if (hit.category === "projectile") {
			handleProjectileHitProjectile(world, object, hit);
		} else if (hit.category === "obstacle") {
			if (recheckObstacleHit(hit, object.body.getPosition(), object.radius)) {
				handleProjectileHitObstacle(world, object, hit);
			}
		} else if (hit.category === "shield") {
			handleProjectileHitShield(world, object, hit);
		}
	} else if (object.category === "hero") {
		if (hit.category === "hero") {
			handleHeroHitHero(world, object, hit);
		} else if (hit.category === "projectile") {
			handleHeroHitProjectile(world, object, hit);
		} else if (hit.category === "obstacle") {
			if (recheckObstacleHit(hit, object.body.getPosition(), object.radius)) {
				handleHeroHitObstacle(world, object, hit);
			}
		} else if (hit.category === "shield") {
			handleHeroHitShield(world, object, hit);
		}
	} else if (object.category === "shield") {
		handleShieldHit(world, object, hit);
	} else if (object.category === "obstacle") {
		handleObstacleHit(world, object, hit);
	}
}

function recheckObstacleHit(obstacle: w.Obstacle, target: pl.Vec2, targetRadius: number) {
	return shapes.isConvex(obstacle.shape) || shapes.inside(obstacle.shape, obstacle.body.getPosition(), obstacle.body.getAngle(), target, targetRadius);
}

function handleObstacleHit(world: w.World, obstacle: w.Obstacle, hit: w.WorldObject) {
	if (hit.category === "projectile" || hit.category === "hero") {
		if (!recheckObstacleHit(obstacle, hit.body.getPosition(), hit.radius)) {
			return;
		}
	}

	if (hit.category === "obstacle" && hit.sensor) {
		// Cannot hit sensors
		return;
	}

	if (world.tick > world.startTick && (obstacle.expireOn & hit.categories) > 0) {
		obstacle.health = 0;
	}

	if (takeHit(obstacle, hit.id, world)) {
		if (hit.category === "hero" || hit.category === "obstacle") {
			if (obstacle.damage) {
				const packet: w.DamagePacket = {
					damage: obstacle.damage,
					lifeSteal: 0,
					fromHeroId: hit.category === "hero" ? calculateKnockbackFromId(hit, world) : null,
					isLava: true,
					noKnockback: true,
				};
				if (hit.category === "hero") {
					applyDamage(hit, packet, world);
				} else if (hit.category === "obstacle") {
					applyDamageToObstacle(hit, packet, world);
				}
				obstacle.activeTick = world.tick;
			}

			if (obstacle.selfDamage) {
				const selfPacket: w.DamagePacket = {
					damage: obstacle.selfDamage,
					lifeSteal: 0,
					fromHeroId: null,
					isLava: true,
					noKnockback: true,
				};
				applyDamageToObstacle(obstacle, selfPacket, world);
				obstacle.activeTick = world.tick;
			}
		}

		if (obstacle.buffs && obstacle.buffs.length > 0) {
			applyBuffsFrom(obstacle.buffs, null, hit, world, {
			});
			obstacle.activeTick = world.tick;
		}

		if (obstacle.impulse > 0 && isBumpable(hit)) {
			const Hero = world.settings.Hero;

			const impulse = vector.diff(hit.body.getPosition(), obstacle.body.getPosition())
			const typicalHeroMass = Hero.Density * Math.PI * Hero.Radius * Hero.Radius; // Scale the impulse to the mass so it always looks the same
			const massNormalizer = hit.body.getMass() / typicalHeroMass;

			impulse.mul(massNormalizer * obstacle.impulse / impulse.length());
			applyImpulseDelta(hit, impulse);

			obstacle.activeTick = world.tick;
		}
	}

	conveyor(world, hit, obstacle);

	obstacle.touchTick = world.tick;
}

function isBumpable(obj: w.WorldObject) {
	if (obj.category === "projectile") {
		return obj.bumpable;
	} else if (obj.category === "shield") {
		return obj.bumpable;
	}
	return true;
}

function handleShieldHit(world: w.World, shield: w.Shield, hit: w.WorldObject) {
	if (shield.type === "saber") {
		handleSaberHit(shield, hit, world);
	}
}

function handleSaberHit(saber: w.Saber, obj: w.WorldObject, world: w.World) {
	if (takeHit(saber, obj.id, world)) {
		if (obj.category === "hero" || obj.category === "obstacle") {
			if (saber.damageTemplate) {
				const packet = instantiateDamage(saber.damageTemplate, saber.owner, world);
				if (obj.category === "hero") {
					applyDamage(obj, packet, world);
				} else if (obj.category === "obstacle") {
					applyDamageToObstacle(obj, packet, world);
				}
			}

			if (saber.hitBuffs) {
				applyBuffsFrom(saber.hitBuffs, saber.owner, obj, world, {
					fromHeroId: saber.owner,
					spellId: saber.spellId,
				});
			}
		} else if (obj.category === "projectile") {
			if (obj.owner !== saber.owner && saber.takesOwnership && obj.shieldTakesOwnership && (calculateAlliance(saber.owner, obj.owner, world) & Alliances.Enemy) > 0) {
				// Redirect back to owner
				swapOwnership(obj, saber.owner, world);
			}

			if (destructibleBy(obj, saber.owner, world)) {
				obj.expireTick = world.tick;
			}
		}
	}
}

function handleHeroHitShield(world: w.World, hero: w.Hero, shield: w.Shield) {
	if (hero.thrust) {
		// Thrust into shield means the hero bounces off
		hero.thrust.nullified = true;
		shield.hitTick = world.tick;
	}
}

function handleHeroHitHero(world: w.World, hero: w.Hero, other: w.Hero) {
	const Hero = world.settings.Hero;

	// Push back other heroes
	if ((hero.collideWith & Categories.Hero) > 0 && (other.collideWith & Categories.Hero) > 0) {
		const impulse = vector.diff(other.body.getPosition(), hero.body.getPosition(),);
		let magnitude = Math.max(0, Hero.Radius * 2 - impulse.length()) * Hero.SeparationImpulsePerTick;

		let bumper = false;
		hero.buffs.forEach(bump => {
			if (bump.type === "bump") {
				if (takeHit(bump, other.id, world) && (calculateAlliance(hero.id, other.id, world) & Alliances.Enemy) > 0) {
					magnitude += bump.impulse;
					bumper = true;
				}
			}
		});

		impulse.mul(magnitude / impulse.length());
		applyImpulseDelta(other, impulse);

		if (bumper) {
			hero.bumpTick = world.tick;
			hero.hitTick = world.tick;

			applyDamage(other, {
				fromHeroId: hero.id,
				damage: 0,
				lifeSteal: 0,
			}, world);
		}
	}

	// If using thrust, cause damage
	if (hero.thrust) {
		if (!hero.thrust.alreadyHit.has(other.id)) {
			hero.thrust.alreadyHit.add(other.id);

			const alliance = calculateAlliance(hero.id, other.id, world);
			if ((alliance & Alliances.NotFriendly) > 0) {
				const damagePacket = instantiateDamage(hero.thrust.damageTemplate, hero.id, world);
				applyDamage(other, damagePacket, world);
			}
		}
	}
}

function handleHeroHitProjectile(world: w.World, hero: w.Hero, projectile: w.Projectile) {
	if (hero.thrust) {
		if (projectile.categories & Categories.Massive) {
			hero.thrust.nullified = true;
		}
	}
}

function handleHeroHitObstacle(world: w.World, hero: w.Hero, obstacle: w.Obstacle) {
	if (hero.thrust && !obstacle.sensor) {
		// Only cancel thrust when hitting a solid object
		const packet = instantiateDamage(hero.thrust.damageTemplate, hero.id, world);
		applyDamageToObstacle(obstacle, packet, world);
		obstacle.activeTick = world.tick;
		hero.thrust.nullified = true;
	}
}

function conveyor(world: w.World, obj: w.WorldObject, obstacle: w.Obstacle) {
	if (!obstacle.conveyor) {
		return;
	}

	if (obj.category === "projectile" && !obj.conveyable) {
		// Not conveyable
		return;
	}

	if (obj.category === "shield" && !obj.conveyable) {
		// Not conveyable
		return;
	}

	if (obj.category === "obstacle" && obj.sensor) {
		// Cannot move sensors
		return;
	}

	const outward = vector.diff(obj.body.getPosition(), vectorCenter);
	outward.normalize();

	let step = vector.zero();
	if (obstacle.conveyor.lateralSpeed) {
		step.addMul(obstacle.conveyor.lateralSpeed / TicksPerSecond, vector.rotateRight(outward));
	}

	if (obstacle.conveyor.radialSpeed) {
		step.addMul(obstacle.conveyor.radialSpeed / TicksPerSecond, outward);
	}

	applyPosDelta(obj, step);
}

function handleProjectileHitObstacle(world: w.World, projectile: w.Projectile, obstacle: w.Obstacle) {
	if (obstacle.sensor) {
		// Cannot hit sensors
		return;
	}

	if (takeHit(projectile, obstacle.id, world)) {
		if (!obstacle.undamageable) {
			let packet: w.DamagePacket = instantiateDamage(projectile.damageTemplate, projectile.owner, world);
			packet = scaleForPartialDamage(world, projectile, packet);
			applyDamageToObstacle(obstacle, packet, world);
		} else {
			obstacle.activeTick = world.tick;
		}
	}

	if (expireOn(world, projectile, obstacle)) {
		detonateProjectile(projectile, world);
		linkTo(projectile, obstacle, world);
		applySwap(projectile, obstacle, world);
		applyBuffsFromProjectile(projectile, obstacle, world);
		projectile.expireTick = world.tick;
	}
}

function handleProjectileHitProjectile(world: w.World, projectile: w.Projectile, other: w.Projectile) {
	if ((other.sense & projectile.categories) > 0 && (other.collideWith & projectile.categories) === 0) {
		// The other projectile just senses us, it does not collide with us
		return;
	}

	takeHit(projectile, other.id, world); // Make the projectile glow

	if (expireOn(world, projectile, other)) {
		detonateProjectile(projectile, world);
		linkTo(projectile, other, world);
		applySwap(projectile, other, world);
		projectile.expireTick = world.tick;
	}
}

function handleProjectileHitShield(world: w.World, projectile: w.Projectile, shield: w.Shield) {
	const myProjectile = shield.owner === projectile.owner;

	if (projectile.owner !== shield.owner && takeHit(projectile, shield.id, world)) {
		shield.hitTick = world.tick;
	}

	if (!myProjectile && projectile.shieldTakesOwnership && shield.takesOwnership && (calculateAlliance(shield.owner, projectile.owner, world) & Alliances.Enemy) > 0) { // Stop double redirections cancelling out
		// Redirect back to owner
		swapOwnership(projectile, shield.owner, world);
		reduceDamage(projectile, shield.damageMultiplier);
	}

	if (!myProjectile && (expireOn(world, projectile, shield) || shield.destroying && destructibleBy(projectile, shield.owner, world))) { // Every projectile is going to hit its owner's shield on the way out
		detonateProjectile(projectile, world);
		applySwap(projectile, shield, world);
		projectile.expireTick = world.tick;
	}
}

function swapOwnership(projectile: w.Projectile, newOwner: string, world: w.World) {
	projectile.target.heroId = projectile.owner;
	projectile.owner = newOwner;

	let fixture = projectile.body.getFixtureList();
	while (fixture) {
		if (fixture.getFilterGroupIndex() < 0) {
			const hero = world.objects.get(newOwner);
			if (hero && hero.category === "hero") {
				updateGroupIndex(fixture, hero.filterGroupIndex);
			} else {
				updateGroupIndex(fixture, 0);
			}
		}
		fixture = fixture.getNext();
	}
}

function reduceDamage(projectile: w.Projectile, multiplier: number) {
	projectile.damageTemplate = {
		...projectile.damageTemplate,
		damage: projectile.damageTemplate.damage * multiplier,
	};

	if (projectile.detonate) {
		projectile.detonate = {
			...projectile.detonate,
			damage: projectile.detonate.damage * multiplier,
		};
	}
}

function handleProjectileHitHero(world: w.World, projectile: w.Projectile, hero: w.Hero) {
	if ((projectile.collideWith & Categories.Shield) && isHeroShielded(hero, world)) {
		return;
	}

	if (takeHit(projectile, hero.id, world) && hero.id !== projectile.owner) {
		applyBuffsFromProjectile(projectile, hero, world);
		linkTo(projectile, hero, world);
		applySwap(projectile, hero, world);

		const alliance = calculateAlliance(projectile.owner, hero.id, world);
		if ((alliance & Alliances.NotFriendly) > 0) { // Don't damage allies
			let packet = instantiateDamage(projectile.damageTemplate, projectile.owner, world);
			packet = scaleForPartialDamage(world, projectile, packet);
			applyDamage(hero, packet, world);

			emitPushFromProjectile(projectile, hero, world);
		}
		projectile.hit = world.tick;
	}

	if (projectile.gravity) {
		applyGravity(projectile, hero, world);
	}
	if (projectile.bounce) {
		bounceToNext(projectile, hero, world);
	}
	if (expireOn(world, projectile, hero)) {
		detonateProjectile(projectile, world);
		projectile.expireTick = world.tick;
	}
}

function emitPushFromProjectile(projectile: w.Projectile, toHero: w.Hero, world: w.World) {
	let direction = projectile.body.getLinearVelocity();
	const owner = world.objects.get(projectile.owner);
	if (owner && owner.category === "hero") {
		// The projectile normally just ricocheted in a weird direction, so correct the direction
		direction = vector.diff(projectile.body.getPosition(), owner.body.getPosition());
	}

	emitPush(projectile.owner, direction, projectile.color, toHero.id, world);
}

function emitPush(fromHeroId: string, direction: pl.Vec2, color: string, toObjectId: string, world: w.World) {
	const push: w.PushEvent = {
		type: "push",
		tick: world.tick,
		owner: fromHeroId,
		objectId: toObjectId,
		direction,
		color,
	};
	world.ui.events.push(push);
}

function calculatePartialMultiplier(lifetime: number, partialDamage: PartialDamageParameters): number {
	let multiplier = 1;
	if (partialDamage) {
		const progress = Math.max(0, lifetime - (partialDamage.afterTicks || 0));
		let proportion = 1;
		if (progress < partialDamage.ticks) {
			if (partialDamage.step) {
				proportion = 0;
			} else {
				proportion = progress / partialDamage.ticks;
			}
		}

		const finalMultiplier = typeof partialDamage.finalMultiplier === 'number' ? partialDamage.finalMultiplier : 1;
		multiplier = partialDamage.initialMultiplier * (1 - proportion) + finalMultiplier * proportion;
	}
	return multiplier;
}

export function calculatePartialDamageMultiplier(world: w.World, projectile: w.Projectile, partialDamage: PartialDamageParameters = projectile.partialDamage): number {
	const lifetime = world.tick - projectile.createTick;
	return calculatePartialMultiplier(lifetime, partialDamage);
}

function scaleForPartialDamage(world: w.World, projectile: w.Projectile, packet: w.DamagePacket): w.DamagePacket {
	const multiplier = calculatePartialDamageMultiplier(world, projectile);
	if (multiplier < 1) {
		return {
			...packet,
			damage: packet.damage * multiplier,
		};
	} else {
		return packet;
	}
}

function takeHit(projectile: w.HitSource, hitId: string, world: w.World) {
	const hitTick = projectile.hitTickLookup.get(hitId);
	if (hitTick) {
		if (projectile.hitInterval) {
			if (world.tick - hitTick < projectile.hitInterval) {
				return false;
			}
		} else {
			return false;
		}
	}
	projectile.hitTickLookup.set(hitId, world.tick);
	projectile.hitTick = world.tick;
	return true;
}

function isHeroShielded(hero: w.Hero, world: w.World) {
	let isShielded = false;
	hero.shieldIds.forEach(shieldId => {
		if (world.objects.has(shieldId)) {
			isShielded = true;
		} else {
			hero.shieldIds.delete(shieldId);
		}
	});
	return isShielded;
}

export function isHeroInvisible(hero: w.Hero): w.VanishBuff {
	if (hero.invisible && hero.invisible.destroyedTick) {
		hero.invisible = null;
	}
	return hero.invisible;
}

function expireOn(world: w.World, projectile: w.Projectile, other: w.WorldObject) {
	const expireOn = (projectile.expireOn & other.categories) && (world.tick >= projectile.createTick + projectile.minTicks);
	if (!expireOn) { return false; }

	if (other.category === "obstacle") {
		if (other.sensor) {
			return false;
		}
		if (other.mirror && !projectile.expireOnMirror) {
			return false;
		}
	}

	if (other.category === "hero") {
		const alliance = calculateAlliance(projectile.owner, other.id, world);
		if (!(projectile.expireAgainstHeroes & alliance)) {
			return false;
		}
	} else if (other.category === "projectile" || other.category === "shield") {
		const alliance = calculateAlliance(projectile.owner, other.owner, world);
		if (!(projectile.expireAgainstObjects & alliance)) {
			return false;
		}
	}

	return true;
}

export function calculateAlliance(fromHeroId: string, toHeroId: string, world: w.World) {
	if (!(fromHeroId && toHeroId)) {
		return Alliances.Neutral;
	} else if (fromHeroId === toHeroId) {
		return Alliances.Self;
	}

	if (getTeam(fromHeroId, world) === getTeam(toHeroId, world)) {
		return Alliances.Ally;
	} else {
		return Alliances.Enemy;
	}
}

export function getTeam(heroId: string, world: w.World) {
	return world.teamAssignments.get(heroId) || heroId;
}

function findNearest(objects: Map<string, w.WorldObject>, target: pl.Vec2, predicate: (obj: w.WorldObject) => boolean): w.WorldObject {
	let nearestDistance = Infinity;
	let nearest: w.WorldObject = null;
	objects.forEach(obj => {
		if (!predicate(obj)) {
			return;
		}

		let distance = vector.distance(target, obj.body.getPosition());
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearest = obj;
		}
	});
	return nearest;
}

function applyGravity(projectile: w.Projectile, target: w.WorldObject, world: w.World) {
	if (!projectile.gravity || target.category !== "hero") {
		return;
	}
	projectile.expireTick = world.tick;

	target.gravity = {
		spellId: projectile.type,
		initialTick: world.tick,
		expireTick: world.tick + projectile.gravity.ticks,
		location: vector.clone(projectile.body.getPosition()),
		strength: projectile.gravity.impulsePerTick,
		radius: projectile.gravity.radius,
		power: projectile.gravity.power,
		render: projectile.gravity.render,
	};
	world.behaviours.push({ type: "gravityForce", heroId: target.id });
}

function applySwap(projectile: w.Projectile, target: w.WorldObject, world: w.World) {
	if (!(projectile && projectile.swapWith && target)) {
		return;
	}

	if ((target.categories & projectile.swapWith) > 0) {
		const epicenter = target.body.getPosition();
		applySwapAt(epicenter, projectile.owner, [target], projectile.sound, world);
	}

	// You only swap once
	projectile.swapWith = 0;
}

function applySwapAt(epicenter: pl.Vec2, ownerId: string, targets: w.WorldObject[], sound: string, world: w.World) {
	const SwapReduction = world.settings.World.SwapDistanceReduction;

	const owner = world.objects.get(ownerId);
	if (!(owner && owner.category === "hero")) {
		return;
	}

	const ownerPos = vector.clone(owner.body.getPosition());
	targets.forEach(target => {
		if (!target.swappable) { return; }
		if (target.id === ownerId) { return; }

		const targetPos = vector.clone(target.body.getPosition());
		target.body.setPosition(vector.diff(targetPos, epicenter).mul(SwapReduction).add(ownerPos));

		if (target.category === "hero") {
			world.ui.events.push({
				type: "teleport",
				tick: world.tick,
				sound,
				fromPos: targetPos,
				toPos: ownerPos,
				heroId: target.id,
			});
		}
	});

	const initialPos = vector.clone(owner.body.getPosition());
	owner.body.setPosition(epicenter);

	world.ui.events.push({
		type: "teleport",
		tick: world.tick,
		sound,
		fromPos: initialPos,
		toPos: vector.clone(owner.body.getPosition()),
		heroId: owner.id,
	});
}

function swapOnExpiry(projectile: w.Projectile, world: w.World) {
	applyBuffsFromProjectile(projectile, null, world);
	applySwap(projectile, null, world);
}

function applyBuffsFromProjectile(projectile: w.Projectile, target: w.WorldObject, world: w.World) {
	const durationMultiplier = calculatePartialDamageMultiplier(world, projectile, projectile.partialBuffDuration);
	applyBuffsFrom(projectile.buffs, projectile.owner, target, world, {
		spellId: projectile.type,
		durationMultiplier,
	});
}

function applyBuffsFrom(buffs: BuffTemplate[], fromHeroId: string, target: w.WorldObject, world: w.World, config: BuffContext = {}) {
	if (!(buffs && buffs.length > 0 && target)) {
		return;
	}

	buffs.forEach(template => {
		const collideWith = template.collideWith !== undefined ? template.collideWith : Categories.Hero;
		if (!(collideWith & target.categories)) {
			return;
		}

		const receiver = template.owner ? world.objects.get(fromHeroId) : target;
		const giver = template.owner ? (target && target.owner) : fromHeroId;
		if (!receiver) {
			return;
		} else if (receiver.category === "hero") {
			const against = template.against !== undefined ? template.against : Categories.All;
			if (against !== Categories.All) {
				const targetId = target ? target.id : null;
				if (!(calculateAlliance(fromHeroId, targetId, world) & against)) {
					return;
				}
			}

			instantiateBuff(template, receiver, world, {
				...config,
				fromHeroId: giver,
			});
		} else if (receiver.category === "obstacle") {
			applyBuffToObstacle(template, receiver, world, {
				...config,
				fromHeroId: giver,
			});
		}
	});
}

function applyBuffToObstacle(template: BuffTemplate, obstacle: w.Obstacle, world: w.World, config: BuffContext) {
	if (template.type === "burn") {
		if (!obstacle.undamageable) {
			const numHits = template.maxTicks / template.hitInterval;
			const packet = instantiateDamage(template.packet, config.fromHeroId, world);
			packet.damage *= numHits;
			applyDamageToObstacle(obstacle, packet, world);
		}
	}
}

function linkTo(projectile: w.Projectile, target: w.WorldObject, world: w.World) {
	const link = projectile.link;
	if (!link) {
		return;
	}

	const owner = world.objects.get(projectile.owner);
	if (!(
		target && ((target.categories & link.linkWith) > 0)
		&& owner && owner.category === "hero")) {
		return;
	}
	if (target.category === "projectile" && !target.linkable) {
		return;
	}

	const maxTicks = link.linkTicks;
	owner.link = {
		id: `link${world.nextObjectId++}`,

		spellId: projectile.type,
		targetId: target.id,

		redirectDamage: link.redirectDamage,
		channelling: link.channelling,

		minDistance: link.minDistance,
		maxDistance: link.maxDistance,
		selfFactor: link.selfFactor !== undefined ? link.selfFactor : 1,
		targetFactor: link.targetFactor !== undefined ? link.targetFactor : 1,
		impulsePerTick: link.impulsePerTick,
		sidewaysImpulsePerTick: link.sidewaysImpulsePerTick || 0,
		massInvariant: link.massInvariant,
		initialTick: world.tick,
		expireTick: world.tick + maxTicks,
		render: link.render,
	};
	world.behaviours.push({ type: "linkForce", heroId: owner.id });
}

function bounceToNext(projectile: w.Projectile, hit: w.Hero, world: w.World) {
	if (!(projectile.bounce && hit)) {
		return;
	}

	// Always bounce between owner and another target
	let nextTargetId: string;

	if (hit.id === projectile.owner) {
		nextTargetId = projectile.target.heroId;
	} else {
		if ((calculateAlliance(projectile.owner, hit.id, world) & Alliances.NotFriendly) > 0) {
			// Bouncer will now target the hero that it just hit
			projectile.target.heroId = hit.id;
		}
		nextTargetId = projectile.owner;
	}

	const nextTarget: w.WorldObject = world.objects.get(nextTargetId);
	if (!(nextTarget && nextTarget.category === "hero")) {
		return;
	}

	if (projectile.bounce.cleanseable && nextTarget.cleanseTick && nextTarget.cleanseTick >= projectile.createTick) {
		return;
	}

	if (isHeroInvisible(nextTarget) && (calculateAlliance(projectile.owner, nextTarget.id, world) & Alliances.NotFriendly) > 0) {
		return;
	}

	const currentSpeed = projectile.body.getLinearVelocity().length();
	const newVelocity = vector.diff(nextTarget.body.getPosition(), projectile.body.getPosition());
	newVelocity.mul(currentSpeed / newVelocity.length());
	projectile.body.setLinearVelocity(newVelocity);
}

function gravityForce(behaviour: w.GravityBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero" && hero.gravity)) {
		return false;
	}
	if (world.tick >= hero.gravity.expireTick || (hero.cleanseTick && hero.gravity.initialTick < hero.cleanseTick)) {
		hero.gravity = null;
		return false;
	}

	const impulse = vector.diff(hero.gravity.location, hero.body.getPosition());
	const distanceTo = impulse.length();
	if (distanceTo >= hero.gravity.radius) {
		hero.gravity = null;
		return false;
	}

	const proportion = Math.pow(1.0 - distanceTo / hero.gravity.radius, hero.gravity.power);
	const strength = hero.gravity.strength * proportion;
	impulse.mul(strength / impulse.length());

	applyImpulseDelta(hero, impulse);
	return true;
}

function attract(attraction: w.AttractBehaviour, world: w.World) {
	const orb = world.objects.get(attraction.objectId);
	if (!(orb)) {
		return false;
	}

	const epicenter = orb.body.getPosition();

	queryExtent(world, epicenter, attraction.radius, obj => {
		if (!((obj.categories & attraction.categories) > 0 && (obj.categories & attraction.notCategories) === 0)) {
			return;
		}

		if (obj.category === "hero") {
			if (!(calculateAlliance(attraction.owner, obj.id, world) & attraction.against)) {
				return;
			}
		} else if (obj.category === "projectile") {
			if (!obj.attractable) {
				return;
			} else if (!(obj.collideWith & attraction.collideLike)) {
				return;
			} else if (!(calculateAlliance(attraction.owner, obj.owner, world) & attraction.against)) {
				return;
			}
		}

		const acceleration = vector.diff(epicenter, obj.body.getPosition());
		const distanceTo = acceleration.length();
		if (distanceTo >= attraction.radius) {
			return;
		}
		acceleration.mul(attraction.accelerationPerTick / acceleration.length());

		if (!takeHit(attraction, obj.id, world)) {
			return;
		}

		const velocity = obj.body.getLinearVelocity();
		velocity.add(acceleration);

		if (attraction.maxSpeed) {
			velocity.clamp(attraction.maxSpeed);
		}

		obj.body.setLinearVelocity(velocity);
	});
	return true;
}

function aura(behaviour: w.AuraBehaviour, world: w.World): boolean {
	if (world.tick % behaviour.hitInterval !== 0) {
		return true;
	}

	const orb = world.objects.get(behaviour.objectId);
	if (!(orb && orb.category === "projectile")) {
		return false;
	}

	const epicenter = orb.body.getPosition();

	let hit = false;
	const packet = behaviour.remainingHits > 0 ? instantiateDamage(behaviour.packet, behaviour.owner, world) : null;
	queryExtent(world, epicenter, behaviour.radius + world.settings.World.SlopRadius, obj => {
		if (!(obj.category === "hero" && vector.distance(epicenter, obj.body.getPosition()) <= behaviour.radius + obj.radius)) {
			return;
		}

		if ((calculateAlliance(behaviour.owner, obj.id, world) & behaviour.against) === 0) {
			return;
		}

		if (!takeHit(behaviour, obj.id, world)) {
			return;
		}

		hit = true;
		applyDamage(obj, packet, world);
		applyBuffsFrom(behaviour.buffs, orb.owner, obj, world, {
		});

	});

	if (hit) {
		--behaviour.remainingHits;
	}

	return true;
}

function findHomingTarget(targetType: HomingType, projectile: w.Projectile, world: w.World) {
	let target: pl.Vec2 = null;
	if (targetType === w.HomingTargets.self) {
		const owner = world.objects.get(projectile.owner);
		if (owner) {
			target = owner.body.getPosition();
		}
	} else if (targetType === w.HomingTargets.enemy) {
		const targetObj = world.objects.get(projectile.target.heroId);
		if (targetObj) {
			target = targetObj.body.getPosition();

			// Handle invisible target
			if (targetObj.category === "hero") {
				const invisible = isHeroInvisible(targetObj);
				if (invisible) {
					target = invisible.initialPos;
				}
			}
		}
	} else if (targetType === w.HomingTargets.cursor) {
		target = projectile.target.pos;
	} else if (targetType === w.HomingTargets.release) {
		target = projectile.target.releasePos;
	} else if (targetType === w.HomingTargets.follow) {
		target = projectile.target.pos;

		const owner = world.objects.get(projectile.owner);
		if (owner && owner.category === "hero" && owner.target) {
			target = owner.target;
		}
	}
	return target;
}

function homing(homing: w.HomingBehaviour, world: w.World) {
	const obj = world.objects.get(homing.projectileId);
	if (!(obj && obj.category === "projectile")) {
		return false;
	}

	const target = findHomingTarget(homing.targetType, obj, world);
	if (!target) {
		return false;
	}

	const diff = vector.diff(target, obj.body.getPosition());

	// Home to target
	const currentVelocity = obj.body.getLinearVelocity();

	const currentAngle = vector.angle(currentVelocity);
	const idealAngle = vector.angle(diff);

	const angleDelta = vector.angleDelta(currentAngle, idealAngle);
	const maxTurnRate = homing.maxTurnProportion * Math.abs(angleDelta);
	const turnRate = Math.min(homing.turnRate, maxTurnRate);
	const newAngle = vector.turnTowards(currentAngle, idealAngle, turnRate);

	const currentSpeed = currentVelocity.length();
	let newSpeed = currentSpeed;
	if (homing.newSpeed !== undefined) {
		newSpeed = homing.newSpeed;
		obj.speed = homing.newSpeed;
		delete homing.newSpeed; // Only apply the new speed once
	}

	const newVelocity = vector.fromAngle(newAngle).mul(newSpeed);
	obj.body.setLinearVelocity(newVelocity);

	if (homing.expireWithinAngle && Math.abs(angleDelta) <= homing.expireWithinAngle) {
		// Aim is perfect, stop homing
		return false;
	}

	return world.tick < homing.expireTick;
}

function accelerate(behaviour: w.AccelerateBehaviour, world: w.World) {
	const projectile = world.objects.get(behaviour.projectileId);
	if (!(projectile && projectile.category === "projectile")) {
		return false;
	}

	if (projectile.speed < behaviour.maxSpeed) {
		projectile.speed = Math.min(behaviour.maxSpeed, projectile.speed + behaviour.accelerationPerTick);
	}

	const velocity = projectile.body.getLinearVelocity();
	const currentSpeed = velocity.length();
	if (currentSpeed < projectile.speed) {
		const newSpeed = Math.max(projectile.speed, currentSpeed + behaviour.accelerationPerTick);
		projectile.body.setLinearVelocity(vector.relengthen(velocity, newSpeed));
	}

	return true;
}

function linkForce(behaviour: w.LinkBehaviour, world: w.World) {
	const owner = world.objects.get(behaviour.heroId);
	if (!(owner && owner.category === "hero" && owner.link)) {
		return false;
	}

	if (world.tick >= owner.link.expireTick) {
		// Link expired
		owner.link = null;
		return false;
	}

	const target = world.objects.get(owner.link.targetId);
	if (!(owner && target)) {
		// Link owner or target dead
		owner.link = null;
		return false;
	}

	if (target.category === "hero" && target.cleanseTick && owner.link.initialTick < target.cleanseTick) {
		// Cleanse
		owner.link = null;
		return false;
	}

	if (owner.link.channelling && !(owner.casting && owner.casting.action.type === owner.link.spellId)) {
		// Channelling complete
		owner.link = null;
		return false;
	}

	const link = owner.link;
	const minDistance = link.minDistance;
	const maxDistance = link.maxDistance;

	const outward = vector.diff(target.body.getPosition(), owner.body.getPosition());
	const distance = outward.length();
	const impulsePerTick = link.impulsePerTick * Math.max(0, distance - minDistance) / (maxDistance - minDistance);

	const targetMassMultiplier = link.massInvariant ? (target.body.getMass() / owner.body.getMass()) : 1;
	if (impulsePerTick > 0) {
		applyImpulseDelta(owner, vector.relengthen(outward, link.selfFactor * impulsePerTick));
		applyImpulseDelta(target, vector.relengthen(outward, link.targetFactor * impulsePerTick * targetMassMultiplier).neg());
	}

	if (link.sidewaysImpulsePerTick > 0 && owner.target) {
		const toCursor = vector.diff(owner.target, target.body.getPosition());
		const toRight = vector.rotateRight(outward);
		const sidewaysMagnitude = pl.Vec2.dot(toRight, toCursor) / toRight.length() / toCursor.length();

		applyImpulseDelta(target, vector.relengthen(toRight, sidewaysMagnitude * link.sidewaysImpulsePerTick * targetMassMultiplier));
	}

	return true;
}

function updateHeroDamping(hero: w.Hero) {
	let damping = hero.linearDamping;
	hero.buffs.forEach(buff => {
		if (buff.type === "glide") {
			damping *= buff.linearDampingMultiplier;
		}
	});
	hero.body.setLinearDamping(damping);
}

function reflectFollow(behaviour: w.ReflectFollowBehaviour, world: w.World) {
	const obj = world.objects.get(behaviour.shieldId);
	if (!(obj && obj.category === "shield")) { return false; }

	const shield: w.Shield = obj;
	if (shield.type !== "reflect") { return false; }

	if (world.tick < shield.expireTick) {
		const hero = world.objects.get(shield.owner);
		if (hero && hero.category === "hero") {
			shield.body.setPosition(hero.body.getPosition());

			let targetAngle = hero.body.getAngle();
			if (hero.target) {
				targetAngle = vector.angleDiff(hero.target, hero.body.getPosition());
			}

			let angle = shield.body.getAngle();
			angle = vector.turnTowards(angle, targetAngle, shield.turnRate);
			shield.body.setAngle(angle);

			return true;
		} else {
			shield.expireTick = world.tick;
			return false;
		}
	} else {
		return false;
	}
}

function updateMaskBits(fixture: pl.Fixture, newMaskBits: number) {
	if (fixture.getFilterMaskBits() !== newMaskBits) {
		fixture.setFilterData({
			groupIndex: fixture.getFilterGroupIndex(),
			categoryBits: fixture.getFilterCategoryBits(),
			maskBits: newMaskBits,
		});
	}
}

function updateGroupIndex(fixture: pl.Fixture, newGroupIndex: number) {
	if (fixture.getFilterGroupIndex() !== newGroupIndex) {
		fixture.setFilterData({
			groupIndex: newGroupIndex,
			categoryBits: fixture.getFilterCategoryBits(),
			maskBits: fixture.getFilterMaskBits(),
		});
	}
}

function decayMitigation(behaviour: w.DecayMitigationBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	if (hero.damageSourceHistory.length > 0) {
		let newHistory = new Array<w.DamageSourceHistoryItem>();
		hero.damageSourceHistory.forEach(item => {
			if (world.tick >= item.expireTick) {
				let amount = hero.damageSources.get(item.heroId);
				amount -= item.amount;
				if (amount > 0) {
					hero.damageSources.set(item.heroId, amount);
				} else {
					hero.damageSources.delete(item.heroId);
				}
			} else {
				newHistory.push(item);
			}
		});
		hero.damageSourceHistory = newHistory;
	}
	return true;
}

function expireBuffs(behaviour: w.ExpireBuffsBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	hero.buffs.forEach((buff, id) => {
		if (isBuffExpired(buff, hero, world)) {
			detachBuff(buff, hero, world);
		}
	});

	return true;
}

function isBuffExpired(buff: w.Buff, hero: w.Hero, world: w.World) {
	if (buff.passiveSpellId) {
		// Passive buffs never expire, cannot be cleansed
		return !hero.spellsToKeys.has(buff.passiveSpellId)
	}

	if (world.tick >= buff.expireTick) {
		return true;
	} else if (buff.cleansable && hero.cleanseTick && buff.initialTick < hero.cleanseTick) {
		return true;
	} else if (buff.hitTick && hero.hitTick > buff.hitTick) {
		return true;
	} else if (buff.channellingSpellId && (!hero.casting || hero.casting.action.type !== buff.channellingSpellId)) {
		return true;
	} else if (buff.cancelOnBump && buff.initialTick < hero.bumpTick) {
		return true;
	} else 

	if (buff.link) {
		const hero = world.objects.get(buff.link.owner);
		if (!(hero && hero.category === "hero" && hero.link && hero.link.spellId === buff.link.spellId)) {
			return true;
		}
	}

	return false;
}

function expireOnOwnerDeath(behaviour: w.ExpireOnOwnerDeathBehaviour, world: w.World) {
	const projectile = world.objects.get(behaviour.projectileId);
	if (!(projectile && projectile.category === "projectile")) {
		return false;
	}

	const hero = world.objects.get(projectile.owner);
	if (!(hero && hero.category === "hero")) {
		projectile.expireTick = world.tick;
		return false;
	}

	return true;
}

function expireOnOwnerRetreat(behaviour: w.ExpireOnOwnerRetreatBehaviour, world: w.World) {
	const projectile = world.objects.get(behaviour.projectileId);
	if (!(projectile && projectile.category === "projectile")) {
		return false;
	}

	const hero = world.objects.get(projectile.owner);
	if (!(hero && hero.category === "hero" && vector.distance(hero.body.getPosition(), projectile.body.getPosition()) <= behaviour.maxDistance)) {
		projectile.expireTick = world.tick;
		return false;
	}

	return true;
}

function expireOnChannellingEnd(behaviour: w.ExpireOnChannellingEndBehaviour, world: w.World) {
	const projectile = world.objects.get(behaviour.projectileId);
	if (!(projectile && projectile.category === "projectile")) {
		return false;
	}

	const hero = world.objects.get(projectile.owner);
	if (!(hero && hero.category === "hero" && hero.casting && hero.casting.action.type === projectile.type)) {
		projectile.expireTick = world.tick;
		return false;
	}

	return true;
}

function detonate(detonate: w.DetonateBehaviour, world: w.World) {
	const obj = world.objects.get(detonate.projectileId);
	if (!(obj && obj.category === "projectile" && obj.detonate)) {
		return false;
	}

	if (world.tick === obj.expireTick) {
		detonateProjectile(obj, world);
		return false;
	} else {
		return true;
	}
}

function detonateProjectile(projectile: w.Projectile, world: w.World) {
	if (!projectile.detonate) {
		return;
	}

	// Apply damage
	const damageMultiplier = calculatePartialDamageMultiplier(world, projectile);
	const detonate: w.DetonateParameters = {
		...projectile.detonate,
		damage: projectile.detonate.damage * damageMultiplier,
	};

	if (projectile.partialDetonateRadius) {
		const radiusMultiplier = calculatePartialDamageMultiplier(world, projectile, projectile.partialDetonateRadius);
		detonate.radius *= radiusMultiplier;
	}

	if (projectile.partialDetonateImpulse) {
		const impulseMultiplier = calculatePartialDamageMultiplier(world, projectile, projectile.partialDetonateImpulse);
		detonate.minImpulse *= impulseMultiplier;
		detonate.maxImpulse *= impulseMultiplier;
	}

	let buffDurationMultiplier = 1;
	if (projectile.partialBuffDuration) {
		buffDurationMultiplier = calculatePartialDamageMultiplier(world, projectile, projectile.partialBuffDuration);
	}

	detonateAt(projectile.body.getPosition(), projectile.owner, detonate, world, {
		sourceId: projectile.id,
		color: projectile.color, 
		defaultSound: projectile.sound,
		buffDurationMultiplier,
	});

	// Don't allow for repeats
	projectile.detonate = null;
}

function detonateObstacle(obstacle: w.Obstacle, world: w.World) {
	if (!obstacle.detonate) {
		return;
	}

	const detonate = instantiateDetonate(obstacle.detonate, null, world);

	const owner: string = null;
	detonateAt(obstacle.body.getPosition(), owner, detonate, world, { sourceId: obstacle.id });

	// Don't allow for repeats
	obstacle.detonate = null;
}

function instantiateDetonate(template: DetonateParametersTemplate, fromHeroId: string, world: w.World): w.DetonateParameters {
	const damagePacket = instantiateDamage(template, fromHeroId, world);
	const knockbackScaling = calculateScaling(fromHeroId, world, template.knockbackScaling);

	return {
		...template,
		...damagePacket,
		minImpulse: (template.minImpulse || 0) * knockbackScaling,
		maxImpulse: (template.maxImpulse || 0) * knockbackScaling,
	};
}

function detonateAt(epicenter: pl.Vec2, owner: string, detonate: w.DetonateParameters, world: w.World, config: DetonateConfig) {
	const sound = detonate.sound || config.defaultSound;

	const seen = new Set<string>(); // queryExtent not guaranteed to hit once
	const swapTargets = new Array<w.WorldObject>();
	queryExtent(world, epicenter, detonate.radius + world.settings.World.SlopRadius, other => {
		if (seen.has(other.id)) {
			return;
		} else {
			seen.add(other.id);
		}

		if ((other.category === "hero" && other.collideWith > 0) || other.category === "projectile" || other.category === "obstacle") {
			const diff = vector.diff(other.body.getPosition(), epicenter);
			const extent = other.category === "obstacle" ? shapes.getMinExtent(other.shape) : other.radius;
			const explosionRadius = detonate.radius + extent; // +extent because only need to touch the edge

			const distance = diff.length();
			if (distance > explosionRadius) {
				return;
			}

			const proportion = 1.0 - (distance / explosionRadius);
			let applyKnockback = false;
			if (other.category === "hero") {
				const alliance = calculateAlliance(owner, other.id, world);
				const against = detonate.against !== undefined ? detonate.against : Alliances.NotFriendly;
				if ((alliance & against) > 0) {
					applyDamage(other, detonate, world);
					applyBuffsFrom(detonate.buffs, owner, other, world, {
						durationMultiplier: config.buffDurationMultiplier,
					});
					emitPush(owner, diff, config.color, other.id, world);

					applyKnockback = true;
				}

			} else if (other.category === "projectile") {
				if (destructibleBy(other, owner, world)) {
					other.expireTick = world.tick;
				}
			} else if (other.category === "obstacle") {
				if (!other.undamageable) {
					applyDamageToObstacle(other, detonate, world);
				}

				if (!other.static) {
					applyKnockback = true;
				}
			}

			if (detonate.swapWith > 0 && (other.categories & detonate.swapWith) > 0 && other.swappable) {
				swapTargets.push(other);
			}

			if (applyKnockback && detonate.maxImpulse) {
				const magnitude = (detonate.minImpulse + proportion * (detonate.maxImpulse - detonate.minImpulse));
				const direction = vector.relengthen(diff, magnitude);
				applyImpulseDelta(other, direction);
			}
		}
	});

	if (detonate.swapWith > 0) {
		applySwapAt(epicenter, owner, swapTargets, sound, world);
	}

	world.ui.events.push({
		type: "detonate",
		tick: world.tick,
		sourceId: config.sourceId,
		sound,
		pos: vector.clone(epicenter),
		radius: detonate.radius,
		explosionTicks: detonate.renderTicks,
	});
}

function destructibleBy(projectile: w.Projectile, detonatorHeroId: string, world: w.World) {
	if (projectile.destructible) {
		return (calculateAlliance(projectile.owner, detonatorHeroId, world) & projectile.destructible.against) > 0;
	} else {
		return false;
	}
}

function applyLavaDamage(world: w.World) {
	const World = world.settings.World;
	if (world.tick % World.LavaDamageInterval !== 0) {
		return;
	}

	const damagePacket: w.DamagePacket = {
		damage: (World.LavaDamageInterval / TicksPerSecond) * World.LavaDamagePerSecond,
		lifeSteal: World.LavaLifestealProportion,
		fromHeroId: null,
		isLava: true,
		noMitigate: true,
	};
	world.objects.forEach(obj => {
		if (obj.category === "hero") {
			if (!isInsideMap(obj, world)) {
				let damageMultiplier = 1.0;
				obj.buffs.forEach(buff => {
					if (buff.type === "lavaImmunity") {
						damageMultiplier *= buff.damageProportion;
					}
				});
				if (damageMultiplier > 0) {
					const heroDamagePacket = {
						...damagePacket,
						damage: damagePacket.damage * damageMultiplier,
						fromHeroId: calculateKnockbackFromId(obj, world),
					};
					applyDamage(obj, heroDamagePacket, world);

					applyBuffsFrom(World.LavaBuffs, null, obj, world);
				}
			}
		} else if (obj.category === "obstacle") {
			if (!isInsideMap(obj, world)) {
				applyDamageToObstacle(obj, damagePacket, world);
			}
		}
	});
}

function calculateKnockbackFromId(hero: w.Hero, world: w.World) {
	if (hero.knockbackHeroId && (calculateAlliance(hero.id, hero.knockbackHeroId, world) & Alliances.Enemy) > 0) {
		return hero.knockbackHeroId;
	} else {
		return null;
	}
}

export function isInsideMap(obj: w.WorldObject, world: w.World) {
	const pos = obj.body.getPosition();
	let extent = 0;
	if (obj.category === "obstacle") {
		extent = shapes.getMinExtent(obj.shape);
	} else if (obj.category === "hero" || obj.category === "projectile") {
		extent = obj.radius;
	}
	return isPositionInsideMap(pos, extent, world);
}

function isPositionInsideMap(pos: pl.Vec2, extent: number, world: w.World) {
	if (world.shrink <= 0) {
		return false;
	}

	// The world shape always stays the same, even though the world is shrinking. Project current object onto the world scale.
	const scale = Math.max(1e-6, calculateWorldMinExtent(world));
	const scaledDiff = vector.diff(pos, vectorCenter).mul(1 / scale);
	const scaledExtent = -extent / scale;
	return shapes.inside(world.shape, vectorZero, world.angle, scaledDiff, scaledExtent);
}

function shrink(world: w.World) {
	const Matchmaking = world.settings.Matchmaking;
	const World = world.settings.World;
	if (world.tick >= world.startTick && !world.winner) {
		const seconds = (world.tick - world.startTick) / TicksPerSecond;
		const proportion = Math.max(0, 1.0 - seconds / World.SecondsToShrink);

		const powerAlpha = Math.min(1, world.players.size / Matchmaking.MaxPlayers);
		const power = powerAlpha * World.ShrinkPowerMaxPlayers + (1 - powerAlpha) * World.ShrinkPowerMinPlayers;
		world.shrink = Math.pow(proportion, power);
	}
}

export function calculateWorldMinExtent(world: w.World) {
	return world.shrink * world.initialRadius;
}

function reap(world: w.World) {
	const Visuals = world.settings.Visuals;

	let heroKilled = false;
	world.objects.forEach(obj => {
		if (obj.category === "hero") {
			if ((obj.exitTick && world.tick >= obj.exitTick + Visuals.ExitTicks) || obj.health <= 0 && !hasHorcrux(obj, world)) {
				destroyObject(world, obj);
				if (!obj.exitTick) {
					// Exited intentionally, not a kill
					notifyKill(obj, world);
				}
				heroKilled = true;
			}
		} else if (obj.category === "projectile") {
			if (world.tick >= obj.expireTick) {
				detonateProjectile(obj, world);
				swapOnExpiry(obj, world);
				destroyObject(world, obj);
			}
		} else if (obj.category === "obstacle") {
			if (obj.health <= 0) {
				detonateObstacle(obj, world);
				destroyObject(world, obj);
			}
		} else if (obj.category === "shield") {
			if (world.tick >= obj.expireTick) {
				destroyObject(world, obj);
			}
		}
	});

	if (heroKilled) {
		notifyWin(world);
	}
}

function hasHorcrux(hero: w.Hero, world: w.World): boolean {
	let horcrux = false;
	hero.horcruxIds.forEach(horcruxId => {
		if (world.objects.has(horcruxId)) {
			horcrux = true;
		} else {
			hero.horcruxIds.delete(horcruxId);
		}

	});
	return horcrux;
}

function captureSnapshot(world: w.World) {
	if (!(world.tick > 0 && world.tick % constants.SnapshotTicks === 0)) {
		return;
	}

	const obstacles = world.tick % constants.ObstacleSnapshotTicks === 0;

	const snapshot: w.Snapshot = {
		tick: world.tick,
		objectLookup: new Map<string, w.ObjectSnapshot>(),
	};
	world.objects.forEach(obj => {
		if (obj.category === "hero" || (obstacles && obj.category === "obstacle" && !obj.static)) {
			const objSnapshot: w.ObjectSnapshot = {
				pos: vector.clone(obj.body.getPosition()),
				health: obj.health,
			};
			if (obj.category === "obstacle") {
				objSnapshot.angle = obj.body.getAngle();
			}
			snapshot.objectLookup.set(obj.id, objSnapshot);
		}
	});
	world.snapshots.push(snapshot);
}

function notifyWin(world: w.World) {
	if (world.winner) {
		return;
	}

	if (!isGameWon(world)) {
		return;
	}

	let scores =
		world.players.valueSeq()
		.filter(p => !p.left)
		.map(p => world.scores.get(p.heroId))
		.filter(s => !!s) // Shouldn't happen, but check anyway
		.toArray();
	scores.sort((a, b) => {
		const deathA = a.deathTick || Infinity;
		const deathB = b.deathTick || Infinity;
		if (deathA > deathB) {
			return -1;
		} else if (deathA < deathB) {
			return 1;
		} else if (a.kills > b.kills) {
			return -1;
		} else if (a.kills < b.kills) {
			return 1;
		} else if (a.damage > b.damage) {
			return -1;
		} else if (a.damage < b.damage) {
			return 1;
		}
		return 0;
	});

	let bestScore: w.HeroScore = scores[0];
	if (!bestScore) {
		return;
	}

	for (let i = 0; i < scores.length; ++i) {
		scores[i].rank = i + constants.Placements.Rank1;
	}

	let mostDamage: w.HeroScore = null;
	world.scores.forEach(score => {
		if (!mostDamage) {
			mostDamage = score;
			return;
		}

		if (score.damage > mostDamage.damage) {
			mostDamage = score;
		}
	});
	if (!mostDamage) {
		return;
	}

	let mostKills: w.HeroScore = null;
	world.scores.forEach(score => {
		if (!mostKills) {
			mostKills = score;
			return;
		}

		if (score.kills > mostKills.kills) {
			mostKills = score;
		}
	});
	if (!mostKills) {
		return;
	}

	const winningTeamId = getTeam(bestScore.heroId, world);
	world.winner = bestScore.heroId;
	world.winners = scores.filter(x => getTeam(x.heroId, world) === winningTeamId).map(x => x.heroId);
	world.winTick = world.tick;
	world.ui.notifications.push({
		type: "win",
		myHeroId: world.ui.myHeroId,
		winners: world.winners.map(heroId => world.players.get(heroId)),
		mostDamage: world.players.get(mostDamage.heroId),
		mostDamageAmount: mostDamage.damage,
		mostKills: world.players.get(mostKills.heroId),
		mostKillsCount: mostKills.kills,
	});

	removeBots(world);
}

function isGameWon(world: w.World) {
	if (world.tick < world.startTick) {
		return false;
	}

	const aliveHeroIds = wu(world.objects.values()).filter(h => h.category === "hero").map(h => h.id).toArray();
	if (aliveHeroIds.length === 0) {
		return true;
	}

	const firstTeamId = getTeam(aliveHeroIds[0], world);
	for (let i = 1; i < aliveHeroIds.length; ++i) {
		if (getTeam(aliveHeroIds[i], world) !== firstTeamId) {
			// Multiple teams are alive, no winner
			return false;
		}
	}

	return true;
}

function notifyKill(hero: w.Hero, world: w.World) {
	const killed = world.players.get(hero.id);
	if (!killed) {
		return;
	}
	killed.dead = true;

	const myHeroId = world.ui.myHeroId;

	const killer = hero.killerHeroId && world.players.get(hero.killerHeroId) || null;
	world.ui.notifications.push({ type: "kill", myHeroId, killed, killer });
	console.log(`${killed.heroId} ${killed.name} killed at ${world.tick}`);

	if (!world.winner) {
		if (hero) {
			const score = world.scores.get(hero.id);
			world.scores = world.scores.set(hero.id, { ...score, deathTick: world.tick });
		}
		if (hero.killerHeroId) {
			const score = world.scores.get(hero.killerHeroId);
			world.scores = world.scores.set(hero.killerHeroId, { ...score, kills: score.kills + 1 });
		}

		world.players.forEach(player => {
			if (!player.dead) {
				const score = world.scores.get(player.heroId);
				world.scores = world.scores.set(player.heroId, { ...score, outlasts: score.outlasts + 1 });
			}
		});
	}
}

function destroyObject(world: w.World, object: w.WorldObject) {
	world.objects.delete(object.id);
	world.physics.destroyBody(object.body);

	object.destroyedTick = world.tick;
	world.ui.destroyed.push(object);
}

function calculateMovementProportion(hero: w.Hero, world: w.World): number {
	let buffIncrease = 1;
	let buffDecrease = 1;

	if (hero.casting) {
		const movementProportion = hero.casting.movementProportion || 0;
		if (movementProportion > 1) {
			buffIncrease = Math.max(buffIncrease, movementProportion);
		} else if (movementProportion < 1) {
			buffDecrease = Math.min(buffDecrease, movementProportion);
		}
	}

	hero.buffs.forEach(buff => {
		if (buff.type === "movement") {
			if (buff.movementProportion > 1) {
				buffIncrease = Math.max(buffIncrease, buff.movementProportion);
			} else if (buff.movementProportion < 1) {
				buffDecrease = Math.min(buffDecrease, buff.movementProportion);
			}
		}
	});
	return buffIncrease * buffDecrease;
}

function moveTowards(world: w.World, hero: w.Hero, target: pl.Vec2, movementProportion: number = 1.0) {
	if (!target) { return; }

	const current = hero.body.getPosition();

	if (movementProportion > 0) {
		turnTowards(hero, target);

		const step = vector.diff(target, current).clamp(movementProportion * hero.moveSpeedPerSecond / TicksPerSecond);
		applyPosDelta(hero, step);
	}

	const done = vector.distance(current, target) < constants.Pixel;
	hero.moveTo = done ? null : target;
}

// Sometimes different browsers applied these deltas in different orders and caused desyncs. Collate them all and apply them in one call to avoid this.
function move(world: w.World) {
	world.objects.forEach(obj => {
		if (obj.posDelta) {
			const current = obj.body.getPosition();
			obj.body.setPosition(current.add(obj.posDelta));

			obj.posDelta = null;
		}

		if (obj.velocityDelta) {
			const velocity = obj.body.getLinearVelocity();
			obj.body.setLinearVelocity(velocity.add(obj.velocityDelta));
			obj.velocityDelta = null;
		}

		if (obj.impulseDelta) {
			obj.body.applyLinearImpulse(obj.impulseDelta, obj.body.getWorldPoint(vectorZero), true);
			obj.impulseDelta = null;
		}
	});
}

function strafe(strafe: w.StrafeBehaviour, world: w.World) {
	const projectile = world.objects.get(strafe.projectileId);
	if (!(projectile && projectile.category === "projectile")) {
		return false;
	}

	const owner = world.objects.get(projectile.owner);
	if (!(owner && owner.category === "hero")) {
		return false;
	}

	const pos = owner.body.getPosition();

	if (strafe.previousPos && strafe.previousOwner === projectile.owner) { // If owner changes, position will jump, don't make the projectile jump too
		const delta = vector.diff(pos, strafe.previousPos);
		if (strafe.maxSpeed) {
			delta.clamp(strafe.maxSpeed);
		}
		projectile.body.setPosition(projectile.body.getPosition().add(delta));
	}

	strafe.previousOwner = projectile.owner;
	strafe.previousPos = pos.clone();

	return true;
}

function stopAction(world: w.World, hero: w.Hero, action: w.Action, spell: StopSpell) {
	// hero.moveTo = null; // Just cancel the spell but not the movement
	return true;
}

function spawnProjectileAction(world: w.World, hero: w.Hero, action: w.Action, spell: ProjectileSpell) {
	if (!action.target) { return true; }

	addProjectile(world, hero, action.target, spell, spell.projectile);

	return true;
}

function chargeProjectileAction(world: w.World, hero: w.Hero, action: w.Action, spell: ChargingSpell) {
	if (!hero.casting.chargeStartTick) {
		return true;
	}

	let target = action.target;
	if (spell.retarget) {
		target = hero.target || target;
	}
	if (!target) { return true; }

	const chargeTicks = Math.min(spell.chargeTicks, world.tick - hero.casting.chargeStartTick);
	const template = { ...spell.projectile };

	if (spell.chargeDamage) {
		const damageMultiplier = calculatePartialMultiplier(chargeTicks, spell.chargeDamage);
		template.damage *= damageMultiplier;
		if (template.detonate) {
			template.detonate = {
				...template.detonate,
				damage: template.detonate.damage * damageMultiplier,
			};
		}
	}
	if (spell.chargeRadius) {
		template.radius *= calculatePartialMultiplier(chargeTicks, spell.chargeRadius);
	}
	if (spell.chargeImpulse) {
		const impulseMultiplier = calculatePartialMultiplier(chargeTicks, spell.chargeImpulse);
		template.density *= impulseMultiplier;
		if (template.detonate) {
			template.detonate = {
				...template.detonate,
				minImpulse: template.detonate.minImpulse * impulseMultiplier,
				maxImpulse: template.detonate.maxImpulse * impulseMultiplier,
			};
		}
	}

	addProjectile(world, hero, target, spell, template, {
		releaseTarget: hero.target,
	});

	return true;
}

function sprayProjectileAction(world: w.World, hero: w.Hero, action: w.Action, spell: SpraySpell) {
	if (!action.target) { return true; }

	const currentLength = world.tick - hero.casting.channellingStartTick;
	if (currentLength < spell.lengthTicks && currentLength % spell.intervalTicks === 0) {
		let currentAngle = hero.casting.initialAngle;
		if (spell.revsPerTickWhileChannelling) {
			currentAngle = hero.body.getAngle();
		}

		const numProjectilesPerTick = spell.numProjectilesPerTick || 1;
		const numProjectiles = numProjectilesPerTick * spell.lengthTicks / spell.intervalTicks;
		const angleOffset = (numProjectiles % 2 === 0) ? (Math.PI / numProjectiles) : 0; // If even number, offset either side of middle

		for (let i = 0; i < numProjectilesPerTick; ++i) {
			const projectileIndex = Math.floor((i + numProjectilesPerTick * currentLength) / spell.intervalTicks);
			const newAngle = currentAngle + 2 * Math.PI * (projectileIndex / numProjectiles) + angleOffset;

			const direction = vector.fromAngle(currentAngle);
			const jitterRadius = direction.length() * spell.jitterRatio;
			const jitterDirection = vector.plus(direction, vector.fromAngle(newAngle).mul(jitterRadius));

			addProjectile(world, hero, action.target, spell, spell.projectile, {
				direction: jitterDirection,
				filterGroupIndex: -(hero.casting.id + 1), // +1 because 0 means no filter
			});
		}
	}

	const cutoff = spell.maxChannellingTicks || spell.lengthTicks;
	return currentLength >= cutoff;
}

function focusAction(world: w.World, hero: w.Hero, action: w.Action, spell: FocusSpell) {
	if (!action.target) { return true; }

	if (world.tick == hero.casting.channellingStartTick) {
		const focus = addProjectile(world, hero, action.target, spell, spell.projectile);
		hero.focusIds.set(spell.id, focus.id);
	}

	const focusId = hero.focusIds.get(spell.id);
	const focus = world.objects.get(focusId);

	let done: boolean;
	if (spell.release && hero.casting.releaseTick) {
		done = true;

		if (spell.releaseBehaviours && focus && focus.category === "projectile") {
			focus.target.pos = hero.target;
			instantiateProjectileBehaviours(spell.releaseBehaviours, focus, world);
		}
	} else if (focus && focus.category === "projectile") {
		// Not done - still focusing projectile
		done = false;
	} else {
		// Projectile gone, but unreleased - wait until max channelling time
		const cutoff = spell.maxChannellingTicks || 0;
		const currentLength = world.tick - hero.casting.channellingStartTick;
		done = currentLength >= cutoff;
	}

	if (done) {
		hero.focusIds.delete(spell.id);
	} else {
		if (spell.focusDelaysCooldown) {
			// Keep resetting the cooldown until focus complete
			setCooldown(world, hero, spell.id, spell.cooldown);
		}
	}
	return done;
}

function teleportAction(world: w.World, hero: w.Hero, action: w.Action, spell: TeleportSpell) {
	const Hero = world.settings.Hero;
	if (!action.target) { return true; }

	const availableRange = spell.range;
	const rangeLimit = Math.min(
		availableRange,
		shieldCollisionLimit(hero, action.target, world));

	const currentPosition = vector.clone(hero.body.getPosition());
	const newPosition = vector.towards(currentPosition, action.target, rangeLimit);

	hero.body.setPosition(newPosition);
	hero.moveTo = action.target;

	world.ui.events.push({
		type: "teleport",
		tick: world.tick,
		fromPos: vector.clone(currentPosition),
		toPos: vector.clone(newPosition),
		heroId: hero.id,
		sound: spell.sound,
	});

	return true;
}

function shieldCollisionLimit(hero: w.Hero, to: pl.Vec2, world: w.World): number {
	const from = hero.body.getPosition();

	let hit: pl.Vec2 = null;
	world.physics.rayCast(from, to, (fixture, point, normal, fraction) => {
		const obj = world.objects.get(fixture.getBody().getUserData());
		if (obj.blocksTeleporters && shouldCollide(hero, obj)) {
			hit = point;
			return 0; // Stop search after first hit
		} else {
			return fraction; // Keep searching after this polygon
		}
	});

	if (hit) {
		return Math.max(0, vector.distance(hit, from) - hero.radius); // -hero.radius so we are on this side of the shield
	} else {
		return vector.distance(to, from);
	}
}

function shouldCollide(a: w.WorldObject, b: w.WorldObject) {
	const fixtureA = a.body.getFixtureList();
	const fixtureB = b.body.getFixtureList();
	if (fixtureA && fixtureB) {
		return fixtureA.shouldCollide(fixtureB);
	} else {
		return false;
	}
}

function thrustAction(world: w.World, hero: w.Hero, action: w.Action, spell: ThrustSpell) {
	if (!action.target) { return true; }

	const castingTicks = world.tick - hero.casting.channellingStartTick;
	if (castingTicks === 0) {
		const availableRange = spell.range;
		const speed = spell.speed;
		const maxTicks = TicksPerSecond * availableRange / speed;

		let ticks = maxTicks;

		if (spell.followCursor) {
			world.behaviours.push({ type: "thrustFollow", heroId: hero.id, speed });
		} else {
			const diff = vector.diff(action.target, hero.body.getPosition());
			const distancePerTick = speed / TicksPerSecond;
			const ticksToTarget = Math.floor(diff.length() / distancePerTick);

			const velocity = vector.unit(diff).mul(speed);
			world.behaviours.push({ type: "thrustVelocity", heroId: hero.id, velocity });

			// If not following cursor, stop as soon as we reach the initial target
			ticks = Math.min(maxTicks, ticksToTarget);
		}

		let thrust: w.ThrustState = {
			damageTemplate: spell.damageTemplate,
			ticks,
			nullified: false,
			alreadyHit: new Set<string>(),
		};

		hero.thrust = thrust;
		hero.moveTo = action.target;

		world.behaviours.push({ type: "thrustDecay", heroId: hero.id });
	}

	if (spell.projectile && spell.projectileInterval && castingTicks % spell.projectileInterval === 0) {
		addProjectile(world, hero, action.target, spell, spell.projectile);
	}

	return !hero.thrust;
}

function thrustVelocity(behaviour: w.ThrustVelocityBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	if (hero.thrust) {
		hero.body.setLinearVelocity(behaviour.velocity);

		return true;
	} else {
		hero.body.setLinearVelocity(vectorZero);

		return false;
	}
}

function thrustFollow(behaviour: w.ThrustFollowBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	if (hero.thrust && hero.target) {
		const diff = vector.diff(hero.target, hero.body.getPosition());
		const velocity = diff.mul(TicksPerSecond).clamp(behaviour.speed);
		hero.body.setLinearVelocity(velocity);

		return true;
	} else {
		hero.body.setLinearVelocity(vectorZero);

		return false;
	}
}

function thrustDecay(behaviour: w.ThrustDecayBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero" && hero.thrust)) {
		return false;
	}

	--hero.thrust.ticks;
	if (hero.thrust.ticks <= 0) {
		hero.thrust = null;
		return false;
	} else {

		return true;
	}
}

function saberAction(world: w.World, hero: w.Hero, action: w.Action, spell: SaberSpell) {
	const saberTick = world.tick - hero.casting.channellingStartTick;
	if (saberTick === 0) {
		spell.angleOffsetsInRevs.forEach(angleOffsetInRevs => {
			const angleOffset = angleOffsetInRevs * 2 * Math.PI;
			const saber = addSaber(world, hero, spell, angleOffset);
			world.behaviours.push({
				type: "saberSwing",
				shieldId: saber.id,
				hitInterval: 1,
				hitTickLookup: new Map(),
			});
		});
	}
	return saberTick >= spell.maxTicks;
}

function saberSwing(behaviour: w.SaberBehaviour, world: w.World) {
	const shield = world.objects.get(behaviour.shieldId);
	if (!(shield && shield.category === "shield")) {
		return false;
	}

	const saber: w.Shield = shield;
	if (!(saber.type === "saber")) {
		return false;
	}

	const hero = world.objects.get(shield.owner);
	if (!(hero && hero.category === "hero")
		|| (saber.channelling && !(hero.casting && hero.casting.action.type === saber.spellId))
		|| (hero.cleanseTick > saber.createTick)) {
		// Dead, cancelled or cleansed
		shield.expireTick = world.tick;
		return false;
	}

	const heroPos = hero.body.getPosition();

	const previousAngle = saber.body.getAngle();
	const targetAngle = vector.angleDiff(hero.target, heroPos) + saber.angleOffset;
	const newAngle = vector.turnTowards(previousAngle, targetAngle, saber.turnRate);
	if (previousAngle === newAngle) {
		return true; // Nothing to do
	}

	const saberAngleDelta = vector.angleDelta(previousAngle, newAngle);

	const antiClockwise = saberAngleDelta >= 0;
	const previousTip = vector.fromAngle(previousAngle).mul(saber.length);
	const newTip = vector.fromAngle(newAngle).mul(saber.length);

	const swing = vector.diff(newTip, previousTip);
	const swingVelocity = swing.clone().mul(TicksPerSecond * saber.speedMultiplier).clamp(saber.maxSpeed);
	const swingSpeed = swingVelocity.length();

	const shift = swing.clone().mul(Math.max(0, saber.shiftMultiplier));

	let hit = false
	queryExtent(world, heroPos, saber.length + world.settings.World.SlopRadius, obj => {
		if (obj.id === hero.id) {
			return;
		}
		if (!(obj.category === "hero"
			|| (obj.category === "projectile" && obj.owner !== saber.owner && (shouldCollide(saber, obj) || destructibleBy(obj, hero.id, world))))) {
				return;
		}

		const objPos = obj.body.getPosition();
		const diff = vector.diff(objPos, heroPos);
		const distance = vector.length(diff);
		const extent = obj.radius;
		if (distance > saber.length + extent) {
			return;
		}

		const insidePrevious = vector.insideLine(diff, extent, vectorZero, previousTip, antiClockwise);
		const insideNew = vector.insideLine(diff, extent, newTip, vectorZero, antiClockwise);
		if (!(insidePrevious && insideNew)) {
			return;
		}

		if (!takeHit(behaviour, obj.id, world)) {
			return;
		}

		applyPosDelta(obj, shift);

		const currentSpeed = obj.body.getLinearVelocity().length();
		if (currentSpeed < swingSpeed) {
			applyVelocityDelta(obj, swingVelocity);
			emitPush(saber.owner, swingVelocity, saber.color, obj.id, world);
		}

		handleSaberHit(saber, obj, world);

		hit = true;
	});

	if (hit) {
		saber.hitTick = world.tick;
	}

	saber.body.setPosition(heroPos);
	saber.body.setAngle(newAngle);

	return true;
}

function scourgeAction(world: w.World, hero: w.Hero, action: w.Action, spell: ScourgeSpell) {
	// Self damage
	const selfPacket: w.DamagePacket = {
		fromHeroId: hero.id,
		damage: spell.selfDamage,
		lifeSteal: 0,
		minHealth: spell.minSelfHealth,
		noRedirect: true,
	};
	applyDamage(hero, selfPacket, world);

	const detonate = instantiateDetonate(spell.detonate, hero.id, world);
	detonateAt(hero.body.getPosition(), hero.id, detonate, world, {
		sourceId: hero.id,
		color: spell.color,
		defaultSound: spell.sound,
	});

	return true;
}

function wallAction(world: w.World, hero: w.Hero, action: w.Action, spell: WallSpell) {
	const halfWidth = spell.width / 2;
	const halfLength = spell.length / 2;
	let points = [
		pl.Vec2(-halfWidth, -halfLength),
		pl.Vec2(halfWidth, -halfLength),
		pl.Vec2(halfWidth, halfLength),
		pl.Vec2(-halfWidth, halfLength),
	];

	const diff = vector.diff(action.target, hero.body.getPosition()).clamp(spell.maxRange);
	const angle = 0.5 * Math.PI + vector.angle(diff);

	const position = hero.body.getPosition().clone().add(diff);
	addWall(world, hero, spell, position, angle, points, Math.max(halfWidth, halfLength));

	return true;
}

function shieldAction(world: w.World, hero: w.Hero, action: w.Action, spell: ReflectSpell) {
	addShield(world, hero, spell);
	return true;
}

function buffAction(world: w.World, hero: w.Hero, action: w.Action, spell: BuffSpell) {
	const currentLength = world.tick - hero.casting.channellingStartTick;

	if (spell.projectile && spell.projectileInterval && currentLength % spell.projectileInterval === 0) {
		addProjectile(world, hero, action.target, spell, spell.projectile);
	}

	const cutoff = spell.maxChannellingTicks;
	if (currentLength < cutoff) {
		return false;
	}

	return !wu(hero.buffs.values()).some(b => b.channellingSpellId === spell.id);
}

function instantiateBuff(template: BuffTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	if (template.type === "debuff") {
		attachCleanse(template, hero, world, config);
	} else if (template.type === "movement") {
		attachMovementBuff(template, hero, world, config);
	} else if (template.type === "glide") {
		attachGlide(template, hero, world, config);
	} else if (template.type === "lavaImmunity") {
		attachLavaImmunity(template, hero, world, config);
	} else if (template.type === "vanish") {
		attachVanish(template, hero, world, config);
	} else if (template.type === "lifeSteal") {
		attachLifesteal(template, hero, world, config);
	} else if (template.type === "burn") {
		attachBurn(template, hero, world, config);
	} else if (template.type === "cooldown") {
		attachSilence(template, hero, world, config);
	} else if (template.type === "armor") {
		attachArmor(template, hero, world, config);
	} else if (template.type === "mass") {
		attachMass(template, hero, world, config);
	} else if (template.type === "delink") {
		attachDelink(template, hero, world, config);
	} else if (template.type === "bump") {
		attachBump(template, hero, world, config);
	}
}

function detachBuff(buff: w.Buff, hero: w.Hero, world: w.World) {
	buff.destroyedTick = world.tick;
	hero.buffs.delete(buff.id);
	hero.uiDestroyedBuffs.push(buff);

	if (buff.type === "cooldown") {
		detachSilence(buff, hero, world);
	} else if (buff.type === "mass") {
		detachMass(buff, hero, world);
	} else if (buff.type === "armor") {
		detachArmor(buff, hero, world);
	} else if (buff.type === "cleanse") {
		detachCleanse(buff, hero, world);
	} else if (buff.type === "glide") {
		detachGlide(buff, hero, world);
	}
}

function calculateBuffId(template: BuffTemplate, world: w.World, config: BuffContext) {
	if (template.stack) {
		return `${config.fromHeroId || "environment"}/${template.type}/${template.stack}`;
	} else {
		return `${template.type}${world.nextBuffId++}`;
	}
}

function calculateBuffValues(template: BuffTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	const maxTicks = (template.maxTicks || 0) * (config.durationMultiplier !== undefined ? config.durationMultiplier : 1);
	const values: w.BuffValues = {
		owner: config.fromHeroId,
		initialTick: world.tick,
		expireTick: world.tick + maxTicks,
		cleansable: template.cleansable !== undefined ? template.cleansable : true,
		renderStart: template.renderStart,
		render: template.render,
		renderFinish: template.renderFinish,
		sound: template.sound,
		maxTicks,
		hitTick: template.cancelOnHit ? (hero.hitTick || 0) : null,
		channellingSpellId: template.channelling && config.spellId,
		passiveSpellId: template.passive && config.spellId,
		resetOnGameStart: template.resetOnGameStart,
		cancelOnBump: template.cancelOnBump,
		numStacks: 1,
	};

	if (template.linkOwner) {
		values.link = { owner: hero.id, spellId: config.spellId };
	} else if (template.linkVictim) {
		values.link = { owner: config.fromHeroId, spellId: config.spellId };
	}

	return values;
}

function attachStack<T extends w.Buff>(
	template: BuffTemplate,
	hero: w.Hero,
	world: w.World,
	config: BuffContext,
	attach: (id: string, values: w.BuffValues) => T,
	update: (stack: T) => void,
	defaultMaxStacks: number = 1) {

	const id = calculateBuffId(template, world, config);
	const values = calculateBuffValues(template, hero, world, config);

	let stack: T = null;
	if (template.stack) {
		// Extend existing stacks
		const candidate = hero.buffs.get(id);
		if (candidate && candidate.type === template.type) {
			stack = candidate as T;
		}
	}

	if (stack) {
		stack.expireTick = values.expireTick;

		let maxStacks = template.maxStacks !== undefined ? template.maxStacks : defaultMaxStacks;
		if (!maxStacks || stack.numStacks < maxStacks) {
			update(stack);
			++stack.numStacks;
		}
	} else {
		hero.buffs.set(id, attach(id, values));
	}
}

function attachCleanse(template: DebuffTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	const id = `${template.type}-${world.nextBuffId++}`;
	hero.buffs.set(id, {
		...calculateBuffValues(template, hero, world, config),
		id,
		type: "cleanse",
	});
	updateCleanse(hero);
}

function detachCleanse(buff: w.CleanseBuff, hero: w.Hero, world: w.World) {
	updateCleanse(hero);
}

function updateCleanse(hero: w.Hero) {
	let cleanseTick = 0;
	hero.buffs.forEach(b => {
		if (b.type === "cleanse") {
			cleanseTick = Math.max(cleanseTick, b.expireTick);
		}
	});
	hero.cleanseTick = cleanseTick;
}

function attachMovementBuff(template: MovementBuffTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	attachStack<w.MovementBuff>(
		template, hero, world, config,
		(id, values) => ({
			...values, id, type: "movement",
			movementProportion: template.movementProportion,
		}),
		(stack) => {
			stack.movementProportion *= template.movementProportion;
		},
	);
}

function attachGlide(template: GlideTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	attachStack<w.GlideBuff>(
		template, hero, world, config,
		(id, values) => ({
			...values, id, type: "glide",
			linearDampingMultiplier: template.linearDampingMultiplier,
		}),
		(stack) => {
			stack.linearDampingMultiplier *= template.linearDampingMultiplier;
		},
	);

	updateHeroDamping(hero);
}

function detachGlide(buff: w.GlideBuff, hero: w.Hero, world: w.World) {
	updateHeroDamping(hero);
}

function attachLavaImmunity(template: LavaImmunityBuffTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	attachStack<w.LavaImmunityBuff>(
		template, hero, world, config,
		(id, values) => ({
			...values, id, type: "lavaImmunity",
			damageProportion: template.damageProportion,
		}),
		(stack) => {
			stack.damageProportion *= template.damageProportion;
		},
	);
}

function attachVanish(template: VanishTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	const id = "vanish"; // Only one vanish at a time allowed
	hero.invisible = {
		...calculateBuffValues(template, hero, world, config),
		id,
		type: "vanish",
		initialPos: hero.body.getPosition().clone(),
		noTargetingIndicator: template.noTargetingIndicator,
		noBuffs: template.noBuffs,
	};
	hero.buffs.set(id, hero.invisible);
}

function attachLifesteal(template: LifestealTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	attachStack<w.LifeStealBuff>(
		template, hero, world, config,
		(id, values) => ({
			...values, id, type: "lifeSteal",
			lifeSteal: template.lifeSteal,
			damageMultiplier: template.damageMultiplier,
			minHealth: template.minHealth,
			decay: template.decay,
			source: template.source,
		}),
		(stack) => {
			const delta = template.damageMultiplier - 1;
			stack.damageMultiplier = (stack.damageMultiplier || 1) + delta;
		},
	);
}

function attachBurn(template: BurnTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	const defaultMaxStacks = 1e6;
	attachStack<w.BurnBuff>(
		template, hero, world, config,
		(id, values) => ({
			...values, id, type: "burn",
			fromHeroId: config.fromHeroId,
			hitInterval: template.hitInterval,
			packet: { ...template.packet },
			stack: template.stack,
		}),
		(stack) => {
			stack.packet.damage += template.packet.damage;
		},
		defaultMaxStacks,
	);
}

function burn(burn: w.BurnBehaviour, world: w.World) {
	const hero = world.objects.get(burn.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	hero.buffs.forEach(buff => {
		if (buff.type === "burn" && world.tick % buff.hitInterval === 0) {
			const packet = instantiateDamage(buff.packet, buff.fromHeroId, world);
			applyDamage(hero, packet, world);
		}
	});

	return true;
}

function attachSilence(template: SetCooldownTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	let spellIds: Set<string> = null;
	if (template.spellIds) {
		spellIds = new Set<string>(template.spellIds);
	} else if (template.spellId) {
		spellIds = new Set<string>([template.spellId]);
	}

	// Apply cooldown rate buff
	const cooldownRate = template.cooldownRate !== undefined ? template.cooldownRate : 1;
	attachStack<w.CooldownBuff>(
		template, hero, world, config,
		(id: string, values: w.BuffValues) => ({ // Create
			...values,
			id,
			type: "cooldown",
			spellIds,
			cooldownRate,
		}),
		(stack) => { // Update
			stack.cooldownRate *= cooldownRate;
		});
	updateSilence(hero);

	// Apply min/max
	hero.keysToSpells.forEach(spellId => {
		if (!template.spellId || spellId === template.spellId) {
			let cooldown = cooldownRemaining(world, hero, spellId);
			if (template.adjustCooldown !== undefined) {
				cooldown += template.adjustCooldown;
			}
			if (template.maxCooldown !== undefined) {
				cooldown = Math.min(template.maxCooldown, cooldown);
			}
			if (template.minCooldown !== undefined) {
				cooldown = Math.max(template.minCooldown, cooldown);
			}
			setCooldown(world, hero, spellId, cooldown);
		}
	});

	// Notify
	if (template.color || template.sound) {
		world.ui.events.push({
			type: "cooldown",
			tick: world.tick,
			color: template.color,
			sound: template.sound,
			heroId: hero.id,
		});
	}
}

function detachSilence(buff: w.CooldownBuff, hero: w.Hero, world: w.World) {
	updateSilence(hero);
}

function updateSilence(hero: w.Hero) {
	const cooldownRates: w.Cooldowns = {};

	hero.keysToSpells.forEach(spellId => {
		let cooldownRate = 1;
		hero.buffs.forEach(buff => {
			if (buff.type === "cooldown" && (!buff.spellIds || buff.spellIds.has(spellId))) {
				cooldownRate *= buff.cooldownRate;
			}
		});
		cooldownRates[spellId] = cooldownRate;
	});

	hero.cooldownRates = cooldownRates;
}

function attachArmor(template: ArmorTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	attachStack<w.ArmorBuff>(
		template, hero, world, config,
		(id: string, values: w.BuffValues) => ({ // Create
			...values,
			id,
			type: "armor",
			proportion: template.proportion,
			source: template.source,
		}),
		(stack) => { // Update
			stack.proportion += template.proportion;
		});

	updateArmor(hero);
}

function detachArmor(buff: w.ArmorBuff, hero: w.Hero, world: w.World) {
	updateArmor(hero);
}


function attachMass(template: MassTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	const id = `mass/${world.nextBuffId++}`; // always add a unique buff, never replace

	let collideWith: number;
	if (_.isNumber(template.sense)) {
		collideWith = template.sense;
	} else {
		collideWith = hero.collideWith;
	}

	const fixture = hero.body.createFixture(pl.Circle(template.radius), {
		isSensor: _.isNumber(template.sense),
		density: template.density || 0,
		filterCategoryBits: Categories.Hero,
		filterMaskBits: collideWith,
		filterGroupIndex: hero.filterGroupIndex,
	});

	hero.buffs.set(id, {
		...calculateBuffValues(template, hero, world, config),
		id,
		type: "mass",
		fixture,
		appendCollideWith: template.appendCollideWith,
		restrictCollideWith: template.restrictCollideWith,
		radius: template.radius,
	});
	updateHeroMass(hero);
}

function detachMass(buff: w.MassBuff, hero: w.Hero, world: w.World) {
	hero.body.destroyFixture(buff.fixture);
	updateHeroMass(hero);
}

function attachDelink(template: DelinkTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	if (hero.link) {
		hero.link.expireTick = world.tick;
	}
}

function attachBump(template: BumpTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	const id = calculateBuffId(template, world, config);
	hero.buffs.set(id, {
		...calculateBuffValues(template, hero, world, config),
		id,
		type: "bump",
		impulse: template.impulse,
		hitInterval: template.hitInterval,
		hitTickLookup: new Map(),
	});
}

function instantiateDamage(template: DamagePacketTemplate, fromHeroId: string, world: w.World): w.DamagePacket {
	const Hero = world.settings.Hero;

	if (!template) {
		return null;
	}

	let damage = template.damage * calculateScaling(fromHeroId, world, template.damageScaling);
	let lifeSteal = template.lifeSteal || 0;
	let minHealth = template.minHealth;

	const fromHero = world.objects.get(fromHeroId);
	if (fromHero && fromHero.category === "hero") {
		fromHero.buffs.forEach(buff => {
			if (buff.type === "lifeSteal" && (!buff.source || buff.source === template.source)) {
				let proportion = 1;
				if (buff.decay) {
					proportion = Math.max(0, (buff.expireTick - world.tick) / buff.maxTicks);
				}

				if (_.isNumber(buff.lifeSteal)) {
					lifeSteal = Math.max(lifeSteal, buff.lifeSteal * proportion);
				}
				if (_.isNumber(buff.damageMultiplier)) {
					damage *= proportion * buff.damageMultiplier + (1 - proportion) * 1;
				}
				if (_.isNumber(buff.minHealth)) {
					minHealth = Math.max(minHealth || 0, buff.minHealth);
				}
			}
		});
	}

	return {
		damage,
		lifeSteal,
		fromHeroId,
		noHit: template.noHit,
		noKnockback: template.noKnockback,
		minHealth,
		source: template.source,
	};
}

function applyDamage(toHero: w.Hero, packet: w.DamagePacket, world: w.World) {
	// Need to be careful - fromHeroId may still be set, even if fromHero is null, due to the hero being dead
	if (!(toHero && packet)) { return; }
	const fromHeroId = packet.fromHeroId;

	let fromHero: w.Hero = null;
	{
		let fromHeroCandidate = world.objects.get(fromHeroId);
		if (fromHeroCandidate && fromHeroCandidate.category === "hero") {
			fromHero = fromHeroCandidate;
		}
	}

	// Register hit
	if (!packet.noHit) {
		toHero.hitTick = world.tick;
		if (!packet.isLava) {
			toHero.strikeTick = world.tick;
		}
	}

	if (world.tick < world.startTick) {
		// No damage until game started
		return;
	}

	// Apply damage
	let amount = packet.damage;
	amount = applyArmor(toHero, packet.source, amount);
	if (!packet.noMitigate) {
		amount = mitigateDamage(toHero, amount, fromHeroId, world);
	}
	if (!packet.noRedirect) {
		amount = redirectDamage(toHero, amount, packet.isLava, world);
	}
	if (packet.minHealth) {
		const maxDamage = Math.max(0, toHero.health - packet.minHealth);
		amount = Math.min(amount, maxDamage);
	}
	toHero.health = Math.min(toHero.maxHealth, toHero.health - amount);

	// Apply lifesteal
	if (fromHero && packet.lifeSteal) {
		fromHero.health = Math.min(fromHero.maxHealth, fromHero.health + amount * packet.lifeSteal);
		world.ui.events.push({ type: "lifeSteal", tick: world.tick, owner: fromHero.id });
	}

	// Update scores
	if (!world.winner) {
		if (fromHeroId && fromHeroId !== toHero.id) {
			const score = world.scores.get(fromHeroId);
			world.scores = world.scores.set(fromHeroId, { ...score, damage: score.damage + amount });
		}
	}

	// Update last hit
	if (fromHeroId && fromHeroId !== toHero.id) {
		toHero.killerHeroId = fromHeroId;

		if (!packet.noKnockback) {
			toHero.knockbackHeroId = fromHeroId;
		}
	}
}

function applyArmor(toHero: w.Hero, source: string, amount: number) {
	let armor = toHero.armorProportion;
	if (source) {
		armor += toHero.armorModifiers.get(source) || 0;
	}

	amount += amount * armor;
	return amount;
}

function redirectDamage(toHero: w.Hero, amount: number, isLava: boolean, world: w.World): number {
	if (!(amount && toHero && toHero.link && toHero.link.redirectDamage)) {
		return amount;
	}
	const redirect = toHero.link.redirectDamage;

	const target = world.objects.get(toHero.link.targetId);
	if (!(target && target.category === "hero")) {
		return amount;
	}

	if (world.tick >= toHero.link.initialTick + redirect.redirectAfterTicks) {
		const packet: w.DamagePacket = {
			damage: amount * redirect.redirectProportion,
			isLava,
			fromHeroId: toHero.id,
			lifeSteal: 0,
			noRedirect: true, // Stop a recursion loop
		};
		applyDamage(target, packet, world);

		toHero.link.redirectDamageTick = world.tick;
	}

	return amount * redirect.selfProportion;
}

function updateArmor(hero: w.Hero) {
	hero.armorModifiers.clear();
	hero.armorProportion = 0;

	hero.buffs.forEach(buff => {
		if (buff.type === "armor") {
			if (buff.source) {
				const current = hero.armorModifiers.get(buff.source) || 0;
				hero.armorModifiers.set(buff.source, current + buff.proportion);
			} else {
				hero.armorProportion += buff.proportion;
			}
		}
	});
}

function mitigateDamage(toHero: w.Hero, damage: number, fromHeroId: string, world: w.World): number {
	if (!fromHeroId // Damage from environment not mitigated by damage from other heroes
		|| fromHeroId === toHero.id) { // Self damage always received in full
		return damage;
	}

	let damageFromThisSource = 0;
	toHero.damageSources.forEach((amount, heroId) => {
		if (heroId === fromHeroId) {
			damageFromThisSource = amount;
		} else {
			// Damage from multiple opponents doesn't stack
			damage -= amount;
		}
	});
	damage = Math.max(0, damage);

	if (damage > 0) {
		toHero.damageSources.set(fromHeroId, damageFromThisSource + damage);
		toHero.damageSourceHistory.push({
			heroId: fromHeroId,
			amount: damage,
			expireTick: world.tick + world.settings.Hero.DamageMitigationTicks,
		});
	}

	return damage;
}

function applyDamageToObstacle(obstacle: w.Obstacle, packet: w.DamagePacket, world: w.World) {
	// Register hit
	if (packet.damage) {
		if (packet.isLava) {
			obstacle.lavaTick = world.tick;
		} else {
			obstacle.activeTick = world.tick;
		}
	}

	if (world.tick < world.startTick) {
		// No damage until game started
		return;
	}

	obstacle.health = Math.min(obstacle.maxHealth, Math.max(0, obstacle.health - packet.damage));
}

export function initScore(heroId: string): w.HeroScore {
	return {
		heroId,
		kills: 0,
		outlasts: 0,
		damage: 0,
		deathTick: null,
		rank: null,
	};
}

export function hash(world: w.World): number {
	let result = 0;
	world.objects.forEach(obj => {
		const pos = obj.body.getPosition();
		const angle = obj.body.getAngle();
		const velocity = obj.body.getLinearVelocity();
		result ^= Math.round(pos.x / 0.001);
		result ^= Math.round(pos.y / 0.001) << 3;
		result ^= Math.round(velocity.x / 0.001) << 5;
		result ^= Math.round(velocity.y / 0.001) << 7;
		result ^= Math.round(angle / 0.001) << 11;
		result = (result << 1) | (result >> 30);
	});
	return result;
}