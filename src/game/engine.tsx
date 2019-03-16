import _ from 'lodash';
import Color from 'color';
import moment from 'moment';
import pl, { World } from 'planck-js';
import * as Immutable from 'immutable';
import * as arrayUtils from '../utils/arrayUtils';
import * as colorWheel from './colorWheel';
import * as constants from './constants';
import * as vector from './vector';
import * as w from './world.model';
import { modToSettings } from './modder';

import { Alliances, Categories, Matchmaking, HeroColors, TicksPerSecond } from './constants';

interface BuffContext {
	fromHeroId?: string;
	toHeroId?: string;
	channellingSpellId?: string;
}

interface ProjectileConfig {
	directionTarget?: pl.Vec2;
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
	settings.linearSlop = 0.0001;
	settings.linearSlopSquared = Math.pow(settings.linearSlop, 2.0);
	settings.polygonRadius = (2.0 * settings.linearSlop);
}

export function version() {
	return "1.0.1151";
}

export function initialWorld(mod: Object): w.World {
	const settings = modToSettings(mod);

	const def: pl.WorldDef = {
		positionIterations: 3,
		velocityIterations: 3,
		allowSleep: false,
	};

	let world: w.World = {
		seed: null,
		tick: 0,
		startTick: constants.Matchmaking.MaxHistoryLength,

		occurrences: new Array<w.Occurrence>(),
		snapshots: [],
		activePlayers: Immutable.Set<string>(), // hero IDs
		players: Immutable.Map<string, w.Player>(), // hero ID -> player
		teams: Immutable.Map<string, string>(), // hero ID -> team ID
		scores: Immutable.Map<string, w.HeroScore>(), // hero ID -> score
		winner: null,
		winners: null,

		objects: new Map(),
		behaviours: [],
		physics: pl.World(def),
		actions: new Map(),
		radius: settings.World.InitialRadius,
		mapRadiusMultiplier: 1.0,

		nextPositionId: 0,
		nextObjectId: 0,
		nextColorId: 0,

		settings,
		mod,

		ui: {
			createTime: moment(),
			myGameId: null,
			myHeroId: null,
			myPartyId: null,
			myUserHash: null,
			reconnectKey: null,
			live: false,
			renderedTick: null,
			sentSnapshotTick: 0,
			playedTick: -1,
			destroyed: [],
			shakes: [],
			highlights: [],
			events: new Array<w.WorldEvent>(),
			trails: [],
			sounds: [],
			notifications: [],
		},
	};

	return world;
}

export function hasGamePrestarted(world: w.World) {
	return world.startTick < constants.Matchmaking.MaxHistoryLength;
}

export function takeNotifications(world: w.World): w.Notification[] {
	const notifications = world.ui.notifications;
	if (notifications.length > 0) {
		world.ui.notifications = [];
	}
	return notifications;
}

function polygon(numPoints: number, extent: number) {
	let points = new Array<pl.Vec2>();
	for (let i = 0; i < numPoints; ++i) {
		const point = vector.multiply(vector.fromAngle((i / numPoints) * (2 * Math.PI)), extent);
		points.push(point);
	}
	return points;
}

function addObstacle(world: w.World, position: pl.Vec2, angle: number, points: pl.Vec2[], template: ObstacleTemplate) {
	const Obstacle = world.settings.Obstacle;

	const obstacleId = "obstacle" + (world.nextObjectId++);
	const body = world.physics.createBody({
		userData: obstacleId,
		type: 'dynamic',
		position,
		angle,
		linearDamping: Obstacle.LinearDamping,
		angularDamping: Obstacle.AngularDamping,
	});

	body.createFixture(pl.Polygon(points), {
		density: Obstacle.Density,
		filterCategoryBits: Categories.Obstacle,
		filterMaskBits: Categories.All,
	});

	const health = template.health || Obstacle.Health;
	const obstacle: w.Obstacle = {
		id: obstacleId,
		category: "obstacle",
		categories: Categories.Obstacle,
		type: "polygon",
		body,
		extent: template.extent,
		points,
		health,
		maxHealth: health,
		createTick: world.tick,
		growthTicks: 0,
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

	body.createFixture(pl.Circle(spell.radius), {
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
		takesOwnership: spell.takesOwnership,
		blocksTeleporters: spell.blocksTeleporters,
		owner: hero.id,
		radius: spell.radius,
		color: spell.color,
		glow: spell.glow,
	};

	world.objects.set(shield.id, shield);
	hero.shieldIds.add(shield.id);
	world.behaviours.push({ type: "reflectFollow", shieldId: shield.id });

	return shield;
}

function addWall(world: w.World, hero: w.Hero, spell: WallSpell, position: pl.Vec2, angle: number, points: pl.Vec2[], extent: number) {
	const shieldId = "shield" + (world.nextObjectId++);

	const body = world.physics.createBody({
		userData: shieldId,
		type: 'static',
		position,
		angle,
	});

	body.createFixture(pl.Polygon(points), {
		filterCategoryBits: spell.categories !== undefined ? spell.categories : Categories.Shield,
		filterMaskBits: Categories.Hero | Categories.Projectile,
		filterGroupIndex: spell.selfPassthrough ? hero.filterGroupIndex : undefined,
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
		takesOwnership: spell.takesOwnership,
		blocksTeleporters: spell.blocksTeleporters,
		owner: hero.id,
		points,
		extent,
		color: spell.color,
		selfColor: spell.selfPassthrough,
		glow: spell.glow,
	};

	world.objects.set(shield.id, shield);

	return shield;
}

function addSaber(world: w.World, hero: w.Hero, spell: SaberSpell, angleOffset: number) {
	const shieldId = "shield" + (world.nextObjectId++);

	const angle = hero.body.getAngle() + angleOffset;
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
		takesOwnership: spell.takesOwnership,
		blocksTeleporters: spell.blocksTeleporters,
		owner: hero.id,
		points,
		color: spell.color,
		glow: spell.glow,

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
	const Hero = world.settings.Hero;

	const heroIndex = world.nextPositionId++;
	const filterGroupIndex = -(heroIndex + 1); // +1 because 0 means group index doesn't apply

	let position;
	let angle;
	{
		const radius = world.settings.World.HeroLayoutRadius;
		const center = pl.Vec2(0.5, 0.5);

		let posAngle = 2 * Math.PI * heroIndex / Matchmaking.MaxPlayers;
		position = vector.plus(vector.multiply(vector.fromAngle(posAngle), radius), center);

		angle = posAngle + Math.PI; // Face inward
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
	body.createFixture(pl.Circle(Hero.Radius), {
		filterCategoryBits: Categories.Hero,
		filterMaskBits: Categories.All ^ Categories.Shield,
		filterGroupIndex,
		density: Hero.Density,
		restitution: 1.0,
	});

	let hero = {
		id: heroId,
		category: "hero",
		type: "hero",
		filterGroupIndex,
		categories: Categories.Hero,
		collideWith: Categories.All,
		health: Hero.MaxHealth,
		maxHealth: Hero.MaxHealth,
		body,
		radius: Hero.Radius,
		damageSources: new Map<string, number>(),
		damageSourceHistory: [],
		additionalDamageMultiplier: Hero.AdditionalDamageMultiplier,
		additionalDamagePower: Hero.AdditionalDamagePower,
		moveSpeedPerSecond: Hero.MoveSpeedPerSecond,
		maxSpeed: Hero.MaxSpeed,
		revolutionsPerTick: Hero.RevolutionsPerTick,
		casting: null,
		cooldowns: {},
		throttleUntilTick: 0,
		killerHeroId: null,
		assistHeroId: null,
		keysToSpells: new Map<string, string>(),
		spellsToKeys: new Map<string, string>(),
		shieldIds: new Set<string>(),
		strafeIds: new Set<string>(),
		retractorIds: new Map<string, string>(),
		focusIds: new Map<string, string>(),
		buffs: new Map<string, w.Buff>(),
		uiDestroyedBuffs: [],
	} as w.Hero;
	world.objects.set(heroId, hero);
	world.scores = world.scores.set(heroId, initScore(heroId));

	world.behaviours.push({ type: "expireBuffs", heroId: hero.id });
	world.behaviours.push({ type: "burn", heroId: hero.id });

	return hero;
}

export function cooldownRemaining(world: w.World, hero: w.Hero, spell: Spell) {
	if (hero.retractorIds.has(spell.id)) {
		return 0;
	}
	return calculateCooldown(world, hero, spell.id);
}

function calculateCooldown(world: w.World, hero: w.Hero, slot: string) {
	let next = hero.cooldowns[slot] || 0;
	return Math.max(0, next - world.tick);
}

function setCooldown(world: w.World, hero: w.Hero, spell: string, waitTime: number) {
	hero.cooldowns[spell] = world.tick + waitTime;
}

function addProjectile(world: w.World, hero: w.Hero, target: pl.Vec2, spell: Spell, projectileTemplate: ProjectileTemplate, config: ProjectileConfig = {}) {
	const NeverTicks = 1e6;

	let id = spell.id + (world.nextObjectId++);

	const from = hero.body.getPosition();
	let direction = vector.unit(vector.diff(config.directionTarget || target, from));
	if (direction.x === 0 && direction.y === 0) {
		direction = vector.fromAngle(hero.body.getAngle());
	}

	const position = vector.clone(hero.body.getPosition());
	const velocity = vector.multiply(direction, projectileTemplate.speed);
	const diff = vector.diff(target, position);

	const categories = projectileTemplate.categories === undefined ? (Categories.Projectile | Categories.Blocker) : projectileTemplate.categories;
	const collideWith = projectileTemplate.collideWith !== undefined ? projectileTemplate.collideWith : Categories.All;

	let body = world.physics.createBody({
		userData: id,
		type: 'dynamic',
		position,
		linearVelocity: velocity,
		linearDamping: 0,
		bullet: true,
	});
	body.createFixture(pl.Circle(projectileTemplate.radius), {
		filterGroupIndex: hero.filterGroupIndex,
		filterCategoryBits: categories,
		filterMaskBits: collideWith,
		density: projectileTemplate.density,
		restitution: projectileTemplate.restitution !== undefined ? projectileTemplate.restitution : 1.0,
		isSensor: projectileTemplate.sensor,
	} as pl.FixtureDef);

	let targetObj = findNearest(world.objects, target, x => x.category === "hero" && !!(calculateAlliance(hero.id, x.id, world) & Alliances.Enemy));
	const ticksToCursor = ticksTo(vector.length(diff), vector.length(velocity))

	let projectile = {
		id,
		owner: hero.id,
		category: "projectile",
		categories,
		type: spell.id,
		body,
		passthrough: true,
		speed: projectileTemplate.speed,
		fixedSpeed: projectileTemplate.fixedSpeed !== undefined ? projectileTemplate.fixedSpeed : true,
		strafe: projectileTemplate.strafe,

		target,
		targetId: targetObj ? targetObj.id : null,
		hitTickLookup: new Map<string, number>(),
		hitInterval: projectileTemplate.hitInterval,

		damageTemplate: {
			damage: projectileTemplate.damage,
			damageScaling: projectileTemplate.damageScaling,
			lifeSteal: projectileTemplate.lifeSteal,
			noHit: projectileTemplate.noHit,
		},
		partialDamage: projectileTemplate.partialDamage,

		bounce: projectileTemplate.bounce,
		gravity: projectileTemplate.gravity,
		link: projectileTemplate.link,
		detonate: projectileTemplate.detonate,
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
		expireOn: projectileTemplate.expireOn !== undefined ? projectileTemplate.expireOn : (Categories.All ^ Categories.Shield),
		expireAgainstHeroes: projectileTemplate.expireAgainstHeroes !== undefined ? projectileTemplate.expireAgainstHeroes : constants.Alliances.All,
		expireAgainstObjects: projectileTemplate.expireAgainstObjects !== undefined ? projectileTemplate.expireAgainstObjects : constants.Alliances.All,
		destructible: projectileTemplate.destructible && {
			against: projectileTemplate.destructible.against !== undefined ? projectileTemplate.destructible.against : constants.Alliances.All,
		},

		sound: projectileTemplate.sound,
		soundHit: projectileTemplate.soundHit,

		color: projectileTemplate.color,
		renderers: projectileTemplate.renderers,
		radius: projectileTemplate.radius,

		uiPath: [vector.clone(position)],
	} as w.Projectile;

	world.objects.set(id, projectile);
	if (projectile.strafe) {
		hero.strafeIds.add(projectile.id);
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
		} else if (template.type === "attract") {
			behaviour = instantiateAttract(template, projectile, world);
		} else if (template.type === "updateCollideWith") {
			behaviour = instantiateUpdateProjectileFilter(template, projectile, world);
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
		} else if(trigger.afterTicks) {
			world.behaviours.push({
				type: "delayBehaviour",
				afterTick: world.tick + (trigger.afterTicks || 0),
				delayed: behaviour,
			});
		} else if (trigger.atCursor) {
			const distanceToCursor = vector.distance(projectile.target, projectile.body.getPosition());
			const speed = vector.length(projectile.body.getLinearVelocity());
			const ticksToCursor = ticksTo(distanceToCursor, speed);

			world.behaviours.push({
				type: "delayBehaviour",
				afterTick: world.tick + ticksToCursor,
				delayed: behaviour,
			});
		} else {
			throw "Unknown behaviour trigger: " + trigger;
		}
	});
}

function instantiateHoming(template: HomingTemplate, projectile: w.Projectile, world: w.World): w.HomingBehaviour {
	return {
		type: "homing",
		projectileId: projectile.id,
		turnRate: template.revolutionsPerSecond !== undefined ? template.revolutionsPerSecond * 2 * Math.PI : Infinity,
		maxTurnProportion: template.maxTurnProportion !== undefined ? template.maxTurnProportion : 1.0,
		minDistanceToTarget: template.minDistanceToTarget || 0,
		targetType: template.targetType || w.HomingTargets.enemy,
		newSpeed: template.newSpeed,
		redirect: template.redirect,
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
	};
}

function instantiateUpdateProjectileFilter(template: UpdateCollideWithTemplate, projectile: w.Projectile, world: w.World): w.UpdateCollideWithBehaviour {
	return {
		type: "updateCollideWith",
		projectileId: projectile.id,
		afterTick: world.tick + template.afterTicks,
		collideWith: template.collideWith,
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

	handleBehaviours(world, {
		delayBehaviour,
		homing,
		linkForce,
		gravityForce,
		attract,
		reflectFollow,
		saberSwing,
		thrustBounce,
		updateCollideWith,
	});

	physicsStep(world);

	handleBehaviours(world, {
		detonate, // Detonate before objects switch owners so its predictable who owns the detonate
	});

	for (var contact = world.physics.getContactList(); !!contact; contact = contact.getNext()) {
		handleContact(world, contact);
	}

	applySpeedLimit(world);
	decayMitigation(world);

	handleBehaviours(world, {
		retractor,
		fixate,
		burn,
		removePassthrough,
		thrustDecay,
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

function applySpeedLimit(world: w.World) {
	world.objects.forEach(obj => {
		if (obj.category === "projectile" && obj.fixedSpeed) {
			const currentVelocity = obj.body.getLinearVelocity();
			const currentSpeed = vector.length(currentVelocity);

			const diff = obj.speed - currentSpeed;
			if (Math.abs(diff) > world.settings.World.ProjectileSpeedMaxError) {
				const newSpeed = currentSpeed + diff * world.settings.World.ProjectileSpeedDecayFactorPerTick;
				obj.body.setLinearVelocity(vector.relengthen(currentVelocity, newSpeed));
			}
		} else if (obj.category === "hero" && obj.maxSpeed) {
			const currentVelocity = obj.body.getLinearVelocity();
			const currentSpeed = vector.length(currentVelocity);
			if (currentSpeed > obj.maxSpeed) {
				obj.body.setLinearVelocity(vector.truncate(currentVelocity, obj.maxSpeed));
			}
		}
	});
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
		const step = vector.truncate(diff, Math.max(behaviour.speed / TicksPerSecond, behaviour.proportion * vector.length(diff)));
		obj.body.setPosition(vector.plus(pos, step));
	}


	// Correct angle
	{
		const angle = obj.body.getAngle();
		const diff = vector.angleDelta(angle, behaviour.angle);
		const maxStep = Math.max(behaviour.proportion * Math.abs(diff), behaviour.turnRate);
		obj.body.setAngle(vector.turnTowards(angle, behaviour.angle, maxStep));
	}

	return true;
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
		updateGroupIndex(projectile.body.getFixtureList(), 0);
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

	if (world.tick < behaviour.afterTick) {
		return true;
	}

	projectile.collideWith = behaviour.collideWith;
	updateMaskBits(projectile.body.getFixtureList(), behaviour.collideWith);
	return false;
}

function projectileClearedHero(projectile: w.Projectile, hero: w.Hero) {
	const NumTicksCleared = 3;
	const distance = vector.distance(hero.body.getPosition(), projectile.body.getPosition());
	return distance > hero.radius + projectile.radius + (NumTicksCleared * hero.moveSpeedPerSecond / TicksPerSecond) + constants.Pixel;
}

function retractor(behaviour: w.RetractorBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	const retractorId = hero.retractorIds.get(behaviour.spellId);
	if (world.objects.has(retractorId)) {
		return true; // Keep watching until retractor disappears
	} else {
		// Retractor expired, can't call it back anymore
		hero.retractorIds.delete(behaviour.spellId);
		return false;
	}
}

function handleOccurences(world: w.World) {
	world.occurrences.forEach(ev => {
		if (ev.type === "closing") {
			handleClosing(ev, world);
		} else if (ev.type === "botting") {
			handleBotting(ev, world);
		} else if (ev.type === "join") {
			handleJoining(ev, world);
		} else if (ev.type === "leave") {
			handleLeaving(ev, world);
		} else if (ev.type === "environment") {
			seedEnvironment(ev, world);
		} else if (ev.type === "text") {
			handleTexting(ev, world);
		} else if (ev.type === "spells") {
			handleSpellChoosing(ev, world);
		} else if (ev.type === "sync") {
			handleSync(ev, world);
		}
	});
	world.occurrences = [];
}

function seedEnvironment(ev: w.EnvironmentSeed, world: w.World) {
	if (world.seed !== null) {
		return;
	}
	world.seed = ev.seed;
	console.log("Environment seed " + world.seed);

	const World = world.settings.World;
	const Layouts = world.settings.Layouts;

	const mapCenter = pl.Vec2(0.5, 0.5);
	let layout: Layout = Layouts[ev.layoutId];
	if (!layout) {
		const layouts = Object.keys(Layouts).map(key => Layouts[key]).filter(x => !!x);
		layout = layouts[world.seed % layouts.length];
	}
	
	const radiusMultiplier = layout.radiusMultiplier || (layout.numPoints ? (1.0 + 1 / layout.numPoints) : 1.0);
	if (radiusMultiplier) {
		world.mapRadiusMultiplier = radiusMultiplier;
	}

	if (layout.numPoints) {
		const angleOffsetInRevs = layout.angleOffsetInRevs || 0;
		const points = new Array<pl.Vec2>();
		for (let i = 0; i < layout.numPoints; ++i) {
			const angle = (angleOffsetInRevs + i / layout.numPoints) * (2 * Math.PI);
			points.push(vector.fromAngle(angle));
		}
		world.mapPoints = points;
	}

	layout.obstacles.forEach(obstacleTemplate => {
		const points = polygon(obstacleTemplate.numPoints, obstacleTemplate.extent);
		for (let i = 0; i < obstacleTemplate.numObstacles; ++i) {
			const proportion = i / obstacleTemplate.numObstacles;
			const baseAngle = proportion * (2 * Math.PI);
			const layoutAngleOffset = obstacleTemplate.layoutAngleOffsetInRevs * 2 * Math.PI;
			const orientationAngleOffset = obstacleTemplate.orientationAngleOffsetInRevs * 2 * Math.PI;
			const position = vector.plus(mapCenter, vector.multiply(vector.fromAngle(baseAngle + layoutAngleOffset), obstacleTemplate.layoutRadius));

			const orientationAngle = baseAngle + layoutAngleOffset + orientationAngleOffset;
			addObstacle(world, position, orientationAngle, points, obstacleTemplate);
		}
	});
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

function handleSync(ev: w.Syncing, world: w.World) {
	const mySnapshot = dequeueSnapshot(ev.tick, world);
	const theirSnapshot: w.Snapshot = ev;

	for (const objId of theirSnapshot.objectLookup.keys()) {
		const myHeroSnapshot = mySnapshot.objectLookup.get(objId);
		const theirHeroSnapshot = theirSnapshot.objectLookup.get(objId);

		const obj = world.objects.get(objId);
		if (!(obj)) {
			// Cannot sync non-existent hero
			continue;
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
			let position = obj.body.getPosition();
			position = vector.plus(position, posDiff);
			obj.body.setPosition(position);
		}
	}
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

function handleSpellChoosing(ev: w.ChoosingSpells, world: w.World) {
	if (!allowSpellChoosing(world, ev.heroId)) {
		return;
	}

	const hero = world.objects.get(ev.heroId);
	if (hero && hero.category === "hero") {
		assignKeyBindingsToHero(hero, ev.keyBindings, world);
		removeUnknownProjectilesFromHero(hero, world); // Disallow strategies which use two spells that should never co-occur
	}
}

function handleTexting(ev: w.Texting, world: w.World) {
	const player = world.players.get(ev.heroId);
	if (player) {
		world.ui.notifications.push({
			type: "text",
			player,
			text: ev.text,
		});
	}
}

function handleClosing(ev: w.Closing, world: w.World) {
	const isNew = ev.startTick < world.startTick; // This message gets sent twice, don't respond to it multiple times
	world.startTick = ev.startTick;

	if (isNew) {
		// Obstacles movable now
		world.objects.forEach(obstacle => {
			if (obstacle.category === "obstacle") {
				obstacle.body.resetMassData();
			}
		});

		// Clear any stockpiled halos
		world.objects.forEach(projectile => {
			if (projectile.category !== "projectile") {
				return;
			}

			projectile.expireTick = Math.min(projectile.expireTick, ev.startTick);
		});
	}

	let teamSizes: number[] = null;
	if (world.tick >= world.startTick) {
		const teams = assignTeams(ev.numTeams, world);
		if (teams) {
			teamSizes = teams.map(x => x.length);

			world.ui.notifications.push({
				type: "teams",
				teamSizes,
			});
		}

		// Close any customising dialogs as they cannot be used anymore now the game has started
		world.ui.customizingBtn = null;
	}

	world.ui.notifications.push({
		type: "closing",
		ticksUntilClose: ev.ticksUntilClose,
		teamSizes,
	});
}

function assignTeams(numTeams: number, world: w.World): string[][] {
	if (numTeams <= 1) {
		return null;
	}

	const perTeam = Math.ceil(world.players.size / numTeams);
	const teams = new Array<string[]>();

	// assign people in parties first. do it this weird way to ensure a stable sort on all machines
	const players = _.reverse(_.sortBy(world.players.valueSeq().toArray(), p => p.partyHash));
	for (const player of players) {
		let team: string[] = null;
		for (const t of teams) {
			if (t.length >= perTeam) {
				continue;
			}
			const partyHash = world.players.get(t[0]).partyHash;
			if (partyHash === player.partyHash) {
				// Find the first team with the same party as me (even if I'm in no party)
				team = t;
				break;
			}
		}
		if (!team && teams.length < numTeams) {
			// Start a new team
			team = [];
			teams.push(team);
		}
		if (!team) {
			// Add myself to the smallest team
			team = _.minBy(teams, t => t.length);
		}

		team.push(player.heroId);
	}

	for (let i = 0; i < teams.length; ++i) {
		const team = teams[i];
		const teamId = `team${i}`;
		const teamColor = Color(team.some(heroId => heroId === world.ui.myHeroId) ? HeroColors.AllyColor : HeroColors.TeamColors[i]);

		for (let j = 0; j < team.length; ++j) {
			const heroId = team[j];
			world.teams = world.teams.set(heroId, teamId);

			const player = world.players.get(heroId);
			player.uiColor = teamColor.hue(teamColor.hue() - 15 * j).darken(0.1 * j).string();
		}
	}

	world.teams.forEach((teamId, heroId) => {
		console.log("Team", teamId, heroId);
	});
	return teams;
}

function handleBotting(ev: w.Botting, world: w.World) {
	console.log("Bot joined:", ev.heroId);

	let hero = world.objects.get(ev.heroId);
	if (!hero) {
		if (alreadyDead(ev.heroId, world)) {
			console.log("Cannot revive dead player", ev.heroId);
			return;
		}

		hero = addHero(world, ev.heroId);
	} else if (hero.category !== "hero") {
		throw "Player tried to join as non-hero: " + ev.heroId;
	}

	assignKeyBindingsToHero(hero, ev.keyBindings, world); 

	const player: w.Player = {
		heroId: hero.id,
		userId: null,
		userHash: null,
		name: Matchmaking.BotName,
		uiColor: HeroColors.BotColor,
		isMobile: false,
		isBot: true,
		isSharedBot: true,
	};

	world.players = world.players.set(hero.id, player);
	world.activePlayers = world.activePlayers.delete(hero.id);

	world.ui.notifications.push({ type: "bot", player });
}

function handleJoining(ev: w.Joining, world: w.World) {
	console.log("Player joined:", ev.heroId, ev.playerName, ev.userHash, ev.userId);
	let hero = world.objects.get(ev.heroId);
	if (!hero) {
		if (alreadyDead(ev.heroId, world)) {
			console.log("Cannot revive dead player", ev.heroId);
			return;
		}

		hero = addHero(world, ev.heroId);
	} else if (hero.category !== "hero") {
		throw "Player tried to join as non-hero: " + ev.heroId;
	}

	assignKeyBindingsToHero(hero, ev.keyBindings, world);

	const player: w.Player = {
		heroId: hero.id,
		userId: ev.userId,
		userHash: ev.userHash,
		partyHash: ev.partyHash,
		name: ev.playerName,
		uiColor: hero.id === world.ui.myHeroId ? HeroColors.MyHeroColor : chooseNewPlayerColor(ev.preferredColor, world),
		isBot: ev.isBot,
		isSharedBot: false,
		isMobile: ev.isMobile,
	};

	world.players = world.players.set(hero.id, player);
	world.activePlayers = world.activePlayers.add(hero.id);

	world.ui.notifications.push({ type: "join", player });
}

function chooseNewPlayerColor(preferredColor: string, world: w.World) {
	let alreadyUsedColors = new Set<string>();	
	world.players.forEach(player => {
		if (world.activePlayers.has(player.heroId)) {
			alreadyUsedColors.add(player.uiColor);	
		}
	});	
 	let uiColor: string = null;
	if (preferredColor && !alreadyUsedColors.has(preferredColor)) {
		uiColor = colorWheel.takeColor(preferredColor)
	} else {
		uiColor = colorWheel.takeColor(null);
	}

	if (!uiColor || alreadyUsedColors.has(uiColor)) {
		for (let i = 0; i < HeroColors.Colors.length; ++i) {	
			let candidate = HeroColors.Colors[i];
			if (!alreadyUsedColors.has(candidate)) {	
				uiColor = candidate;	
				break;	
			}	
		}	
	}

	if (!uiColor) {
		uiColor = HeroColors.Colors[0];
	}

 	return uiColor;	
}

function handleLeaving(ev: w.Leaving, world: w.World) {
	console.log("Player left:", ev.heroId);
	const player = world.players.get(ev.heroId);
	if (!player) {
		return;
	}

	world.activePlayers = world.activePlayers.delete(ev.heroId);

	world.ui.notifications.push({ type: "leave", player });

	const hero = world.objects.get(ev.heroId);
	if (hero && !world.winner) {
		// Replace leaving hero with bot
		const newPlayer = {
			...player,
			isBot: true,
			isSharedBot: true,
			isMobile: false,
		};

		world.players = world.players.set(ev.heroId, newPlayer);
	}
}

function handleActions(world: w.World) {
	const nextActions = new Map<string, w.Action>();
	world.objects.forEach(hero => {
		if (hero.category !== "hero") { return; }

		let action = world.actions.get(hero.id);
		if (action) {
			hero.target = action.target;
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
		if (movementProportion > 0) {
			moveTowards(world, hero, hero.moveTo, movementProportion);
		}
	});
	world.actions = nextActions;
}

function assignKeyBindingsToHero(hero: w.Hero, keyBindings: KeyBindings, world: w.World) {
	const resolved = resolveKeyBindings(keyBindings, world.settings);
	hero.keysToSpells = resolved.keysToSpells;
	hero.spellsToKeys = resolved.spellsToKeys;
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
			destroyObject(world, obj);
		}
	});
}

function performHeroActions(world: w.World, hero: w.Hero, action: w.Action) {
	if (!action || !isValidAction(action, hero)) {
		return; // Nothing to do
	}
	const spell = world.settings.Spells[action.type];
	const uninterruptible = _.isNil(spell.interruptibleAfterTicks) || spell.interruptibleAfterTicks > 0;

	// Start casting a new spell
	if (!hero.casting || action !== hero.casting.action) {
		hero.casting = { action: action, color: spell.color, stage: w.CastStage.Cooldown };
	}

	if (hero.casting.stage === w.CastStage.Cooldown) {
		hero.casting.movementProportion = 1.0;

		if (spell.cooldown) {
			const cooldown = cooldownRemaining(world, hero, spell);
			if (cooldown > 0) {
				if (cooldown > constants.MaxCooldownWait) {
					// Just cancel spells if they're too far off cooldown
					hero.casting = null;
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

		hero.casting.uninterruptible = false;
		hero.casting.initialPosition = vector.clone(hero.body.getPosition()); // Store this to compare against for knockback cancel
		++hero.casting.stage;
	} else if (hero.casting.stage > w.CastStage.Orientating) {
	}


	if (spell.knockbackCancel && vector.distance(hero.casting.initialPosition, hero.body.getPosition()) > constants.Pixel) {
		const channellingTime = hero.casting.channellingStartTick ? world.tick - hero.casting.channellingStartTick : 0;
		const maxChannellingTicks = spell.knockbackCancel.maxChannelingTicks ? spell.knockbackCancel.maxChannelingTicks : Infinity;
		if (spell.knockbackCancel.cooldownTicks !== undefined && channellingTime <= maxChannellingTicks) {
			setCooldown(world, hero, spell.id, spell.knockbackCancel.cooldownTicks);
		}
		hero.casting.stage = w.CastStage.Complete;
	}

	if (hero.casting.stage === w.CastStage.Charging) {
		// Entering charging stage
		if (!hero.casting.chargeStartTick) {
			hero.casting.chargeStartTick = world.tick;
			hero.casting.uninterruptible = uninterruptible;
			hero.casting.movementProportion = spell.movementProportionWhileCharging;
		}
		// Orientate during charging
		if (spell.revsPerTickWhileCharging > 0 && hero.target) {
			turnTowards(hero, hero.target, spell.revsPerTickWhileCharging);
		}
		
		// Waiting for charging to complete
		const ticksCharging = world.tick - hero.casting.chargeStartTick;
		if (spell.chargeTicks && ticksCharging < spell.chargeTicks) {
			hero.casting.proportion = 1.0 * ticksCharging / spell.chargeTicks;
			return;
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
			hero.casting.initialPosition = hero.casting.initialPosition || vector.clone(hero.body.getPosition());

			if (spell.cooldown) {
				setCooldown(world, hero, spell.id, spell.cooldown);
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

function turnTowards(hero: w.Hero, target: pl.Vec2, revsPerTick?: number) {
	if (revsPerTick === undefined) {
		revsPerTick = hero.revolutionsPerTick;
	}

	const targetAngle = vector.angle(vector.diff(target, hero.body.getPosition()));
	const currentAngle = hero.body.getAngle();

	const newAngle = vector.turnTowards(currentAngle, targetAngle, revsPerTick * 2 * Math.PI);
	hero.body.setAngle(newAngle);

	return Math.abs(vector.angleDelta(newAngle, targetAngle));
}

function isValidAction(action: w.Action, hero: w.Hero) {
	if (action.type === w.Actions.Move || action.type === w.Actions.Stop || action.type === w.Actions.Retarget) {
		return true;
	} else {
		return hero.spellsToKeys.has(action.type);
	}
}

function applyPreAction(world: w.World, hero: w.Hero, action: w.Action, spell: Spell): boolean {
	switch (spell.action) {
		case "move": return moveAction(world, hero, action, spell);
		case "retarget": return true; // All actions retarget - nothing extra to do
		default: return false;
	}
}

function moveAction(world: w.World, hero: w.Hero, action: w.Action, spell: MoveSpell) {
	hero.moveTo = action.target;
	if (spell.cancelChanneling && hero.casting && !hero.casting.uninterruptible) {
		const channelling = world.settings.Spells[hero.casting.action.type];
		if (channelling.movementCancel) {
			hero.casting = null;
		}
	}
	return true;
}

function applyAction(world: w.World, hero: w.Hero, action: w.Action, spell: Spell): boolean {
	spellPreactions(world, hero, action, spell);

	switch (spell.action) {
		case "stop": return stopAction(world, hero, action, spell); // Do nothing
		case "buff": return buffAction(world, hero, action, spell);
		case "projectile": return spawnProjectileAction(world, hero, action, spell);
		case "spray": return sprayProjectileAction(world, hero, action, spell);
		case "retractor": return retractorAction(world, hero, action, spell);
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
			spell.buffs.forEach(template => {
				const id = `${spell.id}/${template.type}`;
				instantiateBuff(id, template, hero, world, {
					channellingSpellId: spell.id,
				});
			});
		}
	}
}

function handleContact(world: w.World, contact: pl.Contact) {
	if (!contact.isTouching()) {
		return;
	}

	const objA = world.objects.get(contact.getFixtureA().getBody().getUserData());
	const objB = world.objects.get(contact.getFixtureB().getBody().getUserData());

	const manifold = contact.getWorldManifold(); // If no collision manifold, this is a sensor
	const collisionPoint = manifold ? vector.average(manifold.points) : null;

	if (objA && objB) {
		handleCollision(world, objA, objB, collisionPoint);
		handleCollision(world, objB, objA, collisionPoint);
	}
}

function handleCollision(world: w.World, object: w.WorldObject, hit: w.WorldObject, collisionPoint: pl.Vec2) {
	if (object.category === "projectile") {
		if (collisionPoint) {
			object.uiPath.push(collisionPoint);
		}

		if (hit.category === "hero") {
			handleProjectileHitHero(world, object, hit);
		} else if (hit.category === "projectile") {
			handleProjectileHitProjectile(world, object, hit);
		} else if (hit.category === "obstacle") {
			handleProjectileHitObstacle(world, object, hit);
		} else if (hit.category === "shield") {
			handleProjectileHitShield(world, object, hit);
		}
	} else if (object.category === "hero") {
		if (hit.category === "hero") {
			handleHeroHitHero(world, object, hit);
		} else if (hit.category === "projectile") {
			handleHeroHitProjectile(world, object, hit);
		} else if (hit.category === "obstacle") {
			handleHeroHitObstacle(world, object, hit);
		} else if (hit.category === "shield") {
			handleHeroHitShield(world, object, hit);
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
	const pushbackDirection = vector.unit(vector.diff(hero.body.getPosition(), other.body.getPosition()));
	const repelDistance = Hero.Radius * 2 - vector.distance(hero.body.getPosition(), other.body.getPosition());
	if (repelDistance > 0) {
		const step = vector.multiply(pushbackDirection, repelDistance);
		const impulse = vector.multiply(step, Hero.SeparationImpulsePerTick);
		hero.body.applyLinearImpulse(impulse, hero.body.getWorldPoint(vector.zero()), true);
	}

	// If using thrust, cause damage
	if (hero.thrust) {
		if (!hero.thrust.alreadyHit.has(other.id)) {
			hero.thrust.alreadyHit.add(other.id);

			const alliance = calculateAlliance(hero.id, other.id, world);
			if ((alliance && Alliances.NotFriendly) > 0) {
				const damagePacket = instantiateDamage(hero.thrust.damageTemplate, hero.id, world);
				applyDamage(other, damagePacket, world);
	
				expireOnHeroHit(other, world);
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
	if (hero.thrust) {
		const packet = instantiateDamage(hero.thrust.damageTemplate, hero.id, world);
		applyDamageToObstacle(obstacle, packet, world);
		hero.thrust.nullified = true;
	}
}

function handleProjectileHitObstacle(world: w.World, projectile: w.Projectile, obstacle: w.Obstacle) {
	if (takeHit(projectile, obstacle.id, world)) {
		let packet = instantiateDamage(projectile.damageTemplate, projectile.owner, world);
		packet = scaleForPartialDamage(world, projectile, packet);
		applyDamageToObstacle(obstacle, packet, world);

		linkTo(projectile, obstacle, world);
	}

	if (expireOn(world, projectile, obstacle)) {
		detonateProjectile(projectile, world);
		applySwap(projectile, obstacle, world);
		destroyObject(world, projectile);
	}
}

function handleProjectileHitProjectile(world: w.World, projectile: w.Projectile, other: w.Projectile) {
	takeHit(projectile, other.id, world); // Make the projectile glow

	if (expireOn(world, projectile, other)) {
		detonateProjectile(projectile, world);
		applySwap(projectile, other, world);
		destroyObject(world, projectile);
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
	}

	if (!myProjectile && expireOn(world, projectile, shield)) { // Every projectile is going to hit its owner's shield on the way out
		detonateProjectile(projectile, world);
		applySwap(projectile, shield, world);
		destroyObject(world, projectile);
	}
}

function swapOwnership(projectile: w.Projectile, newOwner: string, world: w.World) {
	projectile.targetId = projectile.owner;
	projectile.owner = newOwner;

	const fixture = projectile.body.getFixtureList();
	if (fixture.getFilterGroupIndex() < 0) {
		const hero = world.objects.get(newOwner);
		if (hero && hero.category === "hero") {
			updateGroupIndex(fixture, hero.filterGroupIndex);
		} else {
			updateGroupIndex(fixture, 0);
		}
	}
}

function handleProjectileHitHero(world: w.World, projectile: w.Projectile, hero: w.Hero) {
	if ((projectile.collideWith & Categories.Shield) && isHeroShielded(hero, world)) {
		return;
	}

	const alliance = calculateAlliance(projectile.owner, hero.id, world);

	if (takeHit(projectile, hero.id, world) && hero.id !== projectile.owner) {
		applyBuffs(projectile, hero, world);
		linkTo(projectile, hero, world);
		applySwap(projectile, hero, world);

		if ((alliance & Alliances.NotFriendly) > 0) { // Don't damage allies
			let packet = instantiateDamage(projectile.damageTemplate, projectile.owner, world);
			packet = scaleForPartialDamage(world, projectile, packet);
			applyDamage(hero, packet, world);

			emitPush(projectile, hero, world);
			expireOnHeroHit(hero, world);
		}
		projectile.hit = world.tick;
	}

	if (projectile.gravity) {
		applyGravity(projectile, hero, world);
	}
	if (projectile.bounce) {
		bounceToNext(projectile, hero.id, world);
	}
	if (expireOn(world, projectile, hero)) {
		detonateProjectile(projectile, world);
		destroyObject(world, projectile);
	}
}

function emitPush(projectile: w.Projectile, hero: w.Hero, world: w.World) {
	let direction = projectile.body.getLinearVelocity();
	const owner = world.objects.get(projectile.owner);
	if (owner && owner.category === "hero") {
		// The projectile normally just ricocheted in a weird direction, so correct the direction
		direction = vector.diff(projectile.body.getPosition(), owner.body.getPosition());
	}

	const push: w.PushEvent = {
		type: "push",
		tick: world.tick,
		owner: projectile.owner,
		objectId: hero.id,
		direction,
		color: projectile.color,
	};
	world.ui.events.push(push);
}

export function calculatePartialDamageMultiplier(world: w.World, projectile: w.Projectile): number {
	const partialDamage = projectile.partialDamage;
	const lifetime = world.tick - projectile.createTick;
	if (partialDamage && lifetime < partialDamage.ticks) {
		if (partialDamage.step) {
			return partialDamage.initialMultiplier;
		} else {
			return partialDamage.initialMultiplier + (1 - partialDamage.initialMultiplier) * (lifetime / partialDamage.ticks);
		}
	} else {
		return 1;
	}
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

function takeHit(projectile: w.Projectile, hitId: string, world: w.World) {
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
	for (const shieldId of hero.shieldIds) {
		if (world.objects.has(shieldId)) {
			return true;
		} else {
			hero.shieldIds.delete(shieldId);
		}
	}
	return false;
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
	return world.teams.get(heroId) || heroId;
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
	if (!projectile.swapWith) {
		return;
	}

	const owner = world.objects.get(projectile.owner);
	if (!(owner && owner.category === "hero")) {
		return;
	}

	if (target && (target.categories & projectile.swapWith) > 0 && world.tick >= world.startTick) {
		const ownerPos = vector.clone(owner.body.getPosition());
		const targetPos = vector.clone(target.body.getPosition());

		owner.body.setPosition(targetPos);
		target.body.setPosition(ownerPos);

		world.ui.events.push({
			type: "teleport",
			tick: world.tick,
			sound: projectile.sound,
			fromPos: ownerPos,
			toPos: targetPos,
			heroId: owner.id,
		});

		if (target.category === "hero") {
			world.ui.events.push({
				type: "teleport",
				tick: world.tick,
				sound: projectile.sound,
				fromPos: targetPos,
				toPos: ownerPos,
				heroId: target.id,
			});
		}
	} else {
		const initialPos = vector.clone(owner.body.getPosition());
		owner.body.setPosition(projectile.body.getPosition());

		world.ui.events.push({
			type: "teleport",
			tick: world.tick,
			sound: projectile.sound,
			fromPos: initialPos,
			toPos: vector.clone(owner.body.getPosition()),
			heroId: owner.id,
		});
	}

	// You only swap once
	projectile.swapWith = 0;
}

function swapOnExpiry(projectile: w.Projectile, world: w.World) {
	applyBuffs(projectile, null, world);
	applySwap(projectile, null, world);
}

function applyBuffs(projectile: w.Projectile, target: w.Hero, world: w.World) {
	if (!projectile.buffs) {
		return;
	}

	const owner: w.Hero = world.objects.get(projectile.owner) as w.Hero;
	projectile.buffs.forEach(template => {
		const receiver = template.owner ? owner : target;
		if (!receiver) {
			return;
		}

		const against = template.against !== undefined ? template.against : Categories.All;
		if (against !== Categories.All) {
			const targetId = target ? target.id : null;
			if (!(calculateAlliance(projectile.owner, targetId, world) & against)) {
				return;
			}
		}

		const id = `${projectile.type}-${template.type}`;
		instantiateBuff(id, template, receiver, world, {
			fromHeroId: projectile.owner,
			toHeroId: target && target.id,
		});
	});
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
	projectile.expireTick = world.tick;

	const maxTicks = link.linkTicks;
	owner.link = {
		targetId: target.id,
		minDistance: link.minDistance,
		maxDistance: link.maxDistance,
		selfFactor: link.selfFactor !== undefined ? link.selfFactor : 1,
		targetFactor: link.targetFactor !== undefined ? link.targetFactor : 1,
		strength: link.impulsePerTick,
		movementProportion: link.movementProportion !== undefined ? link.movementProportion : 1,
		initialTick: world.tick,
		expireTick: world.tick + maxTicks,
		render: link.render,
	};
	world.behaviours.push({ type: "linkForce", heroId: owner.id });
}

function bounceToNext(projectile: w.Projectile, hitId: string, world: w.World) {
	if (!projectile.bounce) {
		return;
	}

	// Always bounce between owner and another target
	let nextTarget: w.WorldObject =
		hitId === projectile.owner
		? findNearest(
			world.objects,
			projectile.body.getPosition(),
			x => x.category === "hero" && x.id !== projectile.owner && (calculateAlliance(projectile.owner, x.id, world) & Alliances.NotFriendly) > 0 && !isHeroInvisible(x))
		: world.objects.get(projectile.owner);
	if (!nextTarget) {
		return;
	}

	projectile.targetId = nextTarget.id;

	let currentSpeed = vector.length(projectile.body.getLinearVelocity());
	let newDirection = vector.unit(vector.diff(nextTarget.body.getPosition(), projectile.body.getPosition()));
	let newVelocity = vector.multiply(newDirection, currentSpeed);
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

	const towardsOrb = vector.diff(hero.gravity.location, hero.body.getPosition());
	const distanceTo = vector.length(towardsOrb);
	if (distanceTo >= hero.gravity.radius) {
		hero.gravity = null;
		return false;
	}

	const proportion = Math.pow(1.0 - distanceTo / hero.gravity.radius, hero.gravity.power);
	const strength = hero.gravity.strength * proportion;

	const impulse = vector.multiply(vector.unit(towardsOrb), strength);
	hero.body.applyLinearImpulse(impulse, hero.body.getWorldPoint(vector.zero()), true);
	return true;
}

function attract(attraction: w.AttractBehaviour, world: w.World) {
	const orb = world.objects.get(attraction.objectId);
	if (!(orb)) {
		return false;
	}

	const epicenter = orb.body.getPosition();

	world.objects.forEach(obj => {
		if (!((obj.categories & attraction.categories) > 0 && (obj.categories & attraction.notCategories) === 0)) {
			return;
		}

		if (obj.category === "hero") {
			if (!(calculateAlliance(attraction.owner, obj.id, world) & attraction.against)) {
				return;
			}
		} else if (obj.category === "projectile") {
			if (!(obj.collideWith & attraction.collideLike)) {
				return;
			} else if (!(calculateAlliance(attraction.owner, obj.owner, world) & attraction.against)) {
				return;
			}
		}

		const towardsOrb = vector.diff(epicenter, obj.body.getPosition());
		const distanceTo = vector.length(towardsOrb);
		if (distanceTo >= attraction.radius) {
			return;
		}

		const acceleration = vector.relengthen(towardsOrb, attraction.accelerationPerTick);

		let velocity = obj.body.getLinearVelocity();
		velocity = vector.plus(velocity, acceleration);

		if (attraction.maxSpeed) {
			velocity = vector.truncate(velocity, attraction.maxSpeed);
		}

		obj.body.setLinearVelocity(velocity);
	});
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
		const targetObj = world.objects.get(projectile.targetId);
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
		target = projectile.target;
	} else if (targetType === w.HomingTargets.follow) {
		target = projectile.target;

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

	const maxTurnRate = homing.maxTurnProportion * Math.abs(vector.angleDelta(currentAngle, idealAngle));
	const turnRate = Math.min(homing.turnRate, maxTurnRate);
	const newAngle = vector.turnTowards(currentAngle, idealAngle, turnRate);

	const currentSpeed = vector.length(currentVelocity);
	const newSpeed = homing.newSpeed !== undefined ? homing.newSpeed : currentSpeed;
	const newVelocity = vector.multiply(vector.fromAngle(newAngle), newSpeed);

	obj.body.setLinearVelocity(newVelocity);

	// Change the projectile's intended speed so it doesn't get corrected away from the change
	if (homing.newSpeed !== undefined) {
		obj.speed = homing.newSpeed;
	}

	if (homing.redirect) {
		return false; // Only want to do this once, cancel immediately
	} else {
		return true;
	}
}

function linkForce(behaviour: w.LinkBehaviour, world: w.World) {
	const owner = world.objects.get(behaviour.heroId);
	if (!(owner && owner.category === "hero" && owner.link)) {
		return false;
	}

	if (world.tick >= owner.link.expireTick) {
		owner.link = null;
		return false;
	}

	const target = world.objects.get(owner.link.targetId);
	if (!(owner && target)) {
		owner.link = null;
		return false;
	}

	if (target.category === "hero" && target.cleanseTick && owner.link.initialTick < target.cleanseTick) {
		owner.link = null;
		return false;
	}

	const minDistance = owner.link.minDistance;
	const maxDistance = owner.link.maxDistance;

	const diff = vector.diff(target.body.getPosition(), owner.body.getPosition());
	const distance = vector.length(diff);
	const strength = owner.link.strength * Math.max(0, distance - minDistance) / (maxDistance - minDistance);
	if (strength <= 0) {
		return true;
	}

	owner.body.applyLinearImpulse(
		vector.relengthen(diff, owner.link.selfFactor * strength * owner.body.getMass()),
		owner.body.getWorldPoint(vector.zero()), true);

	if (target.category === "hero") {
		target.body.applyLinearImpulse(
			vector.relengthen(vector.negate(diff), owner.link.targetFactor * strength * target.body.getMass()),
			target.body.getWorldPoint(vector.zero()), true);
	}

	return true;
}

function reflectFollow(behaviour: w.ReflectFollowBehaviour, world: w.World) {
	const shield = world.objects.get(behaviour.shieldId);
	if (shield && shield.category === "shield" && shield.type === "reflect" && world.tick < shield.expireTick) {
		const hero = world.objects.get(shield.owner);
		if (hero) {
			shield.body.setPosition(vector.clone(hero.body.getPosition()));
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

function decayMitigation(world: w.World) {
	world.objects.forEach(hero => {
		if (hero.category === "hero" && hero.damageSourceHistory.length > 0) {
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
	});
}

function expireBuffs(behaviour: w.ExpireBuffsBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	hero.buffs.forEach((buff, id) => {
		if (isBuffExpired(buff, hero, world)) {
			buff.destroyedTick = world.tick;
			hero.buffs.delete(id); // Yes you can delete from a map while iterating it
			hero.uiDestroyedBuffs.push(buff);

			if (buff.type === "vanish") {
				world.ui.events.push({ type: "vanish", tick: world.tick, heroId: hero.id, pos: vector.clone(hero.body.getPosition()), appear: true });
			}
		}
	});

	return true;
}

function isBuffExpired(buff: w.Buff, hero: w.Hero, world: w.World) {
	if (world.tick >= buff.expireTick) {
		return true;
	} else if (hero.cleanseTick && buff.initialTick < hero.cleanseTick) {
		return true;
	} else if (buff.hitTick && hero.hitTick > buff.hitTick) {
		return true;
	} else if (buff.channellingSpellId && (!hero.casting || hero.casting.action.type !== buff.channellingSpellId)) {
		return true;
	}
	return false;
}

function expireOnHeroHit(hero: w.Hero, world: w.World) {
	for (const projectileId of hero.strafeIds) {
		const projectile = world.objects.get(projectileId);
		if (projectile && projectile.category === "projectile" && projectile.strafe && projectile.strafe.expireOnHeroHit) {
			projectile.expireTick = world.tick;
		}
	}

	return true;
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
	const multiplier = calculatePartialDamageMultiplier(world, projectile);
	const detonate: DetonateParameters = {
		...projectile.detonate,
		damage: projectile.detonate.damage * multiplier,
		outerDamage: (projectile.detonate.outerDamage !== undefined ? projectile.detonate.outerDamage : projectile.detonate.damage) * multiplier,
	};

	const partialRadius = detonate.partialRadius !== undefined ? detonate.partialRadius : false;
	if (partialRadius) {
		detonate.minImpulse = projectile.detonate.minImpulse * multiplier;
		detonate.maxImpulse = projectile.detonate.maxImpulse * multiplier;
		detonate.radius = projectile.detonate.radius * multiplier;
	}
	detonateAt(projectile.body.getPosition(), projectile.owner, detonate, world, projectile.id, projectile.color, projectile.sound);

	// Don't allow for repeats
	projectile.detonate = null;
}

function detonateAt(epicenter: pl.Vec2, owner: string, detonate: DetonateParameters, world: w.World, sourceId: string, color: string = null, sound: string = null) {
	const outerDamage = detonate.outerDamage !== undefined ? detonate.outerDamage : detonate.damage;
	const innerDamagePacket = instantiateDamage(detonate, owner, world);
	const outerDamagePacket = instantiateDamage({ ...detonate, damage: outerDamage }, owner, world); 

	world.objects.forEach(other => {
		if (!(other.category === "hero" || other.category === "obstacle" || other.category === "projectile")) {
			return;
		}

		const diff = vector.diff(other.body.getPosition(), epicenter);
		const extent = getExtent(other);
		const explosionRadius = detonate.radius + extent; // +extent because only need to touch the edge

		const distance = vector.length(diff);
		if (!(other.id !== owner && distance <= explosionRadius)) {
			return;
		}

		if (other.category === "hero" || other.category === "obstacle") {
			const proportion = 1.0 - (distance / explosionRadius);

			const packet: w.DamagePacket = {
				...innerDamagePacket,
				damage: proportion * innerDamagePacket.damage + (1 - proportion) * outerDamagePacket.damage,
			};
			let applyKnockback = false;
			if (other.category === "hero") {
				const alliance = calculateAlliance(owner, other.id, world);
				if ((alliance & Alliances.NotFriendly) > 0) {
					applyDamage(other, packet, world);
					expireOnHeroHit(other, world);
					applyKnockback = true;
				}
			} else {
				applyDamageToObstacle(other, packet, world);
				applyKnockback = true;
			}

			if (applyKnockback && detonate.maxImpulse) {
				const magnitude = detonate.minImpulse + proportion * (detonate.maxImpulse - detonate.minImpulse);
				const direction = vector.relengthen(diff, magnitude);
				other.body.applyLinearImpulse(direction, other.body.getWorldPoint(vector.zero()), true);
				world.ui.events.push({ type: "push", tick: world.tick, owner, objectId: other.id, color, direction });
			}
		} else if (other.category === "projectile") {
			if (destructibleBy(other, owner, world)) {
				other.expireTick = world.tick;
			}
		}
	});

	world.ui.events.push({
		type: "detonate",
		tick: world.tick,
		sourceId,
		sound: sound,
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

function getExtent(obj: w.WorldObject) {
	if (obj.category === "obstacle") {
		return obj.extent;
	} else if (obj.category === "hero" || obj.category === "projectile") {
		return obj.radius;
	} else if (obj.category === "shield") {
		const shield = obj;
		if (shield.type === "reflect") {
			return shield.radius;
		} else if (shield.type === "wall") {
			return shield.extent;
		} else {
			return 0;
		}
	} else {
		return 0;
	}
}

function applyLavaDamage(world: w.World) {
	const lavaDamagePerTick = world.settings.World.LavaDamagePerSecond / TicksPerSecond;
	const damagePacket: w.DamagePacket = {
		damage: lavaDamagePerTick,
		lifeSteal: 0,
		fromHeroId: null,
		isLava: true,
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
				if (damageMultiplier >= 0) {
					const heroDamagePacket = {
						...damagePacket,
						damage: damagePacket.damage * damageMultiplier,
					};
					applyDamage(obj, heroDamagePacket, world);
				}
			}
		} else if (obj.category === "obstacle") {
			if (!isInsideMap(obj, world)) {
				applyDamageToObstacle(obj, damagePacket, world);
			}
		}
	});
}

export function isInsideMap(obj: w.WorldObject, world: w.World) {
	if (world.radius <= 0) {
		return false;
	}

	const mapCenter = pl.Vec2(0.5, 0.5);
	const diff = vector.diff(obj.body.getPosition(), mapCenter);
	const extent = getExtent(obj);

	const polygonRadius = world.mapRadiusMultiplier * world.radius;
	if (world.mapPoints) {
		const scaledDiff = vector.multiply(diff, 1 / polygonRadius);
		const scaledExtent = -extent / polygonRadius;
		for (let i = 0; i < world.mapPoints.length; ++i) {
			const a = world.mapPoints[i];
			const b = world.mapPoints[(i + 1) % world.mapPoints.length];
			if (!vector.insideLine(scaledDiff, scaledExtent, a, b)) {
				return false;
			}
		}
		return true;
	} else {
		return vector.length(diff) < polygonRadius - extent;
	}
}

function shrink(world: w.World) {
	const World = world.settings.World;
	if (world.tick >= world.startTick && !world.winner) {
		const seconds = (world.tick - world.startTick) / TicksPerSecond;
		const proportion = Math.max(0, 1.0 - seconds / World.SecondsToShrink);

		const powerAlpha = Math.min(1, world.players.size / Matchmaking.MaxPlayers);
		const power = powerAlpha * World.ShrinkPowerMaxPlayers + (1 - powerAlpha) * World.ShrinkPowerMinPlayers;
		world.radius = World.InitialRadius * Math.pow(proportion, power);
	}
}

function reap(world: w.World) {
	let heroKilled = false;
	world.objects.forEach(obj => {
		if (obj.category === "hero") {
			if (obj.health <= 0) {
				destroyObject(world, obj);
				notifyKill(obj, world);
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
		if (obj.category === "hero" || (obstacles && obj.category === "obstacle")) {
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

function alreadyDead(heroId: string, world: w.World) {
	const existingPlayer = world.players.get(heroId);
	return existingPlayer && existingPlayer.dead;
}

function notifyWin(world: w.World) {
	if (world.winner) {
		return;
	}

	if (!isGameFinished(world)) {
		return;
	}

	let scores = world.scores.valueSeq().toArray();
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
		} else if (a.assists > b.assists) {
			return -1;
		} else if (a.assists < b.assists) {
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
}

function isGameFinished(world: w.World) {
	const heroes = [...world.objects.values()].filter(x => x.category === "hero") as w.Hero[];
	if (heroes.length === 0) {
		return true;
	}

	const firstTeamId = getTeam(heroes[0].id, world);
	for (let i = 1; i < heroes.length; ++i) {
		if (getTeam(heroes[i].id, world) !== firstTeamId) {
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
	const assist = hero.assistHeroId && world.players.get(hero.assistHeroId) || null;
	world.ui.notifications.push({ type: "kill", myHeroId, killed, killer, assist });
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
		if (hero.assistHeroId) {
			const score = world.scores.get(hero.assistHeroId);
			world.scores = world.scores.set(hero.assistHeroId, { ...score, assists: score.assists + 1 });
		}
	}
}

function destroyObject(world: w.World, object: w.WorldObject) {
	world.objects.delete(object.id);
	world.physics.destroyBody(object.body);

	object.destroyedTick = world.tick;
	world.ui.destroyed.push(object);
}

function calculateMovementProportion(hero: w.Hero, world: w.World): number {
	let multiplier = 1.0;
	if (hero.casting) {
		multiplier *= hero.casting.movementProportion || 0.0;
	}
	if (hero.link) {
		multiplier *= hero.link.movementProportion;
	}
	hero.buffs.forEach(buff => {
		if (buff.type === "movement") {
			multiplier *= buff.movementProportion;
		}
	});
	return multiplier;
}

function moveTowards(world: w.World, hero: w.Hero, target: pl.Vec2, movementProportion: number = 1.0) {
	if (!target) { return; }

	turnTowards(hero, target);

	const current = hero.body.getPosition();

	const idealStep = vector.truncate(vector.diff(target, current), movementProportion * hero.moveSpeedPerSecond / TicksPerSecond);
	const facing = vector.fromAngle(hero.body.getAngle());
	const step = vector.multiply(vector.unit(idealStep), vector.dot(idealStep, facing)); // Project onto the direction we're facing

	hero.body.setPosition(vector.plus(hero.body.getPosition(), step));

	hero.strafeIds.forEach(projectileId => {
		const projectile = world.objects.get(projectileId);
		if (projectile) {
			if (projectile.category === "projectile" && projectile.strafe && projectile.owner === hero.id) {
				projectile.body.setPosition(vector.plus(projectile.body.getPosition(), step));
			}
		} else {
			hero.strafeIds.delete(projectileId); // Yes you can delete from a set while iterating in ES6
		}
	});

	const done = vector.distance(current, target) < constants.Pixel;
	hero.moveTo = done ? null : target;
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

function sprayProjectileAction(world: w.World, hero: w.Hero, action: w.Action, spell: SpraySpell) {
	if (!action.target) { return true; }

	const currentLength = world.tick - hero.casting.channellingStartTick;
	if (currentLength >= spell.lengthTicks) {
		return true;
	}

	if (currentLength % spell.intervalTicks === 0) {
		const pos = hero.body.getPosition();

		let directionTarget = action.target;
		if (spell.revsPerTickWhileChannelling > 0 || (directionTarget.x === pos.x && directionTarget.y === pos.y)) {
			directionTarget = vector.plus(pos, vector.fromAngle(hero.body.getAngle()));
		}

		const diff = vector.diff(directionTarget, pos);
		const currentAngle = vector.angle(diff);

		const projectileIndex = Math.floor(currentLength / spell.intervalTicks);
		const numProjectiles = spell.lengthTicks / spell.intervalTicks;
		const angleOffset = (numProjectiles % 2 === 0) ? (Math.PI / numProjectiles) : 0; // If even number, offset either side of middle
		const newAngle = currentAngle + 2 * Math.PI * (projectileIndex / numProjectiles) + angleOffset;

		const jitterRadius = vector.length(diff) * spell.jitterRatio;
		directionTarget = vector.plus(directionTarget, vector.multiply(vector.fromAngle(newAngle), jitterRadius));

		addProjectile(world, hero, action.target, spell, spell.projectile, {
			directionTarget,
		});
	}
	return false;
}

function retractorAction(world: w.World, hero: w.Hero, action: w.Action, spell: RetractorSpell) {
	if (!action.target) { return true; }

	const retractorId = hero.retractorIds.get(spell.id);
	if (retractorId) {
		const retractor = world.objects.get(retractorId);
		if (retractor && retractor.category === "projectile") {
			retractor.owner = hero.id; // Take back ownership, if it was lost to a shield
			retractor.target = action.target;
			instantiateProjectileBehaviours(spell.retractBehaviours, retractor, world);
			hero.retractorIds.delete(spell.id);
		}
	} else {
		const retractor = addProjectile(world, hero, action.target, spell, spell.projectile);
		hero.retractorIds.set(spell.id, retractor.id);
		world.behaviours.push({
			type: "retractor",
			heroId: hero.id,
			spellId: spell.id,
		});
	}

	return true;
}

function focusAction(world: w.World, hero: w.Hero, action: w.Action, spell: FocusSpell) {
	if (!action.target) { return true; }

	if (world.tick == hero.casting.channellingStartTick) {
		const focus = addProjectile(world, hero, action.target, spell, spell.projectile);
		hero.focusIds.set(spell.id, focus.id);
	}

	let done = true;

	const focusId = hero.focusIds.get(spell.id);
	if (focusId) {
		const focus = world.objects.get(focusId);
		done = !(focus && focus.category === "projectile");
	}

	if (!done) {
		// Keep resetting the cooldown until focus complete
		setCooldown(world, hero, spell.id, spell.cooldown);
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
		return Math.max(0, vector.distance(hit, from) - constants.Pixel); // -Pixel so we are on this side of the shield
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

	if (world.tick == hero.casting.channellingStartTick) {
		const availableRange = spell.range;
		const speed = spell.speed;
		const maxTicks = TicksPerSecond * availableRange / speed;

		const diff = vector.diff(action.target, hero.body.getPosition());
		const distancePerTick = speed / TicksPerSecond;
		const ticksToTarget = Math.floor(vector.length(diff) / distancePerTick);
		const velocity = vector.multiply(vector.unit(diff), speed);

		const ticks = Math.min(maxTicks, ticksToTarget);

		const thrustRadius = hero.radius * spell.radiusMultiplier;
		const fixture = hero.body.createFixture(pl.Circle(thrustRadius), {
			density: 0,
			filterCategoryBits: Categories.Hero,
			filterMaskBits: Categories.All,
			filterGroupIndex: hero.filterGroupIndex,
		});
		let thrust: w.ThrustState = {
			damageTemplate: spell.damageTemplate,
			velocity,
			ticks,
			nullified: false,
			alreadyHit: new Set<string>(),
			initialRadius: hero.radius,
			fixture,
		};

		hero.radius = thrustRadius;
		hero.thrust = thrust;
		hero.moveTo = action.target;

		world.behaviours.push({ type: "thrustBounce", heroId: hero.id, bounceTicks: spell.bounceTicks });
		world.behaviours.push({ type: "thrustDecay", heroId: hero.id });
	}

	if (hero.thrust) {
		if (hero.thrust.nullified) {
			hero.thrust.ticks = Math.min(spell.bounceTicks, hero.thrust.ticks);
		} else {
			hero.body.setLinearVelocity(hero.thrust.velocity);
		}
	}

	return !hero.thrust;
}

function thrustBounce(behaviour: w.ThrustBounceBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	if (hero.thrust) {
		updateMaskBits(hero.body.getFixtureList(), Categories.All);

		if (hero.thrust.nullified) {
			hero.thrust.ticks = Math.min(behaviour.bounceTicks, hero.thrust.ticks);
		} else {
			hero.body.setLinearVelocity(hero.thrust.velocity);
		}

		return true;
	} else {
		updateMaskBits(hero.body.getFixtureList(), Categories.All ^ Categories.Shield);
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
		hero.body.setLinearVelocity(vector.zero());
		hero.radius = hero.thrust.initialRadius;

		hero.body.destroyFixture(hero.thrust.fixture);
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
			world.behaviours.push({ type: "saberSwing", shieldId: saber.id });
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
	if (!(hero && hero.category === "hero")) {
		// Hero died
		destroyObject(world, shield);
		return false;
	}

	if (!(hero.casting && hero.casting.action.type === saber.spellId)) {
		// Cancelled
		destroyObject(world, shield);
		return false;
	}

	const heroPos = hero.body.getPosition();

	const previousAngle = saber.body.getAngle();
	const targetAngle = vector.angle(vector.diff(hero.target, heroPos)) + saber.angleOffset;
	const newAngle = vector.turnTowards(previousAngle, targetAngle, saber.turnRate);
	if (previousAngle === newAngle) {
		return true; // Nothing to do
	}

	const saberAngleDelta = vector.angleDelta(previousAngle, newAngle);

	const antiClockwise = saberAngleDelta >= 0;
	const previousTip = vector.multiply(vector.fromAngle(previousAngle), saber.length);
	const newTip = vector.multiply(vector.fromAngle(newAngle), saber.length);

	const swing = vector.diff(newTip, previousTip);
	const swingVelocity = vector.truncate(vector.multiply(swing, TicksPerSecond * saber.speedMultiplier), saber.maxSpeed);
	const swingSpeed = vector.length(swingVelocity);

	const shift = vector.multiply(swing, Math.max(0, saber.shiftMultiplier));

	let hit = false
	world.objects.forEach(obj => {
		if (obj.id === hero.id || !(shouldCollide(saber, obj) || obj.category === "hero" || (obj.category === "projectile" && destructibleBy(obj, hero.id, world)))) {
			return;
		}

		const objPos = obj.body.getPosition();
		const diff = vector.diff(objPos, heroPos);
		const distance = vector.length(diff);
		const extent = getExtent(obj);
		if (distance > saber.length + extent) {
			return;
		}

		const insidePrevious = vector.insideLine(diff, extent, vector.zero(), previousTip, antiClockwise);
		const insideNew = vector.insideLine(diff, extent, newTip, vector.zero(), antiClockwise);
		if (!(insidePrevious && insideNew)) {
			return;
		}

		obj.body.setPosition(vector.plus(obj.body.getPosition(), shift));

		const currentSpeed = vector.length(obj.body.getLinearVelocity());
		if (currentSpeed < swingSpeed) {
			obj.body.setLinearVelocity(swingVelocity);

			world.ui.events.push({ type: "push", tick: world.tick, owner: hero.id, objectId: obj.id, direction: swingVelocity });
		}

		if (obj.category === "projectile") {
			if (saber.takesOwnership && obj.shieldTakesOwnership && (calculateAlliance(saber.owner, obj.owner, world) & Alliances.Enemy) > 0) {
				// Redirect back to owner
				swapOwnership(obj, shield.owner, world);
			}

			if (destructibleBy(obj, hero.id, world)) {
				obj.expireTick = world.tick;
			}
		} else if (obj.category === "hero") {
			expireOnHeroHit(obj, world);
		}

		hit = true;
	});

	if (hit) {
		saber.hitTick = world.tick;
	}

	saber.body.setPosition(vector.clone(heroPos));
	saber.body.setAngle(newAngle);

	return true;
}

function scourgeAction(world: w.World, hero: w.Hero, action: w.Action, spell: ScourgeSpell) {
	// Self damage
	const selfDamage = Math.min(spell.selfDamage, Math.max(0, hero.health - spell.minSelfHealth));
	const selfPacket: w.DamagePacket = {
		fromHeroId: hero.id,
		damage: selfDamage,
		lifeSteal: 0,
	};
	applyDamage(hero, selfPacket, world);

	detonateAt(hero.body.getPosition(), hero.id, spell.detonate, world, hero.id, spell.color, spell.sound);

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

	const diff = vector.truncate(vector.diff(action.target, hero.body.getPosition()), spell.maxRange);
	const angle = 0.5 * Math.PI + vector.angle(diff);

	const position = vector.plus(hero.body.getPosition(), diff);
	addWall(world, hero, spell, position, angle, points, Math.max(halfWidth, halfLength));

	return true;
}

function shieldAction(world: w.World, hero: w.Hero, action: w.Action, spell: ReflectSpell) {
	addShield(world, hero, spell);
	return true;
}

function buffAction(world: w.World, hero: w.Hero, action: w.Action, spell: Spell) {
	return ![...hero.buffs.values()].some(b => b.channellingSpellId === spell.id);
}

function instantiateBuff(id: string, template: BuffTemplate, hero: w.Hero, world: w.World, config: BuffContext) {
	const base = {
		initialTick: world.tick,
		expireTick: world.tick + template.maxTicks,
		render: template.render,
		sound: template.sound,
		maxTicks: template.maxTicks,
		hitTick: template.cancelOnHit ? (hero.hitTick || 0) : null,
		channellingSpellId: template.channelling && config.channellingSpellId,
		numStacks: 1,
	};
	if (template.type === "debuff") {
		hero.cleanseTick = world.tick;
	} else if (template.type === "movement") {
		hero.buffs.set(id, {
			...base, id, type: "movement",
			movementProportion: template.movementProportion,
		});
	} else if (template.type === "lavaImmunity") {
		hero.buffs.set(id, {
			...base, id, type: "lavaImmunity",
			damageProportion: template.damageProportion,
		});
	} else if (template.type === "vanish") {
		hero.invisible = {
			...base, id, type: "vanish",
			initialPos: vector.clone(hero.body.getPosition()),
		};
		hero.buffs.set(id, hero.invisible);

		world.ui.events.push({ type: "vanish", tick: world.tick, heroId: hero.id, pos: vector.clone(hero.body.getPosition()), appear: false });
	} else if (template.type === "lifeSteal") {
		hero.buffs.set(id, {
			...base, id, type: "lifeSteal",
			lifeSteal: template.lifeSteal,
			lifeStealTargetId: template.targetOnly ? config.toHeroId : null,
		});
	} else if (template.type === "burn") {
		let stacked = false;
		if (template.stack) {
			// Extend existing stacks
			hero.buffs.forEach(buff => {
				if (buff && buff.type === "burn" && buff.fromHeroId === config.fromHeroId && buff.stack === template.stack) {
					buff.expireTick = base.expireTick;
					buff.packet.damage += template.packet.damage;
					++buff.numStacks;

					stacked = true;
				}
			});
		}

		if (!stacked) {
			hero.buffs.set(id, {
				...base, id, type: "burn",
				fromHeroId: config.fromHeroId,
				hitInterval: template.hitInterval,
				packet: { ...template.packet },
				stack: template.stack,
			});
		}
	} else if (template.type === "cooldown") {
		hero.keysToSpells.forEach(spellId => {
			if (!template.spellId || spellId === template.spellId) {
				const spell = world.settings.Spells[spellId];
				const initialCooldown = cooldownRemaining(world, hero, spell);
				let cooldown = initialCooldown;
				if (template.maxCooldown !== undefined) {
					cooldown = Math.min(template.maxCooldown, cooldown);
				}
				if (template.minCooldown !== undefined) {
					cooldown = Math.max(template.minCooldown, cooldown);
				}
				if (cooldown !== initialCooldown) {
					setCooldown(world, hero, spellId, cooldown);
				}
			}
		});

		world.ui.events.push({
			type: "cooldown",
			tick: world.tick,
			color: template.color,
			sound: template.sound,
			heroId: hero.id,
		});
	} else if (template.type === "armor") {
		let fromHeroId: string = null;
		if (template.ownerOnly) {
			fromHeroId = config.fromHeroId;
		} else if (template.targetOnly) {
			fromHeroId = config.toHeroId;
		}

		hero.buffs.set(id, {
			...base, id, type: "armor",
			proportion: template.proportion,
			fromHeroId,
		});
	}
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

function instantiateDamage(template: DamagePacketTemplate, fromHeroId: string, world: w.World): w.DamagePacket {
	const Hero = world.settings.Hero;

	if (!template) {
		return null;
	}

	let damage = template.damage;
	let lifeSteal = template.lifeSteal;

	const fromHero = world.objects.get(fromHeroId);
	const damageScaling = template.damageScaling !== undefined ? template.damageScaling : true;
	if (damageScaling && fromHeroId) { // Only scale damage from heroes (not the environment), even if they're dead
		let proportion = (fromHero && fromHero.category === "hero") ? (fromHero.health / fromHero.maxHealth) : 0;
		const scaleFactor = 1 + Math.pow(1.0 - proportion, Hero.AdditionalDamagePower) * Hero.AdditionalDamageMultiplier;
		damage *= scaleFactor;
	}

	let lifeStealTargetHeroId: string = null;
	if (fromHero && fromHero.category === "hero") {
		fromHero.buffs.forEach(buff => {
			if (buff.type === "lifeSteal") {
				if (lifeSteal) {
					lifeSteal = Math.max(lifeSteal, buff.lifeSteal);
				} else {
					lifeSteal = buff.lifeSteal;
					lifeStealTargetHeroId = buff.lifeStealTargetId;
				}
			}
		});
	}

	return {
		damage,
		lifeSteal,
		lifeStealTargetHeroId,
		fromHeroId,
		noHit: template.noHit,
	};
}

function applyDamage(toHero: w.Hero, packet: w.DamagePacket, world: w.World) {
	// Need to be careful - fromHeroId may still be set, even if fromHero is null, due to the hero being dead
	if (!(toHero && packet)) { return; }
	const fromHeroId = packet.fromHeroId;

	// Register hit
	if (!packet.noHit) {
		toHero.hitTick = world.tick;
		if (packet.damage > 0) {
			if (packet.isLava) {
				toHero.lavaTick = world.tick;
			} else {
				toHero.damagedTick = world.tick;
			}
		}
	}

	if (world.tick < world.startTick) {
		// No damage until game started
		return;
	}

	// Apply damage
	let amount = Math.max(0, packet.damage);
	amount = applyArmor(fromHeroId, toHero, amount);
	amount = mitigateDamage(toHero, amount, fromHeroId, world);
	amount = Math.min(amount, toHero.health);
	toHero.health -= amount;

	// Apply lifesteal
	if (fromHeroId && packet.lifeSteal && (!packet.lifeStealTargetHeroId || packet.lifeStealTargetHeroId === toHero.id)) {
		const fromHero = world.objects.get(fromHeroId);
		if (fromHero && fromHero.category === "hero") {
			fromHero.health = Math.min(fromHero.maxHealth, fromHero.health + amount * packet.lifeSteal);
			world.ui.events.push({ type: "lifeSteal", tick: world.tick, owner: fromHero.id });
		}
	}

	// Update scores
	if (!world.winner) {
		if (fromHeroId && fromHeroId !== toHero.id) {
			const score = world.scores.get(fromHeroId);
			world.scores = world.scores.set(fromHeroId, { ...score, damage: score.damage + amount });
		}
		if (fromHeroId && toHero.killerHeroId !== fromHeroId && fromHeroId !== toHero.id) {
			toHero.assistHeroId = toHero.killerHeroId || toHero.assistHeroId;
			toHero.killerHeroId = fromHeroId;
		}
	}
}

function applyArmor(fromHeroId: string, hero: w.Hero, damage: number) {
	let totalModifier = 0;
	hero.buffs.forEach(buff => {
		if (buff.type === "armor" && (!buff.fromHeroId || fromHeroId === buff.fromHeroId)) {
			const modifier = damage * buff.proportion;
			totalModifier += modifier;
		}
	});
	return damage + totalModifier;
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
	if (packet.damage > 0) {
		if (packet.isLava) {
			obstacle.lavaTick = world.tick;
		} else {
			obstacle.damagedTick = world.tick;
		}
	}

	if (world.tick < world.startTick) {
		// No damage until game started
		return;
	}
	obstacle.health = Math.max(0, obstacle.health - packet.damage);
}

export function initScore(heroId: string): w.HeroScore {
	return {
		heroId,
		kills: 0,
		assists: 0,
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