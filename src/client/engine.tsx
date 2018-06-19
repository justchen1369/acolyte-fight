import pl from 'planck-js';
import * as constants from '../game/constants';
import * as c from '../game/constants.model';
import * as vector from './vector';
import * as w from './world.model';

import { Hero, World, Spells, TicksPerSecond } from '../game/constants';

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

function nextHeroPosition(world: w.World) {
	let nextHeroIndex = world.nextPositionId++;
	let numHeroes = nextHeroIndex + 1;
	let radius = 0.25;
	let center = pl.Vec2(0.5, 0.5);

	let angle = 2 * Math.PI * nextHeroIndex / numHeroes;
	let pos = vector.plus(vector.multiply(pl.Vec2(Math.cos(angle), Math.sin(angle)), radius), center);
	return pos;
}

function addHero(world: w.World, position: pl.Vec2, heroId: string, playerName: string) {
	let body = world.physics.createBody({
		userData: heroId,
		type: 'dynamic',
		position,
		linearDamping: Hero.MaxDamping,
	});
	body.createFixture(pl.Circle(Hero.Radius), {
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
		killerHeroId: null,
		assistHeroId: null,
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

function addProjectile(world : w.World, hero : w.Hero, target: pl.Vec2, spell: c.ProjectileSpell) {
	let id = spell.id + (world.nextBulletId++);

	let from = hero.body.getPosition();
	let position = vector.towards(from, target, Hero.Radius + spell.radius + constants.Pixel);
	let velocity = vector.direction(target, from, spell.speed);

	let body = world.physics.createBody({
		userData: id,
		type: 'dynamic',
		position,
		linearVelocity: velocity,
		linearDamping: 0,
		bullet: true,
	});
	body.createFixture(pl.Circle(spell.radius), {
		density: spell.density,
		restitution: 1.0,
	});

	let enemy = findNearest(world.objects, target, x => x.type === "hero" && x.id !== hero.id);

	let projectile = {
		id,
		owner: hero.id,
		category: "projectile",
		type: spell.id,
		body,

		targetId: enemy ? enemy.id : null,
		damage: spell.damage,
		bounce: spell.bounce,
		turnRate: spell.turnRate,

		expireTick: world.tick + spell.maxTicks,
		maxTicks: spell.maxTicks,
		explodeOn: spell.explodeOn,

		render: spell.render,
		color: spell.color,
		radius: spell.radius,
		trailTicks: spell.trailTicks,

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
	decayShields(world);
	applyLavaDamage(world);
	shrink(world);
	updateKnockback(world);

	reap(world);
}

function physicsStep(world: w.World) {
	world.objects.forEach(obj => {
		if (obj.step) {
			obj.body.setLinearVelocity(vector.plus(obj.body.getLinearVelocity(), obj.step));
		}
	});

	world.physics.step(1.0 / TicksPerSecond);

	world.objects.forEach(obj => {
		if (obj.step) {
			obj.body.setLinearVelocity(vector.diff(obj.step, obj.body.getLinearVelocity())); // Why is this backwards? I don't know, but it works.
			obj.step = null;
		}
	});
}

function handlePlayerJoinLeave(world: w.World) {
	world.joinLeaveEvents.forEach(ev => {
		if (ev.type === "join") {
			console.log("Player joined:", ev.heroId);
			let hero = find(world.objects, x => x.id === ev.heroId);
			if (!hero) {
				hero = addHero(world, nextHeroPosition(world), ev.heroId, ev.playerName);
			} else if (hero.category !== "hero") {
				throw "Player tried to join as non-hero: " + ev.heroId;
			}

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

function performHeroActions(world: w.World, hero: w.Hero, nextAction: w.Action) {
	let action = nextAction;
	if (hero.casting && hero.casting.uninterruptible) {
		action = hero.casting.action;
	}
	if (!action) {
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

	if (hero.casting.stage === w.CastStage.Charging) {
		// Entering charging stage
		if (!hero.casting.chargeStartTick) {
			hero.casting.chargeStartTick = world.tick;
			hero.casting.uninterruptible = true;
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

			if (spell.cooldown) {
				setCooldown(world, hero, spell.id, spell.cooldown);
			}
		}

		done = applyAction(world, hero, action, spell);

		if (done) {
			++hero.casting.stage;
		}
	}

	if (hero.casting.stage === w.CastStage.Complete) {
		hero.casting = null;
	}

	// Only mark nextAction as completed if we actually did it and not the uninterruptible action
	return action === nextAction && done;
}

function applyAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.Spell): boolean {
	switch (spell.action) {
		case "move": return moveAction(world, hero, action, spell);
		case "projectile": return spawnProjectileAction(world, hero, action, spell);
		case "scourge": return scourgeAction(world, hero, action, spell);
		case "teleport": return teleportAction(world, hero, action, spell);
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
	if (object.category !== "projectile") {
		return;
	}
	const projectile = object;

	if (hit.category === "hero" && hit.shieldTicks > 0) {
		if (projectile.owner !== hit.id) { // Stop double redirections cancelling out
			// Redirect back to owner
			projectile.targetId = projectile.owner;
			projectile.owner = hit.id;
		}

		projectile.expireTick = world.tick + projectile.maxTicks; // Make the spell last longer when deflected
	} else {
		if (hit.category === "hero" && hit.id !== projectile.owner) {
			const damage = projectile.damage;
			applyDamage(hit, damage, projectile.owner);
		}

		if (projectile.bounce && hit.category === "hero") { // Only bounce off heroes, not projectiles
			bounceToNext(projectile, hit, world);
		} else if (projectile.explodeOn & categoryFlags(hit.category)) {
			destroyObject(world, projectile);
		}
	}
}

function categoryFlags(category: string) {
	switch (category) {
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
		if (!(obj.category === "projectile" && obj.targetId && obj.turnRate)) {
			return;
		}

		let target = find(world.objects, x => x.id === obj.targetId);
		if (target) {
			let currentSpeed = vector.length(obj.body.getLinearVelocity());
			let currentDirection = vector.unit(obj.body.getLinearVelocity());
			let idealDirection = vector.unit(vector.diff(target.body.getPosition(), obj.body.getPosition()));
			let newDirection = vector.unit(vector.plus(currentDirection, vector.multiply(idealDirection, obj.turnRate)));
			let newVelocity = vector.multiply(newDirection, currentSpeed);
			obj.body.setLinearVelocity(newVelocity);
		}
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
			if (world.tick >= obj.expireTick || pos.x < 0 || pos.x > 1 || pos.y < 0 || pos.y > 1) {
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
	hero.step = vector.multiply(vector.truncate(vector.diff(target, current), Hero.MoveSpeedPerTick), TicksPerSecond);

	return vector.distance(current, target) < constants.Pixel;
}

function spawnProjectileAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.ProjectileSpell) {
	if (!action.target) { return true; }

	addProjectile(world, hero, action.target, spell);
	return true;
}

function teleportAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.TeleportSpell) {
	if (!action.target) { return true; }

	let currentPosition = hero.body.getPosition();
	let newPosition = vector.towards(currentPosition, action.target, Spells.teleport.maxRange);
	hero.body.setPosition(newPosition);
	return true;
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
		obj.body.applyLinearImpulse(impulse, vector.zero(), true);
	});

	world.ui.trails.push({
		type: "circle",
		remaining: spell.trailTicks,
		max: spell.trailTicks, 
		pos: vector.clone(hero.body.getPosition()),
		fillStyle: 'white',
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
	if (fromHeroId && toHero.killerHeroId !== fromHeroId) {
		toHero.assistHeroId = toHero.killerHeroId || toHero.assistHeroId;
		toHero.killerHeroId = fromHeroId;
	}
}