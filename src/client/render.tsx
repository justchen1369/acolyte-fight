import * as pl from 'planck-js';
import * as constants from '../game/constants';
import * as engine from '../game/engine';
import * as vector from '../game/vector';
import * as w from '../game/world.model';

import { ButtonBar, ChargingIndicator, HealthBar, Hero, Spells, Pixel } from '../game/constants';
import { Icons } from '../ui/icons';
import { renderIcon } from '../ui/renderIcon';

export interface CanvasStack {
	background: HTMLCanvasElement;
	glows: HTMLCanvasElement;
	canvas: HTMLCanvasElement;
}

export interface CanvasCtxStack {
	background: CanvasRenderingContext2D;
	glows: CanvasRenderingContext2D;
	canvas: CanvasRenderingContext2D;
}

// Rendering
export function calculateWorldRect(rect: ClientRect) {
	let size = Math.min(rect.width, rect.height);
	return {
		left: (rect.width - size) / 2.0,
		top: (rect.height - size) / 2.0,
		width: size,
		height: size,
	};
}

export function render(world: w.World, canvasStack: CanvasStack) {
	let ctxStack = {
		background: canvasStack.background.getContext('2d', { alpha: false }),
		glows: canvasStack.glows.getContext('2d', { alpha: true }),
		canvas: canvasStack.canvas.getContext('2d', { alpha: true }),
	} as CanvasCtxStack;

	if (!(ctxStack.background && ctxStack.glows && ctxStack.canvas)) {
		throw "Error getting context";
	}

	let rect = canvasStack.canvas.getBoundingClientRect();

	all(ctxStack, ctx => ctx.save());
	clearCanvas(ctxStack, rect);
	renderWorld(ctxStack, world, rect);
	renderInterface(ctxStack.canvas, world, rect);
	all(ctxStack, ctx => ctx.restore());
}

function all(contextStack: CanvasCtxStack, func: (ctx: CanvasRenderingContext2D) => void) {
	func(contextStack.background);
	func(contextStack.glows);
	func(contextStack.canvas);
}

function foreground(contextStack: CanvasCtxStack, func: (ctx: CanvasRenderingContext2D) => void) {
	func(contextStack.glows);
	func(contextStack.canvas);
}

function clearCanvas(ctxStack: CanvasCtxStack, rect: ClientRect) {
	ctxStack.background.fillStyle = 'black';
	ctxStack.background.fillRect(0, 0, rect.width, rect.height);

	ctxStack.glows.clearRect(0, 0, rect.width, rect.height);
	ctxStack.canvas.clearRect(0, 0, rect.width, rect.height);
}

function renderWorld(ctxStack: CanvasCtxStack, world: w.World, rect: ClientRect) {
	all(ctxStack, ctx => ctx.save());

	let worldRect = calculateWorldRect(rect);
	all(ctxStack, ctx => ctx.translate(worldRect.left, worldRect.top));
	all(ctxStack, ctx => ctx.scale(worldRect.width, worldRect.height));

	renderMap(ctxStack.background, world);

	world.objects.forEach(obj => renderObject(ctxStack, obj, world));
	world.destroyed.forEach(obj => renderDestroyed(ctxStack, obj, world));
	world.events.forEach(obj => renderEvent(ctxStack, obj, world));

	let newTrails = new Array<w.Trail>();
	world.ui.trails.forEach(trail => {
		renderTrail(ctxStack, trail, world);

		const expireTick = trail.initialTick + trail.max;
		if (world.tick < expireTick) {
			newTrails.push(trail);
		}
	});
	world.ui.trails = newTrails;

	all(ctxStack, ctx => ctx.restore());
}

function renderObject(ctxStack: CanvasCtxStack, obj: w.WorldObject, world: w.World) {
	const ctx = ctxStack.canvas;
	if (obj.category === "hero") {
		renderHero(ctx, obj, world);
	} else if (obj.category === "projectile") {
		renderSpell(ctxStack, obj, world);
	} else if (obj.category === "obstacle") {
		renderObstacle(ctxStack, obj, world);
	}
}

function renderDestroyed(ctxStack: CanvasCtxStack, obj: w.WorldObject, world: w.World) {
	if (obj.category === "hero") {
		renderHeroDeath(ctxStack, obj, world);
	} else if (obj.category === "projectile") {
		renderSpell(ctxStack, obj, world);

		if (obj.type === Spells.drain.id) {
			renderDrainReturn(ctxStack, obj, world);
		}
	} else if (obj.category === "obstacle") {
		renderObstacleDestroyed(ctxStack, obj, world);
	}
}

function renderHeroDeath(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	const ticks = 15;
	world.ui.trails.push({
		type: "circle",
		max: ticks,
		initialTick: world.tick,
		pos: hero.body.getPosition(),
		fillStyle: 'white',
		radius: Hero.Radius * 1.5,
	});
}

function renderObstacleDestroyed(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, world: w.World) {
	const ticks = 15;
	world.ui.trails.push({
		type: "circle",
		max: ticks,
		initialTick: world.tick,
		pos: obstacle.body.getPosition(),
		fillStyle: 'white',
		radius: obstacle.extent,
	});
}

function renderSpell(ctxStack: CanvasCtxStack, obj: w.Projectile, world: w.World) {
	const ctx = ctxStack.canvas;

	if (obj.render === "projectile") {
		// Render both to ensure there are no gaps in the trail
        renderProjectile(ctx, obj, world);
        renderRay(ctx, obj, world);
	} else if (obj.render == "ray") {
        renderRay(ctx, obj, world);
	} else if (obj.render === "link") {
		renderLink(ctxStack, obj, world);
	} else if (obj.render === "gravity") {
		renderGravity(ctx, obj, world);
	}
}

function renderDrainReturn(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World) {
	if (!projectile.hit) {
		return;
	}

	let owner = world.objects.get(projectile.owner);
	if (!owner) {
		return;
	}

	const pos = owner.body.getPosition();

	world.ui.trails.push({
		type: 'circle',
		initialTick: world.tick,
		max: 0.25 * constants.TicksPerSecond,
		pos: vector.clone(pos),
		fillStyle: projectile.color,
		radius: Hero.Radius * 1.5,
	} as w.CircleTrail);
}

function renderEvent(ctxStack: CanvasCtxStack, ev: w.WorldEvent, world: w.World) {
	let ticks;
	let radius;
	if (ev.type === w.WorldEventType.Scourge) {
		ticks = 30;
		radius = Spells.scourge.radius;
	} else if (ev.type === w.WorldEventType.HeroDeath) {
		ticks = 15;
		radius = Hero.Radius * 1.5;
	} else {
		return;
	}

	world.ui.trails.push({
		type: "circle",
		max: ticks,
		initialTick: world.tick,
		pos: ev.pos,
		fillStyle: 'white',
		radius,
	});
}

function renderMap(ctx: CanvasRenderingContext2D, world: w.World) {
	ctx.save();

	ctx.translate(0.5, 0.5);

	ctx.fillStyle = '#333333';
	ctx.beginPath();
	ctx.arc(0, 0, world.radius, 0, 2 * Math.PI);
	ctx.fill();

	ctx.restore();
}

function renderObstacle(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, world: w.World) {
	if (obstacle.destroyed) {
		return;
	}

	const body = obstacle.body;
	const pos = body.getPosition();

	const proportion = obstacle.health / obstacle.maxHealth;

	foreground(ctxStack, ctx => {
		ctx.save();
		
		ctx.translate(pos.x, pos.y);
		ctx.rotate(body.getAngle());

		ctx.lineWidth = Pixel * 3;

		const red = 0;
		const saturation = 1.0 - proportion;
		ctx.strokeStyle = 'white'; // hsl(red, saturation, (0.5 + 0.5 * proportion));

		if (ctx === ctxStack.canvas) {
			const gradient = ctx.createLinearGradient(-obstacle.extent, -obstacle.extent, obstacle.extent, obstacle.extent);
			gradient.addColorStop(0, hsl(red, saturation, 0.5));
			gradient.addColorStop(1, hsl(red, saturation, 0.3));
			ctx.fillStyle = gradient;
		} else {
			ctx.fillStyle = 'white';
		}
		ctx.beginPath();

		const points = obstacle.points;
		for (let i = 0; i <= points.length; ++i) { // <= to because we need to return to the start point and close the shape
			const point = points[i % points.length];
			if (i === 0) {
				ctx.moveTo(point.x, point.y);
			}
			ctx.lineTo(point.x, point.y);
		}
		ctx.fill();

		if (ctx === ctxStack.canvas) {
			ctx.stroke();
		}

		ctx.restore();
	});
}

function renderHero(ctx: CanvasRenderingContext2D, hero: w.Hero, world: w.World) {
	if (hero.destroyed) {
		return;
	}

	let color = Hero.InactiveColor;
	if (world.activePlayers.has(hero.id)) {
		const player = world.players.get(hero.id);
		if (hero.id === world.ui.myHeroId) {
			color = Hero.MyHeroColor;
		} else if (player) {
			color = player.color;
		}
	}

	const pos = hero.body.getPosition();
	const angle = hero.body.getAngle();
	let radius = Hero.Radius;

	if (hero.casting && hero.casting.stage >= w.CastStage.Channelling && hero.casting.action.type === Spells.thrust.id) {
		radius = Hero.Radius * 1.25;
	}

	ctx.save();
	ctx.translate(pos.x, pos.y);

	// Fill
	{
		ctx.save();

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, 2 * Math.PI);
		ctx.fill();

		ctx.restore();
	}

	// Orientation
	{
		ctx.save();

		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, 2 * Math.PI);
		ctx.clip();

		ctx.rotate(angle);
		ctx.scale(radius, radius);

		ctx.fillStyle = "white";
		ctx.strokeStyle = "black";
		ctx.lineWidth = Pixel;

		ctx.globalAlpha = 0.5;
		if (hero.casting && hero.casting.stage >= w.CastStage.Orientating && hero.casting.action.type !== Spells.move.id) {
			ctx.globalAlpha = 0.75;
		}

		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(-1, 1);
		ctx.lineTo(0, 1);
		ctx.lineTo(0.5, 0);
		ctx.lineTo(0, -1);
		ctx.lineTo(-1, -1);
		ctx.lineTo(0, 0);
		ctx.fill();
		ctx.stroke();

		ctx.restore();
	}

	// Charging
	if (hero.casting && hero.casting.color && hero.casting.proportion > 0) {
		ctx.save();

		ctx.globalAlpha = hero.casting.proportion;
		ctx.strokeStyle = hero.casting.color;
		ctx.lineWidth = ChargingIndicator.Width;
		ctx.beginPath();
		ctx.arc(0, 0, radius + ChargingIndicator.Margin, 0, 2 * Math.PI);
		ctx.stroke();

		ctx.restore();
	}

	// Shield
	if (hero.shieldTicks) {
		let spell = Spells.shield;
		let proportion = 1.0 * hero.shieldTicks / spell.maxTicks;

		ctx.save();

		const MaxAlpha = 0.75;
		const MinAlpha = 0.10;
		ctx.globalAlpha = (MaxAlpha - MinAlpha) * proportion + MinAlpha;
		ctx.fillStyle = spell.color;
		ctx.shadowColor = spell.color;
		ctx.shadowBlur = 10;

		ctx.beginPath();
		ctx.arc(0, 0, spell.radius, 0, 2 * Math.PI);
		ctx.fill();


		ctx.restore();
	}

	// Health bar
	const ticksUntilStart = Math.max(0, world.startTick - world.tick);
	if (ticksUntilStart <= constants.Matchmaking.JoinPeriod || hero.health < Hero.MaxHealth) {
		ctx.fillStyle = '#111';
		ctx.beginPath();
		healthBarPath(ctx, radius, 1.0);
		ctx.fill();

		let healthProportion = hero.health / Hero.MaxHealth;
		ctx.fillStyle = rgColor(healthProportion);
		ctx.beginPath();
		healthBarPath(ctx, radius, healthProportion);
		ctx.fill();

		let startProportion = Math.min(healthProportion, ticksUntilStart / constants.Matchmaking.JoinPeriod);
		if (startProportion > 0) {
			ctx.save();

			ctx.fillStyle = "#ffffff";
			ctx.globalAlpha = startProportion;
			ctx.beginPath();
			healthBarPath(ctx, radius, healthProportion);
			ctx.fill();

			ctx.restore();
		}
	}

	ctx.restore();
}

function healthBarPath(ctx: CanvasRenderingContext2D, radius: number, proportion: number) {
	ctx.rect(-HealthBar.Radius, -radius - HealthBar.Height - HealthBar.Margin, HealthBar.Radius * 2 * proportion, HealthBar.Height);
}

function rgColor(proportion: number) {
	let hue = proportion * 120.0;
	return hsl(hue, 1.0, 0.5);
}

function renderGravity(ctx: CanvasRenderingContext2D, projectile: w.Projectile, world: w.World) {
	if (!projectile.gravity) {
		return;
	}

	const animationLength = 0.33 * constants.TicksPerSecond;
	const numParticles = 3;

	const angleOffset = (2 * Math.PI) * (world.tick % animationLength) / animationLength;
	for (let i = 0; i < numParticles; ++i) {
		const angle = angleOffset + (2 * Math.PI) * i / numParticles;
		world.ui.trails.push({
			type: "circle",
			pos: vector.plus(projectile.body.getPosition(), vector.multiply(vector.fromAngle(angle), projectile.radius)),
			radius: projectile.radius / numParticles,
			initialTick: world.tick,
			max: projectile.trailTicks, 
			fillStyle: projectileColor(projectile, world),
		});
	}
}

function renderLink(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World) {
	if (!projectile.link) {
		return;
	}

	let owner: w.WorldObject = world.objects.get(projectile.owner);
	let target: w.WorldObject = world.objects.get(projectile.link.heroId);
	if (!target) {
		if (projectile.link.heroId) {
			// Linked to a hero who is now dead, display nothing
			return;
		} else {
			target = projectile;
			renderProjectile(ctxStack.canvas, projectile, world);
		}
	}

	if (!(owner && target)) {
		return;
	}

	foreground(ctxStack, ctx => {
		ctx.lineWidth = Pixel * 5;
		ctx.strokeStyle = projectile.color;

		const from = owner.body.getPosition();
		const to = target.body.getPosition();
		ctx.beginPath();
		ctx.moveTo(from.x, from.y);
		ctx.lineTo(to.x, to.y);
		ctx.stroke();
	});
}

function renderRay(ctx: CanvasRenderingContext2D, projectile: w.Projectile, world: w.World) {
	let pos = projectile.body.getPosition();
	let previous = projectile.uiPreviousPos;
	projectile.uiPreviousPos = vector.clone(pos);

	if (!previous) {
		renderProjectile(ctx, projectile, world);
		return;
	}

	world.ui.trails.push({
		type: 'line',
		initialTick: world.tick,
		max: projectile.trailTicks, 
		from: vector.clone(previous),
		to: vector.clone(pos),
		fillStyle: projectileColor(projectile, world),
		width: projectile.radius * 2,
	} as w.LineTrail);
}

function renderProjectile(ctx: CanvasRenderingContext2D, projectile: w.Projectile, world: w.World) {
	let pos = projectile.body.getPosition();

	world.ui.trails.push({
		type: 'circle',
		initialTick: world.tick,
		max: projectile.trailTicks, 
		pos: vector.clone(pos),
		fillStyle: projectileColor(projectile, world),
		radius: projectile.radius,
	} as w.CircleTrail);
}

function projectileColor(projectile: w.Projectile, world: w.World) {
	let color = projectile.color;
	if (projectile.selfColor && projectile.owner === world.ui.myHeroId) {
		color = Hero.MyHeroColor;
	}
	return color;
}

function renderTrail(ctxStack: CanvasCtxStack, trail: w.Trail, world: w.World) {
	const expireTick = trail.initialTick + trail.max;
	const remaining = expireTick - world.tick;
	if (remaining <= 0) {
		return true;
	}

	const proportion = 1.0 * remaining / trail.max;

	foreground(ctxStack, ctx => {
		ctx.save(); 

		ctx.globalCompositeOperation = "lighten";
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
	});

	return false;
}

function renderInterface(ctx: CanvasRenderingContext2D, world: w.World, rect: ClientRect) {
	if (!world.ui.myHeroId) {
		return;
	}

	const myHero = world.objects.get(world.ui.myHeroId) as w.Hero;
	if (myHero) {
		const heroAction = world.actions.get(myHero.id);
		renderButtons(ctx, rect, world, myHero, heroAction);
	}
}

function renderButtons(ctx: CanvasRenderingContext2D, rect: ClientRect, world: w.World, hero: w.Hero, heroAction?: w.Action) {
	let selectedAction = heroAction && heroAction.type;

	const keys = ButtonBar.Keys;
	let buttonBarWidth = keys.length * ButtonBar.Size + (keys.length - 1) * ButtonBar.Spacing;

	ctx.save();
	ctx.translate(rect.width / 2.0 - buttonBarWidth / 2.0, rect.height - ButtonBar.Size - ButtonBar.Margin);

	for (let i = 0; i < keys.length; ++i) {
		const key = keys[i];
		if (!key) { continue; }

		const spellId = hero.keysToSpells.get(key);
		if (!spellId) { continue; }

		let spell = Spells.all[spellId];

		let isSelected = selectedAction === spell.id;
		let remainingInSeconds = engine.cooldownRemaining(world, hero, spell.id) / constants.TicksPerSecond;

		ctx.save();
		ctx.translate((ButtonBar.Size + ButtonBar.Spacing) * i, 0);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		
		let color = spell.color;
		if (isSelected) {
			color = '#f0f0f0';
		} else if (remainingInSeconds > 0) {
			color = '#444444';
		}
		renderIcon(ctx, spell.icon && Icons[spell.icon], color, 0.6, ButtonBar.Size);

		if (remainingInSeconds > 0) {
			// Cooldown
			let cooldownText = remainingInSeconds > 1 ? remainingInSeconds.toFixed(0) : remainingInSeconds.toFixed(1);

			ctx.font = 'bold ' + (ButtonBar.Size * 0.75 - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, cooldownText, ButtonBar.Size / 2, ButtonBar.Size / 2);
		} else {
			// Keyboard shortcut
			ctx.save();

			ctx.font = 'bold ' + (ButtonBar.Size / 2 - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, key.toUpperCase(), ButtonBar.Size / 4, ButtonBar.Size * 3 / 4);

			ctx.restore();
		}


		ctx.restore();
	}

	ctx.restore();
}

function renderTextWithShadow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
	ctx.save();

	ctx.fillStyle = 'black';
	ctx.fillText(text, x + 1, y + 1);

	ctx.fillStyle = 'white';
	ctx.fillText(text, x, y);

	ctx.restore();
}

function hsl(h: number, sProportion: number, lProportion: number): string {
	return 'hsl(' + h + ', ' + (100 * sProportion).toFixed(2) + '%, ' + (100 * lProportion).toFixed(2) + '%)';
}