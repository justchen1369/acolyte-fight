import _ from 'lodash';
import moment from 'moment';
import pl, { World } from 'planck-js';
import * as Immutable from 'immutable';
import * as colorWheel from './colorWheel';
import * as constants from './constants';
import * as vector from './vector';
import * as w from './world.model';
import { modToSettings } from './modder';

import { Categories, Matchmaking, HeroColors, TicksPerSecond } from './constants';

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
	settings.linearSlop = 0.0005;
	settings.linearSlopSquared = Math.pow(settings.linearSlop, 2.0);
	settings.polygonRadius = (2.0 * settings.linearSlop);
}

export function version() {
	return "1.0.1151";
}

export function initialWorld(mod: Object): w.World {
	const settings = modToSettings(mod);

	let world: w.World = {
		seed: null,
		tick: 0,
		startTick: constants.Matchmaking.MaxHistoryLength,

		occurrences: new Array<w.Occurrence>(),
		activePlayers: Immutable.Set<string>(), // hero IDs
		players: Immutable.Map<string, w.Player>(), // hero ID -> player
		scores: Immutable.Map<string, w.HeroScore>(), // hero ID -> score
		winner: null,

		objects: new Map(),
		behaviours: [],
		physics: pl.World(),
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
			renderedTick: null,
			playedTick: -1,
			destroyed: [],
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
	if (world.tick < world.startTick) {
		body.setMassData({
			mass: 1e6,
			I: 0,
			center: vector.zero(),
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

function addSaber(world: w.World, hero: w.Hero, spell: SaberSpell) {
	const shieldId = "shield" + (world.nextObjectId++);

	const angle = hero.body.getAngle();
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
		width: spell.width,
		length: spell.length,
		speedMultiplier: spell.speedMultiplier,
		maxSpeed: spell.maxSpeed,
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
		revolutionsPerTick: Hero.RevolutionsPerTick,
		casting: null,
		cooldowns: {},
		killerHeroId: null,
		assistHeroId: null,
		keysToSpells: new Map<string, string>(),
		spellsToKeys: new Map<string, string>(),
		shieldIds: new Set<string>(),
		strafeIds: new Set<string>(),
		retractorIds: new Map<string, string>(),
	} as w.Hero;
	world.objects.set(heroId, hero);
	world.scores = world.scores.set(heroId, initScore(heroId));

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

function addProjectile(world: w.World, hero: w.Hero, target: pl.Vec2, spell: Spell, projectileTemplate: ProjectileTemplate) {
	const NeverTicks = 1e6;

	let id = spell.id + (world.nextObjectId++);

	const from = hero.body.getPosition();
	let direction = vector.unit(vector.diff(target, from));
	if (direction.x === 0 && direction.y === 0) {
		direction = vector.fromAngle(hero.body.getAngle());
	}

	const offset = Math.max(0, world.settings.Hero.Radius - projectileTemplate.radius); // Larger projectiles spawn more inside the hero to ensure they still work at point blank range
	const position = vector.plus(hero.body.getPosition(), vector.multiply(direction, offset));
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
		restitution: 1.0,
	} as pl.FixtureDef);

	let targetObj = findNearest(world.objects, target, x => x.category === "hero" && x.id !== hero.id);
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
		alreadyHit: new Set<string>(),

		damage: projectileTemplate.damage,
		partialDamage: projectileTemplate.partialDamage,
		bounce: projectileTemplate.bounce,
		gravity: projectileTemplate.gravity,
		link: projectileTemplate.link,
		detonate: projectileTemplate.detonate ? { ...projectileTemplate.detonate } : null, // Have to clone, because scaleDamagePacket mutates
		lifeSteal: projectileTemplate.lifeSteal || 0.0,
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
		detonatable: projectileTemplate.detonatable,

		sound: projectileTemplate.sound,
		soundHit: projectileTemplate.soundHit,

		renderers: projectileTemplate.renderers,
		radius: projectileTemplate.radius,

		uiPath: [vector.clone(position)],
	} as w.Projectile;

	scaleDamagePacket(projectile, hero, projectileTemplate.damageScaling);
	scaleDamagePacket(projectile.detonate, hero, projectileTemplate.damageScaling);

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
		reflectFollow,
		saberSwing,
		thrustBounce,
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
		removePassthrough,
		thrustDecay,
	});

	applyLavaDamage(world);
	shrink(world);

	reap(world);
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
	world.physics.step(1.0 / TicksPerSecond);
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
		}
	});
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

function projectileClearedHero(projectile: w.Projectile, hero: w.Hero) {
	const distance = vector.distance(hero.body.getPosition(), projectile.body.getPosition());
	return distance > hero.radius + projectile.radius + hero.moveSpeedPerSecond / TicksPerSecond;
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
		world.radius = World.InitialRadius * radiusMultiplier;
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
	world.startTick = ev.startTick;

	world.objects.forEach(obstacle => { // Obstacles movable now
		if (obstacle.category === "obstacle") {
			obstacle.body.resetMassData();
		}
	});

	if (world.tick >= world.startTick) {
		// Close any customising dialogs as they cannot be used anymore now the game has started
		world.ui.customizingBtn = null;
	}

	world.ui.notifications.push({
		type: "closing",
		ticksUntilClose: ev.ticksUntilClose,
	});
}

function handleBotting(ev: w.Botting, world: w.World) {
	console.log("Bot joined:", ev.heroId);

	let hero = world.objects.get(ev.heroId);
	if (!hero) {
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
		hero = addHero(world, ev.heroId);
	} else if (hero.category !== "hero") {
		throw "Player tried to join as non-hero: " + ev.heroId;
	}

	assignKeyBindingsToHero(hero, ev.keyBindings, world);

	const player: w.Player = {
		heroId: hero.id,
		userId: ev.userId,
		userHash: ev.userHash,
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

		if (!hero.casting || hero.casting.movementProportion > 0) {
			moveTowards(world, hero, hero.moveTo, (hero.casting && hero.casting.movementProportion) || 1.0);
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

		const validOptions = Choices.Options[key];
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
	const uninterruptible = !spell.interruptible;

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
	switch (spell.action) {
		case "stop": return true; // Do nothing
		case "projectile": return spawnProjectileAction(world, hero, action, spell);
		case "spray": return sprayProjectileAction(world, hero, action, spell);
		case "retractor": return retractorAction(world, hero, action, spell);
		case "saber": return saberAction(world, hero, action, spell);
		case "scourge": return scourgeAction(world, hero, action, spell);
		case "teleport": return teleportAction(world, hero, action, spell);
		case "thrust": return thrustAction(world, hero, action, spell);
		case "wall": return wallAction(world, hero, action, spell);
		case "shield": return shieldAction(world, hero, action, spell);
		default: return true;
	}
}

function handleContact(world: w.World, contact: pl.Contact) {
	if (!contact.isTouching()) {
		return;
	}

	let objA = world.objects.get(contact.getFixtureA().getBody().getUserData());
	let objB = world.objects.get(contact.getFixtureB().getBody().getUserData());
	const collisionPoint = vector.average(contact.getWorldManifold().points);
	if (objA && objB) {
		handleCollision(world, objA, objB, collisionPoint);
		handleCollision(world, objB, objA, collisionPoint);
	}
}

function handleCollision(world: w.World, object: w.WorldObject, hit: w.WorldObject, collisionPoint: pl.Vec2) {
	if (object.category === "projectile") {
		object.uiPath.push(collisionPoint);

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
			applyDamage(other, hero.thrust, hero.id, world);
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
		applyDamageToObstacle(obstacle, hero.thrust, world);
		hero.thrust.nullified = true;
	}
}

function handleProjectileHitObstacle(world: w.World, projectile: w.Projectile, obstacle: w.Obstacle) {
	if (!projectile.alreadyHit.has(obstacle.id)) {
		projectile.alreadyHit.add(obstacle.id);
		applyDamageToObstacle(obstacle, projectile, world);
	}

	if (expireOn(world, projectile, obstacle)) {
		detonateProjectile(projectile, world);
		applySwap(projectile, obstacle, world);
		destroyObject(world, projectile);
	}
}

function handleProjectileHitProjectile(world: w.World, projectile: w.Projectile, other: w.Projectile) {
	if (expireOn(world, projectile, other)) {
		detonateProjectile(projectile, world);
		applySwap(projectile, other, world);
		destroyObject(world, projectile);
	}
}

function handleProjectileHitShield(world: w.World, projectile: w.Projectile, shield: w.Shield) {
	const myProjectile = shield.owner === projectile.owner;

	if (projectile.owner !== shield.owner) {
		shield.hitTick = world.tick;
	}

	if (!myProjectile && projectile.shieldTakesOwnership && shield.takesOwnership) { // Stop double redirections cancelling out
		// Redirect back to owner
		projectile.targetId = projectile.owner;
		projectile.owner = shield.owner;
	}

	if (!myProjectile && expireOn(world, projectile, shield)) { // Every projectile is going to hit its owner's shield on the way out
		detonateProjectile(projectile, world);
		applySwap(projectile, shield, world);
		destroyObject(world, projectile);
	}
}

function handleProjectileHitHero(world: w.World, projectile: w.Projectile, hero: w.Hero) {
	if ((projectile.collideWith & Categories.Shield) && isHeroShielded(hero, world)) {
		return;
	}

	if (hero.id !== projectile.owner && !projectile.alreadyHit.has(hero.id)) {
		projectile.alreadyHit.add(hero.id);

		const packet: DamagePacket = scaleForPartialDamage(world, projectile, {
			damage: projectile.damage,
			lifeSteal: projectile.lifeSteal,
		});
		applyDamage(hero, packet, projectile.owner, world);
		linkTo(projectile, hero, world);
		applySwap(projectile, hero, world);
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

export function calculatePartialDamageMultiplier(world: w.World, projectile: w.Projectile): number {
	const partialDamage = projectile.partialDamage;
	const lifetime = world.tick - projectile.createTick;
	if (partialDamage && lifetime < partialDamage.ticks) {
		return partialDamage.initialMultiplier + (1 - partialDamage.initialMultiplier) * (lifetime / partialDamage.ticks);
	} else {
		return 1;
	}
}

function scaleForPartialDamage(world: w.World, projectile: w.Projectile, packet: DamagePacket): DamagePacket {
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

function expireOn(world: w.World, projectile: w.Projectile, other: w.WorldObject) {
	return (projectile.expireOn & other.categories) && (world.tick >= projectile.createTick + projectile.minTicks);
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
		expireTick: world.tick + projectile.gravity.ticks,
		location: vector.clone(projectile.body.getPosition()),
		strength: projectile.gravity.impulsePerTick,
		radius: projectile.gravity.radius,
		power: projectile.gravity.power,
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
			sound: projectile.sound,
			fromPos: ownerPos,
			toPos: targetPos,
			heroId: owner.id,
		});

		if (target.category === "hero") {
			world.ui.events.push({
				type: "teleport",
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
	applySwap(projectile, null, world);
}

function linkTo(projectile: w.Projectile, target: w.WorldObject, world: w.World) {
	if (!projectile.link) {
		return;
	}
	projectile.expireTick = world.tick;

	const owner = world.objects.get(projectile.owner);
	if (!(target && owner && owner.category === "hero")) {
		return;
	}

	owner.link = {
		targetId: target.id,
		minDistance: projectile.link.minDistance,
		maxDistance: projectile.link.maxDistance,
		strength: projectile.link.impulsePerTick,
		lifeSteal: projectile.link.lifeSteal,
		expireTick: world.tick + projectile.link.linkTicks,
	};
	world.behaviours.push({ type: "linkForce", heroId: owner.id });
}

function bounceToNext(projectile: w.Projectile, hitId: string, world: w.World) {
	if (!projectile.bounce) {
		return;
	}

	// Always bounce between owner and another target
	let nextTarget: w.WorldObject =
		projectile.targetId === projectile.owner
		? findNearest(
			world.objects,
			projectile.body.getPosition(),
			x => x.category === "hero" && x.id !== hitId)
		: world.objects.get(projectile.owner);
	if (!nextTarget) {
		return;
	}

	projectile.targetId = nextTarget.id;
	projectile.damage *= projectile.bounce.damageFactor || 1.0;

	let currentSpeed = vector.length(projectile.body.getLinearVelocity());
	let newDirection = vector.unit(vector.diff(nextTarget.body.getPosition(), projectile.body.getPosition()));
	let newVelocity = vector.multiply(newDirection, currentSpeed);
	projectile.body.setLinearVelocity(newVelocity);

	projectile.alreadyHit.delete(nextTarget.id);
}

function gravityForce(behaviour: w.GravityBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero" && hero.gravity)) {
		return false;
	}
	if (world.tick >= hero.gravity.expireTick) {
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

function findHomingTarget(targetType: HomingType, projectile: w.Projectile, world: w.World) {
	let target: pl.Vec2 = null;
	if (targetType === w.HomingTargets.self) {
		const targetObj = world.objects.get(projectile.owner);
		if (targetObj) {
			target = targetObj.body.getPosition();
		}
	} else if (targetType === w.HomingTargets.enemy) {
		const targetObj = world.objects.get(projectile.targetId);
		if (targetObj) {
			target = targetObj.body.getPosition();
		}
	} else if (targetType === w.HomingTargets.cursor) {
		target = projectile.target;
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

	const minDistance = owner.link.minDistance;
	const maxDistance = owner.link.maxDistance;

	const diff = vector.diff(target.body.getPosition(), owner.body.getPosition());
	const distance = vector.length(diff);
	const strength = owner.link.strength * Math.max(0, distance - minDistance) / (maxDistance - minDistance);
	if (strength <= 0) {
		return true;
	}

	owner.body.applyLinearImpulse(
		vector.relengthen(diff, strength * owner.body.getMass()),
		owner.body.getWorldPoint(vector.zero()), true);

	if (target.category === "hero") {
		target.body.applyLinearImpulse(
			vector.relengthen(vector.negate(diff), strength * target.body.getMass()),
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

function thrustBounce(behaviour: w.ThrustBounceBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero")) {
		return false;
	}

	if (hero.thrust) {
		updateMaskBits(hero.body.getFixtureList(), Categories.All);
		return true;
	} else {
		updateMaskBits(hero.body.getFixtureList(), Categories.All ^ Categories.Shield);
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

function thrustDecay(behaviour: w.ThrustDecayBehaviour, world: w.World) {
	const hero = world.objects.get(behaviour.heroId);
	if (!(hero && hero.category === "hero" && hero.thrust)) {
		return false;
	}

	--hero.thrust.ticks;
	if (hero.thrust.ticks <= 0) {
		hero.body.setLinearVelocity(vector.zero());
		hero.thrust = null;
		return false;
	} else {
		return true;
	}
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
	const detonate = {
		...projectile.detonate,
		damage: projectile.detonate.damage * damageMultiplier,
		outerDamage: (projectile.detonate.outerDamage !== undefined ? projectile.detonate.outerDamage : projectile.detonate.damage) * damageMultiplier,
	};
	detonateAt(projectile.body.getPosition(), projectile.owner, detonate, world, projectile.id, projectile.sound);

	// Don't allow for repeats
	projectile.detonate = null;
}

function detonateAt(epicenter: pl.Vec2, owner: string, detonate: DetonateParameters, world: w.World, sourceId: string, sound: string = null) {
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
			const magnitude = detonate.minImpulse + proportion * (detonate.maxImpulse - detonate.minImpulse);
			other.body.applyLinearImpulse(
				vector.relengthen(diff, magnitude),
				other.body.getWorldPoint(vector.zero()),
				true);

			const innerDamage = detonate.damage;
			const outerDamage = detonate.outerDamage !== undefined ? detonate.outerDamage : detonate.damage;
			const packet: DamagePacket = {
				damage: proportion * innerDamage + (1 - proportion) * outerDamage,
				lifeSteal: detonate.lifeSteal,
			};
			if (other.category === "hero") {
				applyDamage(other, packet, owner, world);
			} else {
				applyDamageToObstacle(other, packet, world);
			}
		} else if (other.category === "projectile") {
			if (other.detonatable) {
				other.expireTick = world.tick;
			}
		}
	});

	world.ui.events.push({
		type: "detonate",
		sourceId,
		sound: sound,
		pos: vector.clone(epicenter),
		radius: detonate.radius,
		explosionTicks: detonate.renderTicks,
	});
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
	const damagePacket: DamagePacket = { damage: lavaDamagePerTick, isLava: true };
	world.objects.forEach(obj => {
		if (obj.category === "hero") {
			if (!isInsideMap(obj, world)) {
				applyDamage(obj, damagePacket, null, world);
			}
		} else if (obj.category === "obstacle") {
			if (!isInsideMap(obj, world)) {
				applyDamageToObstacle(obj, damagePacket, world);
			}
		}
	});
}

function isInsideMap(obj: w.WorldObject, world: w.World) {
	if (world.radius <= 0) {
		return false;
	}

	const mapCenter = pl.Vec2(0.5, 0.5);
	const diff = vector.diff(obj.body.getPosition(), mapCenter);
	const extent = getExtent(obj);

	if (world.mapPoints) {
		const scaledDiff = vector.multiply(diff, 1 / world.radius);
		const scaledExtent = extent / world.radius;
		for (let i = 0; i < world.mapPoints.length; ++i) {
			const a = world.mapPoints[i];
			const b = world.mapPoints[(i + 1) % world.mapPoints.length];
			if (!vector.insideLine(scaledDiff, scaledExtent, a, b)) {
				return false;
			}
		}
		return true;
	} else {
		return vector.length(diff) < world.radius + extent;
	}

	return true;
}

function shrink(world: w.World) {
	const World = world.settings.World;
	if (world.tick >= world.startTick && !world.winner) {
		const seconds = (world.tick - world.startTick) / TicksPerSecond;
		const proportion = Math.max(0, 1.0 - seconds / World.SecondsToShrink);
		world.radius = World.InitialRadius * world.mapRadiusMultiplier * Math.pow(proportion, World.ShrinkPower);
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

function notifyWin(world: w.World) {
	if (world.winner) {
		return;
	}

	let numAlive = 0;
	world.objects.forEach(hero => {
		if (hero.category === "hero") {
			++numAlive;
		}
	});
	if (numAlive > 1) {
		return;
	}

	const scores = world.scores.valueSeq().toArray();
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

	world.winner = bestScore.heroId;
	world.winTick = world.tick;
	world.ui.notifications.push({
		type: "win",
		myHeroId: world.ui.myHeroId,
		winner: world.players.get(bestScore.heroId),
		mostDamage: world.players.get(mostDamage.heroId),
		mostDamageAmount: mostDamage.damage,
		mostKills: world.players.get(mostKills.heroId),
		mostKillsCount: mostKills.kills,
	});
}

function notifyKill(hero: w.Hero, world: w.World) {
	const killed = world.players.get(hero.id);
	if (!killed) {
		return;
	}

	const myHeroId = world.ui.myHeroId;

	const killer = hero.killerHeroId && world.players.get(hero.killerHeroId) || null;
	const assist = hero.assistHeroId && world.players.get(hero.assistHeroId) || null;
	world.ui.notifications.push({ type: "kill", myHeroId, killed, killer, assist });

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

	object.destroyed = true;
	world.ui.destroyed.push(object);
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

		let target = action.target;
		if (spell.revsPerTickWhileChannelling > 0) {
			target = vector.plus(pos, vector.fromAngle(hero.body.getAngle()));
		}

		const diff = vector.diff(target, pos);
		const currentAngle = vector.angle(diff);

		const projectileIndex = Math.floor(currentLength / spell.intervalTicks);
		const numProjectiles = spell.lengthTicks / spell.intervalTicks;
		const newAngle = currentAngle + 2 * Math.PI * projectileIndex / numProjectiles;

		const jitterRadius = vector.length(diff) * spell.jitterRatio;
		const newTarget = vector.plus(target, vector.multiply(vector.fromAngle(newAngle), jitterRadius));

		addProjectile(world, hero, newTarget, spell, spell.projectile);
	}
	return false;
}

function retractorAction(world: w.World, hero: w.Hero, action: w.Action, spell: RetractorSpell) {
	if (!action.target) { return true; }

	const retractorId = hero.retractorIds.get(spell.id);
	if (retractorId) {
		const retractor = world.objects.get(retractorId);
		if (retractor && retractor.category === "projectile") {
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

function teleportAction(world: w.World, hero: w.Hero, action: w.Action, spell: TeleportSpell) {
	const Hero = world.settings.Hero;
	if (!action.target) { return true; }

	const availableRange = spell.range;
	const rangeLimit = Math.min(
		availableRange,
		shieldCollisionLimit(hero, action.target, world));

	const currentPosition = hero.body.getPosition();
	const newPosition = vector.towards(currentPosition, action.target, rangeLimit);

	hero.body.setPosition(newPosition);
	hero.moveTo = action.target;

	world.ui.events.push({
		type: "teleport",
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

function shouldCollideWithCategory(a: w.WorldObject, categories: number) {
	return a && !!(a.body.getFixtureList().getFilterMaskBits() & categories);
}

function thrustAction(world: w.World, hero: w.Hero, action: w.Action, spell: ThrustSpell) {
	const Hero = world.settings.Hero;
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

		let thrust: w.ThrustState = {
			damage: spell.damage,
			velocity,
			ticks,
			nullified: false,
			alreadyHit: new Set<string>(),
		} as w.ThrustState;
		scaleDamagePacket(thrust, hero, spell.damageScaling);

		hero.thrust = thrust;
		hero.moveTo = action.target;

		world.behaviours.push({ type: "thrustBounce", heroId: hero.id });
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

function saberAction(world: w.World, hero: w.Hero, action: w.Action, spell: SaberSpell) {
	const saberTick = world.tick - hero.casting.channellingStartTick;
	if (saberTick === 0) {
		const saber = addSaber(world, hero, spell);
		world.behaviours.push({ type: "saberSwing", shieldId: saber.id });
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
	const newAngle = vector.angle(vector.diff(hero.target, heroPos));
	if (previousAngle === newAngle) {
		return true; // Nothing to do
	}

	const saberAngleDelta = vector.angleDelta(previousAngle, newAngle);

	const antiClockwise = saberAngleDelta >= 0;
	const previousTip = vector.multiply(vector.fromAngle(previousAngle), saber.length);
	const newTip = vector.multiply(vector.fromAngle(newAngle), saber.length);

	const swingVelocity = vector.truncate(vector.multiply(vector.diff(newTip, previousTip), TicksPerSecond * saber.speedMultiplier), saber.maxSpeed);
	const swingSpeed = vector.length(swingVelocity);

	let hit = false
	world.objects.forEach(obj => {
		if (obj.id === hero.id || !(shouldCollide(saber, obj) || obj.category === "hero" || (obj.category === "projectile" && obj.detonatable))) {
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

		const currentSpeed = vector.length(obj.body.getLinearVelocity());
		if (currentSpeed < swingSpeed) {
			obj.body.setLinearVelocity(swingVelocity);
		}

		if (obj.category === "projectile") {
			if (saber.takesOwnership && obj.owner !== hero.id && obj.shieldTakesOwnership) {
				// Redirect back to owner
				obj.targetId = obj.owner;
				obj.owner = hero.id;
			}

			if (obj.detonatable) {
				obj.expireTick = world.tick;
			}
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
	const selfPacket: DamagePacket = { damage: Math.max(0, Math.min(hero.health - spell.minSelfHealth, spell.selfDamage)) };
	applyDamage(hero, selfPacket, hero.id, world);

	const detonate: DetonateParameters = {
		...spell.detonate,
	};
	scaleDamagePacket(detonate, hero, spell.damageScaling)

	detonateAt(hero.body.getPosition(), hero.id, detonate, world, hero.id, spell.sound);

	// Remove the link so that the hit player can go flying
	hero.link = null;

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
	addWall(world, hero, spell, position, angle, points, Math.min(halfWidth, halfLength));

	return true;
}

function shieldAction(world: w.World, hero: w.Hero, action: w.Action, spell: ReflectSpell) {
	addShield(world, hero, spell);
	return true;
}

function scaleDamagePacket(packet: DamagePacket, fromHero: w.Hero, damageScaling: boolean = true) {
	if (!packet) {
		return;
	}

	let scaleFactor = 1.0;
	if (fromHero && damageScaling) {
		const fromHeroHealth = fromHero ? fromHero.health : 0; // Dead hero has 0 health
		scaleFactor += Math.pow(1.0 - fromHeroHealth / fromHero.maxHealth, fromHero.additionalDamagePower) * fromHero.additionalDamageMultiplier;
	}
	packet.damage *= scaleFactor;

	if (fromHero && fromHero.link && !packet.lifeSteal) {
		packet.lifeSteal = fromHero.link.lifeSteal;
	}
}

function applyDamage(toHero: w.Hero, packet: DamagePacket, fromHeroId: string, world: w.World) {
	// Need to be careful - fromHeroId may still be set, even if fromHero is null, due to the hero being dead
	if (!toHero) { return; }

	// Register hit
	if (packet.damage > 0) {
		if (packet.isLava) {
			toHero.lavaTick = world.tick;
		} else {
			toHero.damagedTick = world.tick;
		}
	}

	if (world.tick < world.startTick) {
		// No damage until game started
		return;
	}

	// Apply damage
	let amount = Math.max(0, packet.damage);
	amount = mitigateDamage(toHero, amount, fromHeroId, world);
	amount = Math.min(amount, toHero.health);
	toHero.health -= amount;

	// Apply lifesteal
	if (fromHeroId && packet.lifeSteal) {
		const fromHero = world.objects.get(fromHeroId);
		if (fromHero && fromHero.category === "hero") {
			fromHero.health = Math.min(fromHero.maxHealth, fromHero.health + amount * packet.lifeSteal);
			world.ui.events.push({ type: "lifeSteal", owner: fromHero.id });
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

function applyDamageToObstacle(obstacle: w.Obstacle, packet: DamagePacket, world: w.World) {
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