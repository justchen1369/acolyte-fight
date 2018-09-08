import Color from 'color';
import * as pl from 'planck-js';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as engine from '../../game/engine';
import * as keyboardUtils from './keyboardUtils';
import * as vector from '../../game/vector';
import * as w from '../../game/world.model';

import { ButtonBar, ChargingIndicator, DashIndicator, HealthBar, HeroColors, Pixel } from '../../game/constants';
import { Icons } from './icons';
import { renderIconButton, renderIconOnly } from './renderIcon';
import { isMobile, isEdge } from '../core/userAgent';

export interface CanvasStack {
	background: HTMLCanvasElement;
	glows: HTMLCanvasElement;
	canvas: HTMLCanvasElement;
	ui: HTMLCanvasElement;
	cursor: HTMLCanvasElement;
}

export interface CanvasCtxStack {
	background: CanvasRenderingContext2D;
	glows: CanvasRenderingContext2D;
	canvas: CanvasRenderingContext2D;
	ui: CanvasRenderingContext2D;
}

// Rendering
export function resetRenderState(world: w.World) {
	world.ui.renderedTick = null;
	world.ui.buttonBar = null;
}

export function worldPointFromInterfacePoint(interfacePoint: pl.Vec2, rect: ClientRect) {
	const viewRect = calculateViewRects(rect);
	const worldPoint = worldPointFromViewRect(interfacePoint, viewRect);
	return worldPoint;
}

export function worldPointFromViewRect(interfacePoint: pl.Vec2, viewRect: ClientRect) {
	const worldRect = calculateWorldRect(viewRect);
	const worldPoint = pl.Vec2((interfacePoint.x - worldRect.left) / worldRect.width, (interfacePoint.y - worldRect.top) / worldRect.height);
	return worldPoint;
}

function calculateViewRects(rect: ClientRect): ClientRect {
	return {
		left: 0,
		right: rect.width,
		width: rect.width,
		top: 0,
		bottom: rect.height,
		height: rect.height,
	};
}

function calculateWorldRect(viewRect: ClientRect): ClientRect {
	const size = Math.min(viewRect.width, viewRect.height);

	const width = size;
	const height = size;

	const left = viewRect.left + (viewRect.width - size) / 2.0;
	const top = viewRect.top + (viewRect.height - size) / 2.0;

	const right = left + width;
	const bottom = top + height;

	return { left, top, right, bottom, width, height };
}

export function render(world: w.World, canvasStack: CanvasStack, rebindings: KeyBindings) {
	const rect = canvasStack.canvas.getBoundingClientRect();
	const viewRect = calculateViewRects(rect);
	const worldRect = calculateWorldRect(viewRect);

	// Cursor always gets rerendered
	{
		const cursorCtx = canvasStack.cursor.getContext('2d', { alpha: true });
		renderCursor(cursorCtx, world, rect, worldRect);
	}

	// Everything also always gets rendered (used to wait for changes, TODO: merge with cursor rendering)
	world.ui.renderedTick = world.tick;

	let ctxStack = {
		background: canvasStack.background.getContext('2d', { alpha: false }),
		glows: canvasStack.glows.getContext('2d', { alpha: true }),
		canvas: canvasStack.canvas.getContext('2d', { alpha: true }),
		ui: canvasStack.ui.getContext('2d', { alpha: true }),
	} as CanvasCtxStack;
	if (!(ctxStack.background && ctxStack.glows && ctxStack.canvas && ctxStack.ui)) {
		throw "Error getting context";
	}

	all(ctxStack, ctx => ctx.save());
	clearCanvas(ctxStack, rect);
	renderWorld(ctxStack, world, worldRect);
	renderInterface(ctxStack.ui, world, rect, rebindings);
	all(ctxStack, ctx => ctx.restore());

	world.ui.destroyed = [];
	world.ui.events = [];
}

function all(contextStack: CanvasCtxStack, func: (ctx: CanvasRenderingContext2D) => void) {
	func(contextStack.background);
	func(contextStack.glows);
	func(contextStack.canvas);
	func(contextStack.ui);
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

function renderWorld(ctxStack: CanvasCtxStack, world: w.World, worldRect: ClientRect) {
	all(ctxStack, ctx => ctx.save());
	all(ctxStack, ctx => ctx.translate(worldRect.left, worldRect.top));
	all(ctxStack, ctx => ctx.scale(worldRect.width, worldRect.height));

	renderMap(ctxStack.background, world);

	world.objects.forEach(obj => renderObject(ctxStack, obj, world));
	world.ui.destroyed.forEach(obj => renderDestroyed(ctxStack, obj, world));
	world.ui.events.forEach(obj => renderEvent(ctxStack, obj, world));

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

function renderCursor(ctx: CanvasRenderingContext2D, world: w.World, rect: ClientRect, worldRect: ClientRect) {
	if (!isMobile) {
		return;
	}

	ctx.clearRect(0, 0, rect.width, rect.height);

	ctx.save();
	ctx.translate(worldRect.left, worldRect.top);
	ctx.scale(worldRect.width, worldRect.height);

	renderTarget(ctx, world.ui.nextTarget, world);

	ctx.restore();
}

function renderTarget(ctx: CanvasRenderingContext2D, target: pl.Vec2, world: w.World) {
	const CrossHairSize = world.settings.Hero.Radius;
	if (!target) {
		return;
	}

	ctx.save();
	ctx.translate(target.x, target.y);

	ctx.strokeStyle = "white";
	ctx.lineWidth = Pixel * 3;

	ctx.beginPath();
	ctx.moveTo(0, -CrossHairSize);
	ctx.lineTo(0, CrossHairSize);
	ctx.moveTo(-CrossHairSize, 0);
	ctx.lineTo(CrossHairSize, 0);
	ctx.stroke();

	ctx.restore();
}

function renderObject(ctxStack: CanvasCtxStack, obj: w.WorldObject, world: w.World) {
	if (obj.category === "hero") {
		renderHero(ctxStack, obj, world);
		if (obj.gravity) {
			renderGravityWell(ctxStack, obj, world);
		}
		if (obj.link) {
			const target = world.objects.get(obj.link.targetId);
			if (target) {
				renderLinkBetween(ctxStack, obj, target, obj.link.color);
			}
		}
	} else if (obj.category === "shield") {
		renderShield(ctxStack, obj, world);
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
		radius: world.settings.Hero.Radius * 1.5,
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
	obj.uiPath.push(vector.clone(obj.body.getPosition()));

	if (obj.render === "ball") {
        renderProjectile(ctxStack, obj, world);
	} else if (obj.render === "projectile") {
		// Render both to ensure there are no gaps in the trail
        renderProjectile(ctxStack, obj, world);
        renderRay(ctxStack, obj, world);
	} else if (obj.render == "ray") {
		// A ray might be so fast that we need to render the subtick that it made contact, otherwise it doesn't look like it touched the other object at all
		const intermediatePoints = true;
        renderRay(ctxStack, obj, world, intermediatePoints);
	} else if (obj.render === "link") {
		renderLink(ctxStack, obj, world);
	} else if (obj.render === "gravity") {
		renderGravity(ctxStack, obj, world);
	} else if (obj.render === "supernova") {
		renderSupernova(ctxStack, obj, world);
	}

	while (obj.uiPath.length > 1) {
		obj.uiPath.shift();
	}
}

function renderLifeStealReturn(ctxStack: CanvasCtxStack, ev: w.LifeStealEvent, world: w.World) {
	let owner = world.objects.get(ev.owner);
	if (!owner) {
		return;
	}

	const pos = owner.body.getPosition();

	world.ui.trails.push({
		type: 'circle',
		initialTick: world.tick,
		max: 0.25 * constants.TicksPerSecond,
		pos: vector.clone(pos),
		fillStyle: HeroColors.HealColor,
		radius: world.settings.Hero.Radius * 1.5,
	} as w.CircleTrail);
}

function renderEvent(ctxStack: CanvasCtxStack, ev: w.WorldEvent, world: w.World) {
	if (ev.type === "scourge") {
		renderScourge(ctxStack, ev, world);
	} else if (ev.type === "detonate") {
		renderDetonate(ctxStack, ev, world);
	} else if (ev.type === "lifeSteal") {
		renderLifeStealReturn(ctxStack, ev, world);
	} else {
		return;
	}
}

function renderScourge(ctxStack: CanvasCtxStack, ev: w.ScourgeEvent, world: w.World) {
	world.ui.trails.push({
		type: "circle",
		max: 30,
		initialTick: world.tick,
		pos: ev.pos,
		fillStyle: 'white',
		radius: ev.radius,
	});
}

function renderDetonate(ctxStack: CanvasCtxStack, ev: w.DetonateEvent, world: w.World) {
	world.ui.trails.push({
		type: "circle",
		max: 10,
		initialTick: world.tick,
		pos: ev.pos,
		fillStyle: 'white',
		radius: ev.radius,
	});
}

function renderMap(ctx: CanvasRenderingContext2D, world: w.World) {
	ctx.save();

	ctx.translate(0.5, 0.5);

	ctx.lineWidth = Pixel * 5;
	ctx.strokeStyle = "#333333";
	if (world.winner) {
		const color = heroColor(world.winner, world);
		ctx.fillStyle = color;
		ctx.globalAlpha = 0.5;
	} else {
		ctx.fillStyle = "#333333";
	}

	let radius = world.radius;
	if (isEdge) {
		// Edge has a weird oscillation of Y-axis scaling for certain fractions of radius.
		// Force it to draw perfect circles by snapping to a minimum precision.
		radius = Math.floor(world.radius / Pixel) * Pixel;
	}
	ctx.beginPath();
	ctx.arc(0, 0, radius, 0, 2 * Math.PI);

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

		if (world.tick - obstacle.createTick < obstacle.growthTicks) {
			const growthProportion = (world.tick - obstacle.createTick) / obstacle.growthTicks;
			ctx.scale(growthProportion, growthProportion);
		}

		ctx.lineWidth = Pixel * 3;

		const red = 0;
		const saturation = 1.0 - proportion;
		ctx.strokeStyle = 'white'; // hsl(red, saturation, (0.5 + 0.5 * proportion));

		if (ctx === ctxStack.canvas) {
			const gradient = ctx.createLinearGradient(-obstacle.extent, -obstacle.extent, obstacle.extent, obstacle.extent);
			gradient.addColorStop(0, hsl(red, saturation, 0.5));
			gradient.addColorStop(1, hsl(red, saturation, 0.4));
			ctx.fillStyle = gradient;
		} else {
			ctx.fillStyle = 'white';
		}
		ctx.beginPath();

		const points = obstacle.points;
		for (let i = 0; i < points.length; ++i) {
			const point = points[i % points.length];
			if (i === 0) {
				ctx.moveTo(point.x, point.y);
			}
			ctx.lineTo(point.x, point.y);
		}

		ctx.closePath();
		ctx.fill();

		if (ctx === ctxStack.canvas) {
			ctx.stroke();
		}

		ctx.restore();
	});
}

function renderHero(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	const Hero = world.settings.Hero;
	const ctx = ctxStack.canvas;

	if (hero.destroyed) {
		return;
	}

	const pos = hero.body.getPosition();
	const radius = Hero.Radius;

	foreground(ctxStack, ctx => ctx.save());
	foreground(ctxStack, ctx => ctx.translate(pos.x, pos.y));

	renderHeroCharacter(ctxStack, hero, world);
	renderHeroBars(ctxStack, hero, world);

	foreground(ctxStack, ctx => ctx.restore());
}

function renderHeroCharacter(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	const Hero = world.settings.Hero;
	const ctx = ctxStack.canvas;

	const player = world.players.get(hero.id);
	let color = heroColor(hero.id, world);
	if (!(world.activePlayers.has(hero.id) || (player && player.isSharedBot))) {
		color = HeroColors.InactiveColor;
	}

	const angle = hero.body.getAngle();
	const radius = Hero.Radius;

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

		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(-1, 1);
		ctx.lineTo(0, 1);
		ctx.lineTo(0.5, 0);
		ctx.lineTo(0, -1);
		ctx.lineTo(-1, -1);
		ctx.closePath();
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
}

function renderHeroBars(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	const Hero = world.settings.Hero;
	const ctx = ctxStack.canvas;

	const radius = Hero.Radius;

	// Health bar
	const ticksUntilStart = Math.max(0, world.startTick - world.tick);
	if (!(ticksUntilStart <= constants.Matchmaking.JoinPeriod || hero.health < Hero.MaxHealth)) {
		return;
	}

	// Health
	{
		const healthProportion = hero.health / Hero.MaxHealth;
		const startProportion = Math.min(healthProportion, ticksUntilStart / constants.Matchmaking.JoinPeriod);

		let color = Color(rgColor(healthProportion));
		if (startProportion > 0) {
			color = color.lighten(0.75 + 0.25 * startProportion);
		}

		ctx.save();

		ctx.lineWidth = Pixel * 2;
		ctx.strokeStyle = '#111';
		ctx.fillStyle = '#111';
		ctx.beginPath();
		healthBarPath(ctx, radius, 1.0, world);
		ctx.fill();

		ctx.fillStyle = color.string();
		ctx.beginPath();
		healthBarPath(ctx, radius, healthProportion, world);
		ctx.fill();

		ctx.restore();
	}

	// Dash
	if (hero.id === world.ui.myHeroId) {
		const spellId = hero.keysToSpells.get(w.Actions.RightClick);	
		const spell = world.settings.Spells[spellId];	
		if (!spell) {	
			return;	
		}	
		const proportion = engine.cooldownRemaining(world, hero, spellId) / spell.cooldown;

		if (proportion > 0) {
			ctx.save();

			ctx.fillStyle = "black";
			ctx.strokeStyle = "black";
			ctx.lineWidth = Pixel;
			ctx.beginPath();
			dashBarPath(ctx, radius, 1.0, world);
			ctx.stroke();
			ctx.fill();

			ctx.fillStyle = DashIndicator.Color;
			ctx.beginPath();
			dashBarPath(ctx, radius, proportion, world);
			ctx.fill();

			ctx.restore();
		}
	}
}

function renderShield(ctxStack: CanvasCtxStack, shield: w.Shield, world: w.World) {
	const MaxAlpha = 0.75;
	const MinAlpha = 0.10;

	const ticksRemaining = shield.expireTick - world.tick;
	const maxTicks = shield.expireTick - shield.createTick;
	const proportion = 1.0 * ticksRemaining / maxTicks;

	let color = shield.color;
	if (shield.hitTick >= 0) {
		const hitAge = world.tick - shield.hitTick;
		if (hitAge < HeroColors.HitFlashTicks) {
			color = Color(color).lighten(HeroColors.HitGlowFactor * (1 - hitAge / HeroColors.HitFlashTicks)).string();
		}
	}

	foreground(ctxStack, ctx => ctx.save());

	let body: pl.Body;
	if (shield.type === "reflect") {
		const hero = world.objects.get(shield.owner);
		if (!hero) {
			return;
		}
		body = hero.body;
	} else if (shield.type === "wall") {
		body = shield.body;
	} else {
		return;
	}
	const pos = body.getPosition();
	foreground(ctxStack, ctx => ctx.translate(pos.x, pos.y));
	foreground(ctxStack, ctx => ctx.rotate(body.getAngle()));

	foreground(ctxStack, ctx => {
		if (world.tick - shield.createTick < shield.growthTicks) {
			const growthProportion = (world.tick - shield.createTick) / shield.growthTicks;
			ctx.scale(growthProportion, growthProportion);
		}

		ctx.globalAlpha = (MaxAlpha - MinAlpha) * proportion + MinAlpha;
		ctx.fillStyle = color;
		ctx.lineWidth = Pixel * 3;

		ctx.beginPath();
		if (shield.type === "reflect") {
			ctx.arc(0, 0, shield.radius, 0, 2 * Math.PI);
		} else {
			ctx.beginPath();

			const points = shield.points;
			for (let i = 0; i < points.length; ++i) {
				const point = points[i % points.length];
				if (i === 0) {
					ctx.moveTo(point.x, point.y);
				}
				ctx.lineTo(point.x, point.y);
			}

			ctx.closePath();
			ctx.fill();
		}
		ctx.fill();
	});


	foreground(ctxStack, ctx => ctx.restore());
}

function heroColor(heroId: string, world: w.World) {
	const player = world.players.get(heroId);
	if (heroId === world.ui.myHeroId) {
		return HeroColors.MyHeroColor;
	} else {
		return player.uiColor;
	}
}

function healthBarPath(ctx: CanvasRenderingContext2D, radius: number, proportion: number, world: w.World) {
	barPath(ctx, radius, proportion, HealthBar.Margin, HealthBar.Height, world);
}

function dashBarPath(ctx: CanvasRenderingContext2D, radius: number, proportion: number, world: w.World) {
	barPath(ctx, radius, proportion, DashIndicator.Margin, DashIndicator.Height, world);
}

function barPath(ctx: CanvasRenderingContext2D, radius: number, proportion: number, margin: number, height: number, world: w.World) {
	const barRadius = HealthBar.HeroRadiusFraction * world.settings.Hero.Radius;
	ctx.rect(-barRadius, -radius - height - margin, barRadius * 2 * proportion, height);
}

function rgColor(proportion: number) {
	let hue = proportion * 120.0;
	return hsl(hue, 1.0, 0.5);
}

function renderGravity(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World) {
	if (!projectile.gravity) {
		return;
	}

	renderGravityAt(ctxStack, projectile.body.getPosition(), world.settings.Spells[projectile.type] as ProjectileSpell, world);
}

function renderGravityWell(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	if (!hero.gravity) {
		return;
	}

	renderGravityAt(ctxStack, hero.gravity.location, world.settings.Spells[hero.gravity.spellId] as ProjectileSpell, world);
}

function renderGravityAt(ctxStack: CanvasCtxStack, location: pl.Vec2, spell: ProjectileSpell, world: w.World) {
	const animationLength = 0.33 * constants.TicksPerSecond;
	const numParticles = 3;

	const angleOffset = (2 * Math.PI) * (world.tick % animationLength) / animationLength;
	for (let i = 0; i < numParticles; ++i) {
		const angle = angleOffset + (2 * Math.PI) * i / numParticles;
		world.ui.trails.push({
			type: "circle",
			pos: vector.plus(location, vector.multiply(vector.fromAngle(angle), spell.projectile.radius)),
			radius: spell.projectile.radius / numParticles,
			initialTick: world.tick,
			max: spell.projectile.trailTicks, 
			fillStyle: spell.projectile.color,
		});
	}
}

function renderSupernova(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World) {
	if (!projectile.detonate) {
		return;
	}

	if (projectile.destroyed) {
		world.ui.trails.push({
			type: "circle",
			max: 30,
			initialTick: world.tick,
			pos: vector.clone(projectile.body.getPosition()),
			fillStyle: 'white',
			radius: projectile.detonate.radius,
		});
	} else if (world.tick < projectile.detonate.detonateTick) {
		renderRay(ctxStack, projectile, world, false);
	} else {
		const pos = projectile.body.getPosition();
		const proportion = 1.0 - (world.tick - projectile.detonate.detonateTick) / projectile.detonate.waitTicks;

		const animationLength = 11;
		const numSegments = 5;
		const arcFraction = 0.5;

		const angleOffset = ((world.tick % animationLength) / animationLength) * 2 * Math.PI;
		const arcAngle = arcFraction * 2 * Math.PI / numSegments;

		foreground(ctxStack, ctx => {
			ctx.save();

			ctx.strokeStyle = projectile.color;
			ctx.lineWidth = 3 * Pixel;

			const perSegment = 2 * Math.PI / numSegments;
			for (let i = 0; i < numSegments; ++i) {
				const startAngle = angleOffset + i * perSegment;
				const endAngle = startAngle + arcAngle;
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, projectile.detonate.radius * proportion, startAngle, endAngle);
				ctx.stroke();
			}

			ctx.restore();
		});
	}
}

function renderLink(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World) {
	if (!projectile.link) {
		return;
	}

	let owner: w.WorldObject = world.objects.get(projectile.owner);
	renderProjectile(ctxStack, projectile, world);

	if (owner && owner.category == "hero") {
		renderLinkBetween(ctxStack, owner, projectile, projectile.color);
	}
}

function renderLinkBetween(ctxStack: CanvasCtxStack, owner: w.Hero, target: w.WorldObject, color: string) {
	foreground(ctxStack, ctx => {
		ctx.lineWidth = Pixel * 5;
		ctx.strokeStyle = color;

		const from = owner.body.getPosition();
		const to = target.body.getPosition();
		ctx.beginPath();
		ctx.moveTo(from.x, from.y);
		ctx.lineTo(to.x, to.y);
		ctx.stroke();
	});
}

function renderRay(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, intermediatePoints: boolean = false) {
	let previous: pl.Vec2 = null;
	for (let pos of getRenderPoints(projectile.uiPath, intermediatePoints)) {
		if (previous) {
			world.ui.trails.push({
				type: 'line',
				initialTick: world.tick,
				max: projectile.trailTicks, 
				from: previous,
				to: pos,
				fillStyle: projectileColor(projectile, world),
				width: projectile.radius * 2,
			} as w.LineTrail);
		}

		previous = pos;
	}
}

function getRenderPoints(path: pl.Vec2[], intermediatePoints: boolean) {
	if (intermediatePoints) {
		return path;
	} else {
		if (path.length <= 2) {
			return path;
		} else {
			return [path[0], path[path.length - 1]];
		}
	}
}

function renderProjectile(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World) {
	world.ui.trails.push({
		type: 'circle',
		initialTick: world.tick,
		max: projectile.trailTicks, 
		pos: vector.clone(projectile.body.getPosition()),
		fillStyle: projectileColor(projectile, world),
		radius: projectile.radius,
	} as w.CircleTrail);
}

function projectileColor(projectile: w.Projectile, world: w.World) {
	let color = projectile.color;
	if (projectile.selfColor && projectile.owner === world.ui.myHeroId) {
		color = HeroColors.MyHeroColor;
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

		if (ctx === ctxStack.glows) {
			ctx.globalAlpha = proportion;
		}
		ctx.fillStyle = trail.fillStyle;
		ctx.strokeStyle = trail.fillStyle;

		if (trail.type === "circle") {
			ctx.beginPath();
			ctx.arc(trail.pos.x, trail.pos.y, proportion * trail.radius, 0, 2 * Math.PI);
			ctx.fill();
		} else if (trail.type === "line") {
			if (isEdge) {
				// Edge doesn't render lines if they are shorter than the line width, so render them ourselves.
				const axis = vector.diff(trail.to, trail.from);
				const cross = vector.relengthen(vector.rotateRight(axis), proportion * trail.width / 2);

				ctx.beginPath();
				ctx.moveTo(trail.from.x + cross.x, trail.from.y + cross.y);
				ctx.lineTo(trail.to.x + cross.x, trail.to.y + cross.y);
				ctx.lineTo(trail.to.x - cross.x, trail.to.y - cross.y);
				ctx.lineTo(trail.from.x - cross.x, trail.from.y - cross.y);
				ctx.closePath();
				ctx.fill();
			} else {
				ctx.lineWidth = proportion * trail.width;
				ctx.beginPath();
				ctx.moveTo(trail.from.x, trail.from.y);
				ctx.lineTo(trail.to.x, trail.to.y);
				ctx.stroke();
			}
		}

		ctx.restore();
	});

	return false;
}

function renderInterface(ctx: CanvasRenderingContext2D, world: w.World, rect: ClientRect, rebindings: KeyBindings) {
	const myHero = world.objects.get(world.ui.myHeroId) as w.Hero;
	if (myHero) {
		renderButtons(ctx, rect, world, myHero, rebindings);
	} else {
		ctx.clearRect(0, 0, rect.width, rect.height);
	}
}

export function whichKeyClicked(pos: pl.Vec2, config: w.ButtonConfig): string {
	if (!config) {
		// Buttons not drawn yet
		return null;
	}

	const region = config.region;
	if (!(region.left <= pos.x && pos.x < region.right && region.top <= pos.y && pos.y < region.bottom)) {
		return null;
	}

	let key: string = null;
	if (config.view === "bar") {
		const offset = pl.Vec2((pos.x - region.left) / config.scaleFactor, (pos.y - region.top) / config.scaleFactor);
		config.hitBoxes.forEach((hitBox, candidateKey) => {
			if (hitBox.left <= offset.x && offset.x < hitBox.right && hitBox.top <= offset.y && offset.y < hitBox.bottom) {
				key = candidateKey;
			}
		});
	} else if (config.view === "wheel") {
		const offset = pl.Vec2(pos.x - config.center.x, pos.y - config.center.y);
		const radius = vector.length(offset);

		if (config.innerRadius <= radius && radius < config.outerRadius) {
			const angle = vector.angle(offset);
			config.hitSectors.forEach((hitSector, candidateKey) => {
				const arcWidth = hitSector.endAngle - hitSector.startAngle;
				const delta = vector.angleDelta(hitSector.startAngle, angle);
				if (0 <= delta && delta < arcWidth) {
					key = candidateKey;
				}
			});
		} else if (radius <= config.innerRadius) {
			config.hitSectors.forEach((hitSector, candidateKey) => {
				if (hitSector.startAngle && hitSector.endAngle) {
					key = candidateKey;
				}
			});
		}
	}

	return key;
}

export function touchControls(config: w.ButtonConfig): boolean {
	if (!config) {
		// Buttons not drawn yet
		return false;
	}

	if (config.view === "wheel") {
		return true;
	} else {
		return false;
	}
}

function renderButtons(ctx: CanvasRenderingContext2D, rect: ClientRect, world: w.World, hero: w.Hero, rebindings: KeyBindings) {
	const selectedAction = hero.casting && hero.casting.action && hero.casting.action.type;
	const keys = world.settings.Choices.Keys;

	if (!world.ui.buttonBar) {
		world.ui.buttonBar = calculateButtonLayout(keys, rect);
	}

	const config = world.ui.buttonBar;
	if (config.view === "bar") {
		renderButtonBar(ctx, config, keys, hero, selectedAction, world, rebindings);
	} else if (config.view === "wheel") {
		renderButtonWheel(ctx, config, keys, hero, selectedAction, world, rebindings);
		// renderTargetSurface(ctx, config, selectedAction, world);
	}
}

function calculateButtonLayout(keys: KeyConfig[], rect: ClientRect): w.ButtonConfig {
	if (isMobile) {
		return calculateButtonWheelLayout(keys, rect);
	} else {
		return calculateButtonBarLayout(keys, rect);
	}
}

function renderButtonBar(ctx: CanvasRenderingContext2D, config: w.ButtonBarConfig, keys: KeyConfig[], hero: w.Hero, selectedAction: string, world: w.World, rebindings: KeyBindings) {
	ctx.save();
	ctx.translate(config.region.left, config.region.top);
	ctx.scale(config.scaleFactor, config.scaleFactor);

	for (let i = 0; i < keys.length; ++i) {
		const key = keys[i];
		if (!key) {
			continue;
		}

		const newState = calculateButtonState(key.btn, hero, selectedAction, world, rebindings);
		const currentState = config.buttons.get(key.btn);

		if (buttonStateChanged(currentState, newState)) {
			const buttonRegion = config.hitBoxes.get(key.btn);
			if (buttonRegion) {
				config.buttons.set(key.btn, newState);

				ctx.save();
				ctx.translate(buttonRegion.left, buttonRegion.top);
				renderBarButton(ctx, buttonRegion, newState);
				ctx.restore();
			}
		}
	}
	ctx.restore();
}

function renderButtonWheel(ctx: CanvasRenderingContext2D, config: w.ButtonWheelConfig, keys: KeyConfig[], hero: w.Hero, selectedAction: string, world: w.World, rebindings: KeyBindings) {
	ctx.save();
	ctx.translate(config.center.x, config.center.y);

	/*
	const rightClick: KeyConfig = { btn: w.Actions.RightClick };
	keys = [...keys, rightClick];
	*/

	for (let i = 0; i < keys.length; ++i) {
		const key = keys[i];
		if (!key) {
			continue;
		}

		const newState = calculateButtonState(key.btn, hero, selectedAction, world, rebindings);
		const currentState = config.buttons.get(key.btn);

		if (buttonStateChanged(currentState, newState)) {
			const buttonSector = config.hitSectors.get(key.btn);
			if (buttonSector) {
				config.buttons.set(key.btn, newState);

				ctx.save();
				renderWheelButton(ctx, buttonSector, config.innerRadius, config.outerRadius, newState);
				ctx.restore();
			}
		}
	}
	ctx.restore();
}

function renderTargetSurface(ctx: CanvasRenderingContext2D, config: w.ButtonWheelConfig, selectedAction: string, world: w.World) {
	ctx.save();
	ctx.translate(config.targetSurfaceCenter.x, config.targetSurfaceCenter.y);

	ctx.lineWidth = 3;
	ctx.strokeStyle = world.ui.nextSpellId ? "#cccccc" : "#888888";

	ctx.beginPath();
	ctx.arc(0, 0, config.outerRadius, 0, 2 * Math.PI);
	ctx.stroke();

	ctx.restore();
}

function calculateButtonBarLayout(keys: KeyConfig[], rect: ClientRect): w.ButtonBarConfig {
	const hitBoxes = new Map<string, ClientRect>();
	let nextOffset = 0;
	keys.forEach(key => {
		if (nextOffset > 0) {
			nextOffset += ButtonBar.Spacing;
		}

		if (key) {
			const offset = nextOffset;
			const size = key.primary ? ButtonBar.Size : ButtonBar.SecondaryButtonSize;

			const left = offset;
			const top = ButtonBar.Size - size;
			const width = size;
			const height = size;
			const right = left + width;
			const bottom = top + height;
			hitBoxes.set(key.btn, { left, top, right, bottom, width, height });

			nextOffset += size;
		} else {
			nextOffset += ButtonBar.Gap;
		}
	});

	const scaleFactor = calculateButtonScaleFactor(rect, nextOffset);
	const region = calculateButtonBarRegion(rect, nextOffset, scaleFactor);

	return {
		view: "bar",
		hitBoxes,
		region,
		scaleFactor,
		buttons: new Map<string, w.ButtonRenderState>(),
	};
}

function calculateButtonScaleFactor(rect: ClientRect, totalSize: number): number {
	const availableSize = rect.width;
	if (availableSize <= 0) {
		return 1.0; // Stop division by zero errors
	} else if (totalSize <= availableSize) {
		return 1.0;
	} else {
		return availableSize / totalSize;
	}
}

function calculateButtonBarRegion(rect: ClientRect, totalSize: number, scaleFactor: number): ClientRect {
	const axisSize = totalSize * scaleFactor;
	const crossSize = ButtonBar.Size * scaleFactor;

	const height = crossSize;
	const width = axisSize;

	const left = rect.width / 2.0 - width / 2.0;
	const top = rect.height - crossSize - ButtonBar.Margin;

	const right = left + width;
	const bottom = top + height;
	return { left, top, right, bottom, width, height };
}

function calculateButtonWheelLayout(keys: KeyConfig[], rect: ClientRect): w.ButtonWheelConfig {
	const WheelAngleOffset = Math.PI / 2;

	const hitSectors = new Map<string, w.HitSector>();

	const arcWidth = 2 * Math.PI / keys.filter(k => !!k).length;
	let nextAngle = WheelAngleOffset + arcWidth / 2;
	keys.forEach(key => {
		if (key) {
			const startAngle = nextAngle;
			const endAngle = startAngle + arcWidth;

			hitSectors.set(key.btn, { startAngle, endAngle });

			nextAngle += arcWidth;
		}
	});
	hitSectors.set(w.Actions.RightClick, { startAngle: null, endAngle: null });

	const region = calculateButtonWheelRegion(rect);
	const outerRadius = Math.min(region.width, region.height) / 2.0;
	const innerRadius = outerRadius / 2.5;
	const center = pl.Vec2((region.left + region.right) / 2, (region.top + region.bottom) / 2);

	const targetSurfaceCenter = pl.Vec2(rect.right - (center.x - rect.left), center.y); // Mirror the wheel on the right

	return {
		view: "wheel",
		hitSectors,
		region,
		center,
		outerRadius,
		innerRadius,
		targetSurfaceCenter,
		buttons: new Map<string, w.ButtonRenderState>(),
	};
}

function calculateButtonWheelRegion(rect: ClientRect): ClientRect {
	const maxSize = ButtonBar.Size * 3;

	let size = Math.min(
		(rect.width - ButtonBar.Margin) / 2, // Half width
		(rect.height - ButtonBar.Margin * 2)); // Or whole height
	size = Math.max(0, Math.min(maxSize, size));

	const left = ButtonBar.Margin;
	const bottom = rect.bottom - ButtonBar.Margin;
	const right = left + size;
	const top = bottom - size;
	const width = size;
	const height = size;

	return { left, top, right, bottom, width, height };
}

function buttonStateChanged(previous: w.ButtonRenderState, current: w.ButtonRenderState) {
	if (!previous && !current) {
		return false;
	} else if (!previous && current || previous && !current) {
		return true;
	} else {
		return previous.key !== current.key
			|| previous.color !== current.color
			|| previous.icon !== current.icon
			|| previous.cooldownText !== current.cooldownText;
	}
}

function calculateButtonState(key: string, hero: w.Hero, selectedAction: string, world: w.World, rebindings: KeyBindings): w.ButtonRenderState {
	if (!key) { return null; }

	const spellId = hero.keysToSpells.get(key);
	if (!spellId) { return null; }

	const spell = (world.settings.Spells as Spells)[spellId];
	if (!spell) { return null; }

	const rebindingLookup = keyboardUtils.getRebindingLookup(rebindings);
	let button: w.ButtonRenderState = {
		key: rebindingLookup.get(key) || "",
		color: spell.color,
		icon: spell.icon,
		cooldownText: null,
	};

	let isSelected = selectedAction === spell.id || world.ui.nextSpellId === spell.id;
	let isHovered = world.ui.hoverSpellId === spell.id;
	let remainingInSeconds = engine.cooldownRemaining(world, hero, spell.id) / constants.TicksPerSecond;

	if (isSelected) {
		button.color = '#f0f0f0';
	} else if (remainingInSeconds > 0) {
		button.color = '#444444';
	}

	if (isHovered) {
		button.color = Color(button.color).lighten(0.25).string();
	} 

	if (remainingInSeconds > 0) {
		// Cooldown
		let cooldownText = remainingInSeconds > 1 ? remainingInSeconds.toFixed(0) : remainingInSeconds.toFixed(1);
		button.cooldownText = cooldownText;
	}

	return button;
}

function renderBarButton(ctx: CanvasRenderingContext2D, buttonRegion: ClientRect, buttonState: w.ButtonRenderState) {
	const size = buttonRegion.width; // assume square
	if (buttonState) {
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		
		let color = buttonState.color;
		renderIconButton(ctx, buttonState.icon && Icons[buttonState.icon], color, 0.6, size);

		if (buttonState.cooldownText) {
			// Cooldown
			let cooldownText = buttonState.cooldownText

			ctx.font = 'bold ' + (size * 0.75 - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, cooldownText, size / 2, size / 2);
		} else {
			const key = buttonState.key;
			if (key && !keyboardUtils.isRightClick(key)) {
				// Keyboard shortcut
				ctx.save();

				ctx.font = 'bold ' + (size / 2 - 1) + 'px sans-serif';

				renderTextWithShadow(ctx, key.toUpperCase(), size / 4, size * 3 / 4);

				ctx.restore();
			}
		}


		ctx.restore();
	} else {
		ctx.clearRect(0, 0, size, size);
	}
}

function renderWheelButton(ctx: CanvasRenderingContext2D, sector: w.HitSector, innerRadius: number, outerRadius: number, buttonState: w.ButtonRenderState) {
	ctx.save();

	// Render button
	ctx.fillStyle = buttonState.color;

	ctx.beginPath();
	if (sector.startAngle && sector.endAngle) {
		ctx.arc(0, 0, outerRadius, sector.startAngle, sector.endAngle, false);
		ctx.arc(0, 0, innerRadius, sector.endAngle, sector.startAngle, true);
	} else {
		ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI)
	}
	ctx.closePath();
	ctx.fill();

	ctx.clip(); // Clip icon inside button

	{
		ctx.save();

		// Translate to center of button
		if (sector.startAngle && sector.endAngle) {
			const midVector = vector.multiply(
				vector.fromAngle((sector.startAngle + sector.endAngle) / 2),
				(innerRadius + outerRadius) / 2);
			ctx.translate(midVector.x, midVector.y);
		}

		const size = outerRadius - innerRadius;

		// Render icon
		{
			ctx.save();

			ctx.translate(-size / 2, -size / 2); // Translate to top-left of button
			renderIconOnly(ctx, buttonState.icon && Icons[buttonState.icon], 0.6, size);
			
			ctx.restore();
		}

		// Cooldown
		let cooldownText = buttonState.cooldownText
		if (cooldownText) {
			ctx.save();

			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = 'bold ' + (size * 0.75 - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, cooldownText, 0, 0);

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