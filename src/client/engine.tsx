import * as _ from 'lodash';
import pl from 'planck-js';
import * as constants from '../game/constants';
import * as c from '../game/constants.model';
import * as vector from './vector';
import * as w from './world.model';

import { Hero, World, Spells, Categories, Choices, Matchmaking, TicksPerSecond } from '../game/constants';

// Planck.js considers collisions to be inelastic if below this threshold.
// We want all thresholds to be elastic.
(pl as any).internal.Settings.velocityThreshold = 0;

export function initialWorld(): w.World {
	let world = {
		tick: 0,

		joinLeaveEvents: new Array<w.JoinOrLeaveEvent>(),
		activePlayers: new Set<string>(),
		players: new Map<string, w.Player>(),

		objects: new Map(),
		physics: pl.World(),
		actions: new Map(),
		radius: 0.4,

		destroyed: [],

		nextPositionId: 0,
		nextBulletId: 0,
		nextColorId: 0,

		ui: {
			myGameId: null,
			myHeroId: null,
			trails: [],
			notifications: [],
		} as w.UIState,
	} as w.World;
	return world;
}

export function takeNotifications(world: w.World): w.Notification[] {
	const notifications = world.ui.notifications;
	if (notifications.length > 0) {
		world.ui.notifications = [];
	}
	return notifications;
}

function addHero(world: w.World, heroId: string, playerName: string) {
	let position;
	let angle;
	{
		const radius = 0.25;
		const center = pl.Vec2(0.5, 0.5);

		const nextHeroIndex = world.nextPositionId++;

		let posAngle = 2 * Math.PI * nextHeroIndex / Matchmaking.MaxPlayers;
		position = vector.plus(vector.multiply(vector.fromAngle(posAngle), radius), center);

		angle = posAngle + Math.PI; // Face inward
	}

	let body = world.physics.createBody({
		userData: heroId,
		type: 'dynamic',
		position,
		angle,
		linearDamping: Hero.MaxDamping,
		angularDamping: Hero.AngularDamping,
		allowSleep: false,
		bullet: true,
	} as pl.BodyDef);
	body.createFixture(pl.Circle(Hero.Radius), {
		filterCategoryBits: Categories.Hero,
		filterMaskBits: Categories.All,
		density: Hero.Density,
		restitution: 1.0,
	});

	let hero = {
		id: heroId,
		name: playerName,
		category: "hero",
		type: "hero",
		health: Hero.MaxHealth,
		body,
		casting: null,
		cooldowns: {},
		shieldTicks: 0,
		hitTick: 0,
		killerHeroId: null,
		assistHeroId: null,
		keysToSpells: new Map<string, string>(),
		spellsToKeys: new Map<string, string>(),
	} as w.Hero;
	world.objects.set(heroId, hero);

	return hero;
}

export function cooldownRemaining(world: w.World, hero: w.Hero, spell: string) {
	let next = hero.cooldowns[spell] || 0;
	return Math.max(0, next - world.tick);
}

function setCooldown(world: w.World, hero: w.Hero, spell: string, waitTime: number) {
	hero.cooldowns[spell] = world.tick + waitTime;
}

function addProjectile(world : w.World, hero : w.Hero, target: pl.Vec2, spell: c.Spell, projectileTemplate: c.ProjectileTemplate) {
	let id = spell.id + (world.nextBulletId++);

	let from = hero.body.getPosition();
	let position = vector.towards(from, target, Hero.Radius + projectileTemplate.radius + constants.Pixel);
	let velocity = vector.direction(target, from, projectileTemplate.speed);

	let body = world.physics.createBody({
		userData: id,
		type: 'dynamic',
		position,
		linearVelocity: velocity,
		linearDamping: 0,
		bullet: true,
	});
	body.createFixture(pl.Circle(projectileTemplate.radius), {
		filterCategoryBits: Categories.Projectile,
		filterMaskBits: projectileTemplate.collideWith !== undefined ? projectileTemplate.collideWith : Categories.All,
		density: projectileTemplate.density,
		restitution: 1.0,
	} as pl.FixtureDef);

	let targetObj = findNearest(world.objects, target, x => x.type === "hero" && x.id !== hero.id);

	let projectile = {
		id,
		owner: hero.id,
		category: "projectile",
		type: spell.id,
		body,

		targetId: targetObj ? targetObj.id : null,
		damage: projectileTemplate.damage,
		bounce: projectileTemplate.bounce,

		homing: projectileTemplate.homing && {
			turnRate: projectileTemplate.homing.turnRate,
			minDistanceToTarget: projectileTemplate.homing.minDistanceToTarget || 0,
			targetSelf: projectileTemplate.homing.targetSelf || false,
		} as w.HomingParameters,
		link: projectileTemplate.link && {
			strength: projectileTemplate.link.strength,
			linkTicks: projectileTemplate.link.linkTicks,
			heroId: null,
		} as w.LinkParameters,
		shieldTakesOwnership: projectileTemplate.shieldTakesOwnership !== undefined ? projectileTemplate.shieldTakesOwnership : true,

		expireTick: world.tick + projectileTemplate.maxTicks,
		maxTicks: projectileTemplate.maxTicks,
		explodeOn: projectileTemplate.explodeOn,

		render: projectileTemplate.render,
		color: projectileTemplate.color,
		selfColor: projectileTemplate.selfColor,
		glowPixels: projectileTemplate.glowPixels,
		radius: projectileTemplate.radius,
		trailTicks: projectileTemplate.trailTicks,

		uiPreviousPos: vector.clone(position),
	} as w.Projectile;
	world.objects.set(id, projectile);

	return projectile;
}

// Simulator
export function tick(world: w.World) {
	++world.tick;
	world.destroyed = [];

	handlePlayerJoinLeave(world);

	let newActions = new Map();
	world.objects.forEach(hero => {
		if (hero.category !== "hero") { return; }
		let action = world.actions.get(hero.id);
		let completed = performHeroActions(world, hero, action);
		if (action && !completed) {
			newActions.set(hero.id, action);
		}
	});
	world.actions = newActions;

	physicsStep(world);
	for (var contact = world.physics.getContactList(); !!contact; contact = contact.getNext()) {
		handleContact(world, contact);
	}

	homingForce(world);
	linkForce(world);
	decayShields(world);
	applyLavaDamage(world);
	shrink(world);
	updateKnockback(world);

	reap(world);
}

function physicsStep(world: w.World) {
	world.objects.forEach(obj => {
		if (obj.step) {
			obj.body.setPosition(vector.plus(obj.body.getPosition(), obj.step));
			obj.step = null;
		}
	});

	world.physics.step(1.0 / TicksPerSecond);
}

function handlePlayerJoinLeave(world: w.World) {
	world.joinLeaveEvents.forEach(ev => {
		if (ev.type === "join") {
			console.log("Player joined:", ev.heroId);
			let hero = find(world.objects, x => x.id === ev.heroId);
			if (!hero) {
				hero = addHero(world, ev.heroId, ev.playerName);
			} else if (hero.category !== "hero") {
				throw "Player tried to join as non-hero: " + ev.heroId;
			}

			assignKeyBindingsToHero(hero, ev.keyBindings);

			const player = {
				heroId: hero.id,
				name: ev.playerName,
				color: Hero.Colors[world.nextColorId++ % Hero.Colors.length],
			} as w.Player;
			world.players.set(hero.id, player);
			world.activePlayers.add(hero.id);

			world.ui.notifications.push({ type: "join", player });
		} else if (ev.type === "leave") {
			console.log("Player left:", ev.heroId);
			const player = world.players.get(ev.heroId);
			world.activePlayers.delete(ev.heroId);

			if (player) {
				world.ui.notifications.push({ type: "leave", player });
			}
		}
	});
	world.joinLeaveEvents = [];
}

function assignKeyBindingsToHero(hero: w.Hero, keyBindings: c.KeyBindings) {
	let keysToSpells = new Map<string, string>();
	let spellsToKeys = new Map<string, string>();
	for (var key in keyBindings) {
		let spellId = keyBindings[key];

		const validOptions = Choices.Options[key];
		if (!(validOptions.indexOf(spellId) >= 0)) {
			spellId = Choices.Defaults[key];
		}

		keysToSpells.set(key, spellId);
		spellsToKeys.set(spellId, key);
	}
	hero.keysToSpells = keysToSpells;
	hero.spellsToKeys = spellsToKeys;
}

function performHeroActions(world: w.World, hero: w.Hero, nextAction: w.Action) {
	let action = nextAction;
	if (hero.casting && hero.casting.uninterruptible) {
		action = hero.casting.action;
	}
	if (!action || !isValidAction(action, hero)) {
		return true; // Nothing to do
	}
	const spell = constants.Spells.all[action.type];

	// Start casting a new spell
	if (!hero.casting || action !== hero.casting.action) {
		hero.casting = { action: action, color: spell.color, stage: w.CastStage.Cooldown };
	}

	if (hero.casting.stage === w.CastStage.Cooldown) {
		if (spell.cooldown && cooldownRemaining(world, hero, spell.id) > 0) {
			return false; // Cannot perform action, waiting for cooldown
		}
		++hero.casting.stage;
	}

	if (hero.casting.stage === w.CastStage.Orientating) {
		const orientationRequired = spell.orientationRequired !== undefined ? spell.orientationRequired : true;
		if (orientationRequired) {
			const targetAngle = vector.angle(vector.diff(action.target, hero.body.getPosition()));
			const currentAngle = hero.body.getAngle();

			let angleDiff = targetAngle - currentAngle;
			if (angleDiff > Math.PI) {
				angleDiff -= 2 * Math.PI;
			}
			if (angleDiff < -Math.PI) {
				angleDiff += 2 * Math.PI;
			}

			if (Math.abs(angleDiff) > Hero.MaxAttackAngleDiff) {
				const turnDiff = Math.min(Math.abs(angleDiff), Hero.TurnRate) * Math.sign(angleDiff);
				const newAngle = currentAngle + turnDiff;
				hero.body.setAngle(newAngle);
				return false;
			}
		}
		++hero.casting.stage;
	}

	if (hero.casting.stage === w.CastStage.Charging) {
		// Entering charging stage
		if (!hero.casting.chargeStartTick) {
			hero.casting.chargeStartTick = world.tick;
			hero.casting.uninterruptible = spell.chargingUninterruptible !== undefined ? spell.chargingUninterruptible : true;
		}
		
		// Waiting for charging to complete
		const ticksCharging = world.tick - hero.casting.chargeStartTick;
		if (spell.chargeTicks && ticksCharging < spell.chargeTicks) {
			hero.casting.proportion = 1.0 * ticksCharging / spell.chargeTicks;
			return false;
		}

		// Exiting charging stage
		hero.casting.uninterruptible = false;
		hero.casting.proportion = null;
		++hero.casting.stage;
	}

	let done = false;
	if (hero.casting.stage === w.CastStage.Channelling) {
		// Start channelling
		if (!hero.casting.channellingStartTick) {
			hero.casting.channellingStartTick = world.tick;
			hero.casting.uninterruptible = spell.channellingUninterruptible || false;

			if (spell.cooldown) {
				setCooldown(world, hero, spell.id, spell.cooldown);
			}
		}

		const cancelled = spell.knockbackCancel && hero.hitTick > hero.casting.channellingStartTick;
		if (!cancelled) {
			done = applyAction(world, hero, action, spell);
		} else {
			done = true;
		}

		if (done) {
			hero.casting.uninterruptible = false;
			++hero.casting.stage;
		}
	}

	if (hero.casting.stage === w.CastStage.Complete) {
		hero.casting = null;
	}

	// Only mark nextAction as completed if we actually did it and not the uninterruptible action
	return action === nextAction && done;
}

function isValidAction(action: w.Action, hero: w.Hero) {
	if (action.type === "move") {
		return true;
	} else {
		return hero.spellsToKeys.has(action.type);
	}
}

function applyAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.Spell): boolean {
	switch (spell.action) {
		case "move": return moveAction(world, hero, action, spell);
		case "projectile": return spawnProjectileAction(world, hero, action, spell);
		case "spray": return sprayProjectileAction(world, hero, action, spell);
		case "scourge": return scourgeAction(world, hero, action, spell);
		case "teleport": return teleportAction(world, hero, action, spell);
		case "thrust": return thrustAction(world, hero, action, spell);
		case "shield": return shieldAction(world, hero, action, spell);
	}
}

function handleContact(world: w.World, contact: pl.Contact) {
	if (!contact.isTouching()) {
		return;
	}

	let objA = world.objects.get(contact.getFixtureA().getBody().getUserData());
	let objB = world.objects.get(contact.getFixtureB().getBody().getUserData());
	if (objA && objB) {
		handleCollision(world, objA, objB);
		handleCollision(world, objB, objA);
	}
}

function handleCollision(world: w.World, object: w.WorldObject, hit: w.WorldObject) {
	if (object.category === "projectile") {
		if (hit.category === "hero") {
			handleProjectileHitHero(world, object, hit);
		} else if (hit.category === "projectile") {
			handleProjectileHitProjectile(world, object, hit);
		}
	} else if (object.category === "hero") {
		if (hit.category === "hero") {
			handleHeroHitHero(world, object, hit);
		}
	}
}

function handleHeroHitHero(world: w.World, hero: w.Hero, other: w.Hero) {
	// Push back other heroes
	const pushbackDirection = vector.unit(vector.diff(hero.body.getPosition(), other.body.getPosition()));
	const repelDistance = Hero.Radius * 2 - vector.distance(hero.body.getPosition(), other.body.getPosition());
	if (repelDistance > 0) {
		const step = vector.multiply(pushbackDirection, repelDistance);
		const impulse = vector.multiply(step, Hero.SeparationStrength);
		hero.body.applyLinearImpulse(impulse, hero.body.getWorldPoint(vector.zero()), true);
	}

	// Mark other hero as hit - cancel any channelling
	other.hitTick = world.tick;

	// If using thrust, cause damage
	if (hero.casting && hero.casting.action && hero.casting.action.type === Spells.thrust.id) {
		applyDamage(other, Spells.thrust.damage, hero.id);
	}
}

function handleProjectileHitProjectile(world: w.World, projectile: w.Projectile, other: w.Projectile) {
	if (projectile.explodeOn & categoryFlags(other)) {
		destroyObject(world, projectile);
	}
}

function handleProjectileHitHero(world: w.World, projectile: w.Projectile, hero: w.Hero) {
	if (hero.shieldTicks > 0) {
		if (projectile.shieldTakesOwnership && projectile.owner !== hero.id) { // Stop double redirections cancelling out
			// Redirect back to owner
			projectile.targetId = projectile.owner;
			projectile.owner = hero.id;
		}

		projectile.expireTick = world.tick + projectile.maxTicks; // Make the spell last longer when deflected
	} else {
		hero.hitTick = world.tick;

		if (hero.id !== projectile.owner) {
			const damage = projectile.damage;
			applyDamage(hero, damage, projectile.owner);
		}

		if (projectile.link) {
			linkToHero(projectile, hero, world);
		} else if (projectile.bounce) { // Only bounce off heroes, not projectiles
			bounceToNext(projectile, hero, world);
		} else if (projectile.explodeOn & categoryFlags(hero)) {
			destroyObject(world, projectile);
		}
	}
}

function categoryFlags(obj: w.WorldObject) {
	if (!obj) {
		return 0;
	}

	switch (obj.category) {
		case "hero": return constants.Categories.Hero;
		case "projectile": return constants.Categories.Projectile;
		default: return 0;
	}
}

function find(objects: Map<string, w.WorldObject>, predicate: (obj: w.WorldObject) => boolean): w.WorldObject {
	let found: w.WorldObject = null;
	objects.forEach(x => {
		if (predicate(x)) {
			found = x;
		}
	});
	return found;
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


function linkToHero(projectile: w.Projectile, hero: w.WorldObject, world: w.World) {
	if (!projectile.link) {
		return;
	}

	if (projectile.link.heroId) {
		return; // Already linked
	}

	projectile.expireTick = world.tick + projectile.link.linkTicks;
	projectile.link.heroId = hero.id;

	// Destroy fixtures on this link so it stops colliding with things
	let fixturesToDestroy = new Array<pl.Fixture>();
	for (let fixture = projectile.body.getFixtureList(); !!fixture; fixture = fixture.getNext()) {
		fixturesToDestroy.push(fixture);
	}
	fixturesToDestroy.forEach(fixture => projectile.body.destroyFixture(fixture));
}

function bounceToNext(projectile: w.Projectile, hit: w.WorldObject, world: w.World) {
	if (!projectile.bounce) {
		return;
	}

	let nextTarget = findNearest(
		world.objects,
		projectile.body.getPosition(),
		x => x.type === "hero" && x.id !== hit.id);
	if (!nextTarget) {
		return;
	}

	projectile.targetId = nextTarget.id;
	projectile.damage *= projectile.bounce.damageFactor || 1.0;

	let currentSpeed = vector.length(projectile.body.getLinearVelocity());
	let newDirection = vector.unit(vector.diff(nextTarget.body.getPosition(), projectile.body.getPosition()));
	let newVelocity = vector.multiply(newDirection, currentSpeed);
	projectile.body.setLinearVelocity(newVelocity);
}

function homingForce(world: w.World) {
	world.objects.forEach(obj => {
		if (!(obj.category === "projectile" && obj.homing)) {
			return;
		}

		let target = null;
		if (obj.homing.targetSelf) {
			target = find(world.objects, x => x.id === obj.owner);
		} else {
			target = find(world.objects, x => x.id === obj.targetId);
		}

		if (!target) {
			return;
		}

		const distanceToTarget = vector.distance(obj.body.getPosition(), target.body.getPosition());
		if (distanceToTarget < obj.homing.minDistanceToTarget) {
			return;
		}

		// Home to target
		let currentSpeed = vector.length(obj.body.getLinearVelocity());

		let currentDirection = vector.unit(obj.body.getLinearVelocity());
		let idealDirection = vector.unit(vector.diff(target.body.getPosition(), obj.body.getPosition()));
		if (obj.homing.turnRate <= 0.5 && vector.length(vector.plus(currentDirection, idealDirection)) <= 0.01) {
			// The projectile is heading perfectly away from the target so needs a tiebreaker to be able to turnaround
			idealDirection = vector.rotateRight(currentDirection);
		}

		let newDirection = vector.unit(vector.plus(currentDirection, vector.multiply(idealDirection, obj.homing.turnRate)));
		let newVelocity = vector.multiply(newDirection, currentSpeed);
		obj.body.setLinearVelocity(newVelocity);
	});
}

function linkForce(world: w.World) {
	const minDistance = Hero.Radius * 3;
	const maxDistance = 0.25;
	world.objects.forEach(obj => {
		if (!(obj.category === "projectile" && obj.link && obj.link.heroId)) {
			return;
		}

		const owner = find(world.objects, x => x.id == obj.owner);
		const target = find(world.objects, x => x.id == obj.link.heroId);
		if (!(owner && target)) {
			return;
		}

		const diff = vector.diff(target.body.getPosition(), owner.body.getPosition());
		const distance = vector.length(diff);
		const strength = obj.link.strength * Math.max(0, distance - minDistance) / (maxDistance - minDistance);
		if (strength <= 0) {
			return;
		}

		const toTarget = vector.multiply(vector.unit(diff), strength);
		owner.body.applyLinearImpulse(toTarget, owner.body.getWorldPoint(vector.zero()), true);
		target.body.applyLinearImpulse(vector.negate(toTarget), target.body.getWorldPoint(vector.zero()), true);
	});
}

function decayShields(world: w.World) {
	world.objects.forEach(obj => {
		if (obj.category === "hero" && obj.shieldTicks > 0) {
			--obj.shieldTicks;
			if (obj.shieldTicks === 0) {
				obj.body.resetMassData();
			}
		}
	});
}

function updateKnockback(world: w.World) {
	world.objects.forEach(obj => {
		if (obj.category === "hero") {
			let damping = Hero.MinDamping + (Hero.MaxDamping - Hero.MinDamping) * obj.health / Hero.MaxHealth;
			obj.body.setLinearDamping(damping);
		}
	});
}

function applyLavaDamage(world: w.World) {
	world.objects.forEach(obj => {
		if (obj.category === "hero") {
			let position = obj.body.getPosition();
			if (vector.distance(position, pl.Vec2(0.5, 0.5)) > world.radius) {
				applyDamage(obj, World.LavaDamagePerTick, null);
			}
		}
	});
}

function shrink(world: w.World) {
	if (world.activePlayers.size > 1) {
		world.radius = Math.max(0, world.radius - World.ShrinkPerTick);
	}
}

function reap(world: w.World) {
	world.objects.forEach(obj => {
		if (obj.category === "hero") {
			if (obj.health <= 0) {
				destroyObject(world, obj);
				createKilledNotification(obj, world);
			}
		} else if (obj.category === "projectile") {
			let pos = obj.body.getPosition();
			if (world.tick >= obj.expireTick) {
				destroyObject(world, obj);
			}
		}
	});
}

function createKilledNotification(hero: w.Hero, world: w.World) {
	const killed = world.players.get(hero.id);
	if (!killed) {
		return;
	}

	const killer = hero.killerHeroId && world.players.get(hero.killerHeroId) || null;
	const assist = hero.assistHeroId && world.players.get(hero.assistHeroId) || null;
	world.ui.notifications.push({ type: "kill", killed, killer, assist });
}

function destroyObject(world: w.World, object: w.WorldObject) {
	world.objects.delete(object.id);
	world.physics.destroyBody(object.body);

	object.destroyed = true;
	world.destroyed.push(object);
}

function moveAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.MoveSpell) {
	if (!action.target) { return true; }

	let current = hero.body.getPosition();
	let target = action.target;
	hero.step = vector.truncate(vector.diff(target, current), Hero.MoveSpeedPerTick);

	return vector.distance(current, target) < constants.Pixel;
}

function spawnProjectileAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.ProjectileSpell) {
	if (!action.target) { return true; }

	addProjectile(world, hero, action.target, spell, spell.projectile);
	return true;
}

function sprayProjectileAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.SpraySpell) {
	if (!action.target) { return true; }

	const currentLength = world.tick - hero.casting.channellingStartTick;
	if (currentLength % spell.intervalTicks === 0) {
		const currentAngle = vector.angle(hero.body.getPosition());

		const projectileIndex = Math.floor(currentLength / spell.intervalTicks);
		const numProjectiles = spell.lengthTicks / spell.intervalTicks;
		const newAngle = currentAngle + 2 * Math.PI * projectileIndex / numProjectiles;

		const jitterRadius = vector.distance(hero.body.getPosition(), action.target) * spell.jitterRatio;
		const newTarget = vector.plus(action.target, vector.multiply(vector.fromAngle(newAngle), jitterRadius));

		addProjectile(world, hero, newTarget, spell, spell.projectile);
	}
	return currentLength >= spell.lengthTicks;
}

function teleportAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.TeleportSpell) {
	if (!action.target) { return true; }

	let currentPosition = hero.body.getPosition();
	let newPosition = vector.towards(currentPosition, action.target, Spells.teleport.maxRange);
	hero.body.setPosition(newPosition);
	return true;
}

function thrustAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.ThrustSpell) {
	if (!action.target) { return true; }

	const diff = vector.diff(action.target, hero.body.getPosition());

	const thrustTicks = world.tick - hero.casting.channellingStartTick;
	if (thrustTicks >= spell.maxTicks || vector.length(diff) < constants.Pixel) {
		hero.body.setLinearVelocity(vector.zero());
		return true;
	}

	const step = vector.multiply(vector.truncate(diff, spell.speed / TicksPerSecond), TicksPerSecond);
	hero.body.setLinearVelocity(step);
	return false;
}

function scourgeAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.ScourgeSpell) {
	applyDamage(hero, spell.selfDamage, hero.id);

	let heroPos = hero.body.getPosition();
	world.objects.forEach(obj => {
		if (obj.id === hero.id) { return; }

		let objPos = obj.body.getPosition();
		let diff = vector.diff(objPos, heroPos);
		let proportion = 1.0 - (vector.length(diff) / (spell.radius + Hero.Radius)); // +HeroRadius because only need to touch the edge
		if (proportion <= 0.0) { return; } 

		if (obj.category === "hero") {
			applyDamage(obj, spell.damage, hero.id);
		}

		let magnitude = spell.minImpulse + proportion * (spell.maxImpulse - spell.minImpulse);
		let impulse = vector.multiply(vector.unit(diff), magnitude);
		obj.body.applyLinearImpulse(impulse, obj.body.getWorldPoint(vector.zero()), true);
	});

	world.ui.trails.push({
		type: "circle",
		remaining: spell.trailTicks,
		max: spell.trailTicks, 
		pos: vector.clone(hero.body.getPosition()),
		fillStyle: 'white',
		glowPixels: 20,
		radius: spell.radius,
	});

	return true;
}

function shieldAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.ShieldSpell) {
	hero.shieldTicks = spell.maxTicks;
	hero.body.setMassData({
		mass: Spells.shield.mass,
		center: vector.zero(),
		I: 0,
	});

	return true;
}

function applyDamage(toHero: w.Hero, amount: number, fromHeroId: string) {
	toHero.health -= amount;
	if (fromHeroId && toHero.killerHeroId !== fromHeroId && fromHeroId !== toHero.id) {
		toHero.assistHeroId = toHero.killerHeroId || toHero.assistHeroId;
		toHero.killerHeroId = fromHeroId;
	}
}