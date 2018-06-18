import pl from 'planck-js';
import * as constants from '../game/constants';
import * as c from '../game/constants.model';
import * as vector from './vector';
import * as w from './world.model';

import { Hero, World, Spells, TicksPerSecond } from '../game/constants';

const AllCategories = 0xFFFF;
const HeroCategory = 1;
const ProjectileCategory = 2;

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

		collisions: [],
		destroyed: [],

		nextPositionId: 0,
		nextBulletId: 0,
		nextColorId: 0,

		ui: {
			myGameId: null,
			myHeroId: null,
			trails: [],
			notifications: [],
		}
	} as w.World;
	world.physics.on('post-solve', (contact) => onCollision(world, contact));
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
		filterCategoryBits: HeroCategory,
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
		charging: {},
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
		filterCategoryBits: ProjectileCategory,
		filterMaskBits: AllCategories ^ (spell.passthrough ? ProjectileCategory : 0),
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
		uiPreviousPos: vector.clone(position),
		expireTick: world.tick + spell.maxTicks,
		damageMultiplier: 1.0,
		bullet: true,
		targetId: enemy ? enemy.id : null,
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
			let hero: w.Hero = find(world.objects, x => x.id === ev.heroId);
			if (!hero) {
				hero = addHero(world, nextHeroPosition(world), ev.heroId, ev.playerName);
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
	if (hero.charging && hero.charging.action) {
		let chargingAction = hero.charging.action;
		let chargingSpell = constants.Spells.all[chargingAction.type];
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
		let nextSpell = constants.Spells.all[nextAction.type];
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

function applyAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.Spell) {
	if (spell.cooldown) {
		setCooldown(world, hero, spell.id, spell.cooldown);
	}

	switch (spell.action) {
		case "move": return moveAction(world, hero, action, spell);
		case "projectile": return spawnProjectileAction(world, hero, action, spell);
		case "scourge": return scourgeAction(world, hero, action, spell);
		case "teleport": return teleportAction(world, hero, action, spell);
		case "shield": return shieldAction(world, hero, action, spell);
	}
}

function onCollision(world, contact) {
	let objA = world.objects.get(contact.getFixtureA().getBody().getUserData());
	let objB = world.objects.get(contact.getFixtureB().getBody().getUserData());
	if (objA.category === "hero" && objB.category === "projectile") {
		world.collisions.push({ hero: objA, projectile: objB });
	} else if (objA.category === "projectile" && objB.category === "hero") {
		world.collisions.push({ hero: objB, projectile: objA });
	} else if (objA.category === "projectile" && objB.category === "projectile") {
		world.collisions.push({ projectile: objA, other: objB });
		world.collisions.push({ projectile: objB, other: objA });
	}
}

function handleCollisions(world: w.World, collisions: w.Collision[]) {
	collisions.forEach(collision => {
		if (collision.projectile) {
			let spell = constants.Spells.all[collision.projectile.type];
			if (spell.action !== "projectile") {
				return;
			}

			if (collision.hero && collision.hero.shieldTicks > 0) {
				if (spell.action === "projectile" && spell.maxTicks) {
					collision.projectile.expireTick = world.tick + spell.maxTicks; // Make the spell last longer
				}

				if (collision.projectile.owner !== collision.hero.id) { // Stop double redirections cancelling out
					// Redirect back to owner
					collision.projectile.targetId = collision.projectile.owner;
					collision.projectile.owner = collision.hero.id;
				}
			} else {
				if (collision.hero && !(collision.hero.id == collision.projectile.owner) && !collision.hero.shieldTicks) {
					const damage = spell.damage * (collision.projectile.damageMultiplier || 1.0);
					applyDamage(collision.hero, damage, collision.projectile.owner);
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
	let found = null;
	objects.forEach(x => {
		if (predicate(x)) {
			found = x;
		}
	});
	return found;
}

function findNearest(objects, target, predicate) {
	let nearestDistance = Infinity;
	let nearest = null;
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

function bounceToNext(projectile: w.Projectile, hit: w.WorldObject, spell: c.ProjectileSpell, world: w.World) {
	let nextTarget = findNearest(
		world.objects,
		projectile.body.getPosition(),
		x => x.type === "hero" && x.id !== hit.id);
	if (!nextTarget) {
		return;
	}

	projectile.targetId = nextTarget.id;

	let newDirection = vector.unit(vector.diff(nextTarget.body.getPosition(), projectile.body.getPosition()));
	let newVelocity = vector.multiply(newDirection, spell.speed);
	projectile.body.setLinearVelocity(newVelocity);

	projectile.damageMultiplier = (projectile.damageMultiplier || 1.0) * spell.bounceDamage;
}

function homingForce(world: w.World) {
	world.objects.forEach(obj => {
		if (!(obj.category === "projectile" && obj.targetId)) {
			return;
		}

		let spell = constants.Spells.all[obj.type];
		if (!(spell && spell.action === "projectile" && spell.turnRate)) {
			return;
		}

		let target = find(world.objects, x => x.id === obj.targetId);
		if (target) {
			let currentSpeed = vector.length(obj.body.getLinearVelocity());
			let currentDirection = vector.unit(obj.body.getLinearVelocity());
			let idealDirection = vector.unit(vector.diff(target.body.getPosition(), obj.body.getPosition()));
			let newDirection = vector.unit(vector.plus(currentDirection, vector.multiply(idealDirection, spell.turnRate)));
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
	const killer = world.players.get(hero.killerHeroId);
	const assist = world.players.get(hero.assistHeroId);
	world.ui.notifications.push({ type: "kill", killed, killer, assist });
}

function destroyObject(world: w.World, object: w.WorldObject) {
	world.objects.delete(object.id);
	world.physics.destroyBody(object.body);

	object.destroyed = true;
	world.destroyed.push(object);
}

function moveAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.MoveSpell) {
	let current = hero.body.getPosition();
	let target = action.target;
	hero.step = vector.multiply(vector.truncate(vector.diff(target, current), Hero.MoveSpeedPerTick), TicksPerSecond);

	return vector.distance(current, target) < constants.Pixel;
}

function spawnProjectileAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.ProjectileSpell) {
	addProjectile(world, hero, action.target, spell);
	return true;
}

function teleportAction(world: w.World, hero: w.Hero, action: w.Action, spell: c.TeleportSpell) {
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