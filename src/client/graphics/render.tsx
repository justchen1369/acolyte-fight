import Color from 'color';
import * as pl from 'planck-js';
import * as audio from '../core/audio';
import * as constants from '../../game/constants';
import * as engine from '../../game/engine';
import * as glx from './glx';
import * as keyboardUtils from '../core/keyboardUtils';
import * as icons from '../core/icons';
import * as r from './render.model';
import * as vector from '../../game/vector';
import * as w from '../../game/world.model';

import { Alliances, ButtonBar, ChargingIndicator, DashIndicator, HealthBar, HeroColors, Pixel } from '../../game/constants';
import { CanvasStack, CanvasCtxStack, RenderOptions } from './render.model';
import { parseColor } from './colorParser';
import { renderIconOnly } from './renderIcon';
import { isMobile, isEdge } from '../core/userAgent';

export { CanvasStack, RenderOptions, GraphicsLevel } from './render.model';

const MaxDestroyedTicks = constants.TicksPerSecond;

interface SwirlContext {
	color?: string;
	baseVelocity?: pl.Vec2;
	tag?: string;
	multiplier?: number;
}

// Rendering
export function resetRenderState(world: w.World) {
	world.ui.renderedTick = null;
	world.ui.buttonBar = null;
}

export function worldPointFromInterfacePoint(interfacePoint: pl.Vec2, rect: ClientRect, wheelOnRight: boolean) {
	const viewRect = calculateViewRects(rect, wheelOnRight);
	const worldPoint = worldPointFromViewRect(interfacePoint, viewRect);
	return worldPoint;
}

export function worldPointFromViewRect(interfacePoint: pl.Vec2, viewRect: ClientRect) {
	const worldRect = calculateWorldRect(viewRect);
	const worldPoint = pl.Vec2((interfacePoint.x - worldRect.left) / worldRect.width, (interfacePoint.y - worldRect.top) / worldRect.height);
	return worldPoint;
}

function calculateViewRects(rect: ClientRect, wheelOnRight: boolean): ClientRect {
	if (isMobile) {
		if (rect.height >= rect.width) {
			// Portrait
			return {
				left: 0,
				right: rect.width,
				width: rect.width,
				top: 0,
				bottom: rect.height,
				height: rect.height,
			};
		} else {
			// Landscape - move map out of wheel space
			const wheelSize = calculateButtonWheelSize(rect);
			const width = Math.max(rect.height, rect.width - wheelSize);
			if (wheelOnRight) {
				return {
					left: 0,
					right: width,
					width: width,
					top: 0,
					bottom: rect.height,
					height: rect.height,
				};
			} else {
				return {
					left: rect.width - width,
					right: rect.width,
					width: width,
					top: 0,
					bottom: rect.height,
					height: rect.height,
				};
			}
		}
	} else {
		return {
			left: 0,
			right: rect.width,
			width: rect.width,
			top: 0,
			bottom: rect.height,
			height: rect.height,
		};
	}
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

export function render(world: w.World, canvasStack: CanvasStack, options: RenderOptions) {
	const rect = canvasStack.ui.getBoundingClientRect();
	const viewRect = calculateViewRects(rect, options.wheelOnRight);
	const worldRect = calculateWorldRect(viewRect);
	const pixel = 1 / Math.max(1, Math.min(canvasStack.gl.width, canvasStack.gl.height));

	const ctxStack: CanvasCtxStack = {
		gl: canvasStack.gl.getContext('webgl', { alpha: false }),
		ui: canvasStack.ui.getContext('2d', { alpha: true }),
		rtx: options.rtx,
		pixel,
		data: glx.initData(),
	};
	if (!(ctxStack.gl && ctxStack.ui)) {
		throw "Error getting context";
	}

	glx.initGl(ctxStack);

	renderWorld(ctxStack, world, worldRect, options);
	renderCursor(ctxStack, world);
	renderInterface(ctxStack.ui, world, rect, options);

	glx.renderGl(ctxStack, worldRect, rect);

	playSounds(world, options);

	world.ui.destroyed = [];
	world.ui.events = [];
	world.ui.sounds = [];

	world.ui.renderedTick = world.tick;
}

function playSounds(world: w.World, options: RenderOptions) {
	if (options.mute
		|| world.tick <= world.ui.playedTick // Already played this tick
		|| (world.tick - world.ui.playedTick) > MaxDestroyedTicks) { // We've lagged or entered a game late, don't replay all the sounds because it just causes WebAudio to hang

		// Play nothing
	} else {
		const hero = world.objects.get(world.ui.myHeroId);
		const self = hero ? hero.body.getPosition() : pl.Vec2(0.5, 0.5);
		audio.play(self, world.ui.sounds, world.settings.Sounds);
	}

	world.ui.playedTick = world.tick; // Always update this so if user unmutes they don't classified as get sound lag
}

function renderWorld(ctxStack: CanvasCtxStack, world: w.World, worldRect: ClientRect, options: RenderOptions) {
	renderMap(ctxStack, world);

	if (options.targetingIndicator) {
		renderTargetingIndicator(ctxStack, world);
	}

	world.objects.forEach(obj => renderObject(ctxStack, obj, world, options));
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
}

function renderCursor(ctxStack: CanvasCtxStack, world: w.World) {
	const CrossHairSize = world.settings.Hero.Radius;

	if (!isMobile) {
		return;
	}

	const target = world.ui.nextTarget;
	if (!target) {
		return;
	}

	const fill: r.Fill = {
		color: parseColor("#fff"),
		maxRadius: 1 * ctxStack.pixel,
	};
	glx.line(ctxStack, pl.Vec2(target.x, target.y - CrossHairSize), pl.Vec2(target.x, target.y + CrossHairSize), fill);
	glx.line(ctxStack, pl.Vec2(target.x - CrossHairSize, target.y), pl.Vec2(target.x + CrossHairSize, target.y), fill);
}

function renderObject(ctxStack: CanvasCtxStack, obj: w.WorldObject, world: w.World, options: RenderOptions) {
	if (obj.category === "hero") {
		renderHero(ctxStack, obj, world);
		if (obj.gravity) {
			renderGravityWell(ctxStack, obj, world);
		}
		if (obj.link) {
			const target = world.objects.get(obj.link.targetId);
			if (target && obj.link.render) {
				renderLinkBetween(ctxStack, obj, target, obj.link.render);
			}
		}
	} else if (obj.category === "shield") {
		renderShield(ctxStack, obj, world);
		playShieldSounds(obj, world);
	} else if (obj.category === "projectile") {
		renderSpell(ctxStack, obj, world);
		playSpellSounds(obj, world);
	} else if (obj.category === "obstacle") {
		renderObstacle(ctxStack, obj, world, options);
	}
}

function renderDestroyed(ctxStack: CanvasCtxStack, obj: w.WorldObject, world: w.World) {
	if (world.tick - obj.destroyedTick >= MaxDestroyedTicks) {
		// Don't render, too old
	} else if (obj.category === "hero") {
		renderHeroDeath(ctxStack, obj, world);
	} else if (obj.category === "projectile") {
		renderSpell(ctxStack, obj, world);
		playSpellSounds(obj, world);
	} else if (obj.category === "obstacle") {
		renderObstacleDestroyed(ctxStack, obj, world);
	}
}

function renderHeroDeath(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	const NumParticles = 10;
	const MaxTicks = 30;
	const Speed = 0.1;

	const pos = vector.clone(hero.body.getPosition());

	for (let i = 0; i < NumParticles; ++i) {
		const baseVelocity = particleVelocity(hero.body.getLinearVelocity());
		const expireVelocity = vector.multiply(vector.fromAngle(Math.random() * 2 * Math.PI), Math.random() * Speed);
		const velocity = vector.plus(baseVelocity, expireVelocity);

		pushTrail({
			type: "circle",
			max: MaxTicks,
			initialTick: world.tick,
			pos,
			velocity,
			fillStyle: "white",
			radius: hero.radius,
			glow: 0.1,
		}, world);
	}

	world.ui.sounds.push({
		id: `${hero.id}-death`,
		sound: 'death',
		pos,
	});
}

function renderObstacleDestroyed(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, world: w.World) {
	const ticks = 15;
	pushTrail({
		type: "circle",
		max: ticks,
		initialTick: world.tick,
		pos: obstacle.body.getPosition(),
		fillStyle: 'white',
		radius: obstacle.extent,
	}, world);
}

function renderSpell(ctxStack: CanvasCtxStack, obj: w.Projectile, world: w.World) {
	obj.uiPath.push(vector.clone(obj.body.getPosition()));

	obj.renderers.forEach(render => {
		if (render.type === "projectile") {
			renderProjectile(ctxStack, obj, world, render);
		} else if (render.type == "ray") {
			renderRay(ctxStack, obj, world, render);
		} else if (render.type === "link") {
			renderLink(ctxStack, obj, world, render);
		} else if (render.type === "swirl") {
			renderSwirl(ctxStack, obj, world, render);
		} else if (render.type === "reticule") {
			renderReticule(ctxStack, obj, world, render);
		} else if (render.type === "strike") {
			renderStrike(ctxStack, obj, world, render);
		}
	});

	while (obj.uiPath.length > 1) {
		obj.uiPath.shift();
	}
}

function playSpellSounds(obj: w.Projectile, world: w.World) {
	if (obj.sound) {
		world.ui.sounds.push({
			id: obj.id,
			sound: obj.sound,
			pos: vector.clone(obj.body.getPosition()),
		});
	}

	const hitSound = obj.soundHit || obj.sound;
	if (hitSound && obj.hit) {
		world.ui.sounds.push({
			id: `${obj.id}-hit-${obj.hit}`, // Each hit has a unique ID
			sound: `${hitSound}-hit`,
			pos: vector.clone(obj.body.getPosition()),
		});
	}
}

function renderLifeStealReturn(ctxStack: CanvasCtxStack, ev: w.LifeStealEvent, world: w.World) {
	const MaxTicks = 15;

	if (world.tick >= ev.tick + MaxTicks) {
		return; // Too late
	}

	let owner = world.objects.get(ev.owner);
	if (!owner) {
		return;
	}

	const pos = owner.body.getPosition();

	pushTrail({
		type: 'ripple',
		initialTick: ev.tick,
		max: MaxTicks,
		pos: vector.clone(pos),
		fillStyle: HeroColors.HealColor,
		initialRadius: world.settings.Hero.Radius,
		finalRadius: world.settings.Hero.Radius * 2,
	}, world);
}

function renderEvent(ctxStack: CanvasCtxStack, ev: w.WorldEvent, world: w.World) {
	if (ev.type === "detonate") {
		renderDetonate(ctxStack, ev, world);
	} else if (ev.type === "lifeSteal") {
		renderLifeStealReturn(ctxStack, ev, world);
	} else if (ev.type === "teleport") {
		renderTeleport(ctxStack, ev, world);
	} else if (ev.type === "push") {
		renderPush(ctxStack, ev, world);
	} else if (ev.type === "vanish") {
		renderVanish(ctxStack, ev, world);
	} else {
		return;
	}
}

function renderDetonate(ctxStack: CanvasCtxStack, ev: w.DetonateEvent, world: w.World) {
	if (world.tick >= ev.tick + ev.explosionTicks) {
		return; // Too late
	}

	pushTrail({
		type: "circle",
		max: ev.explosionTicks,
		initialTick: ev.tick,
		pos: ev.pos,
		fillStyle: 'white',
		radius: ev.radius,
		glow: 0.2,
	}, world);

	if (ev.sound) {
		world.ui.sounds.push({
			id: `${ev.sourceId}-detonating`,
			sound: `${ev.sound}-detonating`,
			pos: ev.pos,
		});
	}
}

function renderVanish(ctxStack: CanvasCtxStack, ev: w.VanishEvent, world: w.World) {
	const NumParticles = 10;

	const hero = world.objects.get(ev.heroId);
	if (hero && hero.category === "hero" && (world.tick - ev.tick) < constants.TicksPerSecond) {
		const pos = ev.appear ? vector.clone(hero.body.getPosition()) : ev.pos; // when disappearing, don't reveal the current location if we're a few frames behind
		for (let i = 0; i < NumParticles; ++i) {
			renderVanishSmoke(ctxStack, hero, world, ev.pos);
		}
	}
}

function renderVanishSmoke(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World, pos?: pl.Vec2) {
	const thrust = vector.multiply(vector.fromAngle(hero.body.getAngle()), -hero.moveSpeedPerSecond);
	const velocity = particleVelocity(thrust);

	pushTrail({
		type: 'circle',
		initialTick: world.tick,
		max: 60,
		pos: pos || vector.clone(hero.body.getPosition()),
		fillStyle: "#111",
		radius: hero.radius,
		velocity,
	}, world);
}

function renderTeleport(ctxStack: CanvasCtxStack, ev: w.TeleportEvent, world: w.World) {
	const Hero = world.settings.Hero;
	const MaxTicks = 30;

	if (ev.fromPos) {
		renderJumpSmoke(ctxStack, ev.fromPos, world, ev.tick);
	}

	if (ev.toPos) {
		renderJumpSmoke(ctxStack, ev.toPos, world, ev.tick);

		if (ev.heroId === world.ui.myHeroId) {
			// Clearly indicate yourself
			pushTrail({
				type: "ripple",
				max: MaxTicks,
				initialTick: ev.tick,
				pos: ev.toPos,
				fillStyle: 'white',
				initialRadius: Hero.Radius,
				finalRadius: Hero.Radius * 4,
			}, world);
		}

		if (ev.sound) {
			world.ui.sounds.push({
				id: `${ev.heroId}-teleport-arriving`,
				sound: `${ev.sound}-arriving`,
				pos: ev.toPos,
			});
		}
	}
}

function renderJumpSmoke(ctxStack: CanvasCtxStack, pos: pl.Vec2, world: w.World, initialTick: number = world.tick) {
	const Hero = world.settings.Hero;
	const MaxTicks = 15;
	const NumParticles = 10;
	const MaxSpeed = 0.05;

	if (world.tick >= initialTick + MaxTicks) {
		return; // Too late
	}

	for (let i = 0; i < NumParticles; ++i) {
		world.ui.trails.unshift({ // Smoke at bottom
			type: "circle",
			pos,
			velocity: vector.multiply(vector.fromAngle(Math.random() * 2 * Math.PI), MaxSpeed * Math.random()),
			radius: Hero.Radius,
			initialTick: initialTick,
			max: MaxTicks,
			fillStyle: "#fff",
		});
	}
}

function renderPush(ctxStack: CanvasCtxStack, ev: w.PushEvent, world: w.World) {
	if (world.ui.myHeroId && !(ev.owner === world.ui.myHeroId)) {
		return;
	}

	const shake: w.Shake = {
		fromTick: ev.tick,
		maxTicks: HeroColors.ShakeTicks,
		direction: vector.relengthen(ev.direction, HeroColors.ShakeDistance),
	};
	if (world.tick < shake.fromTick + shake.maxTicks) {
		world.ui.shakes.push(shake);
	}

	const highlight: w.MapHighlight = {
		fromTick: ev.tick,
		maxTicks: HeroColors.ShakeTicks,
		color: ev.color || '#ffffff',
	};
	if (world.tick < highlight.fromTick + highlight.maxTicks) {
		world.ui.highlights.push(highlight);
	}
}

function renderMap(ctxStack: CanvasCtxStack, world: w.World) {
	const shake = takeShakes(world);
	const pos = pl.Vec2(0.5 + shake.x, 0.5 + shake.y);

	let scale = 1;
	let color: Color;
	if (world.winner) {
		const proportion = Math.max(0, 1 - (world.tick - (world.winTick || 0)) / HeroColors.WorldAnimateWinTicks);
		scale *= 1 + HeroColors.WorldWinGrowth * proportion;
		color = parseColor(heroColor(world.winner, world)).darken(0.5).lighten(proportion);
	} else {
		color = parseColor(HeroColors.WorldColor);

		const highlight = takeHighlights(world);
		if (highlight) {
			const proportion = Math.max(0, 1 - (world.tick - highlight.fromTick) / highlight.maxTicks);
			color = color.mix(Color(highlight.color), HeroColors.ShakeGlowFactor * proportion);
		}
	}

	const strokeStyle = color.lighten(0.3);
	const strokeProportion = 0.99;

	let radius = world.radius * world.mapRadiusMultiplier;

	const points = world.mapPoints;
	if (points) {
		glx.convex(ctxStack, pos, world.mapPoints, 0, radius * scale, {
			color: strokeStyle,
			maxRadius: scale * radius,
		});
		glx.convex(ctxStack, pos, world.mapPoints, 0, radius * scale * strokeProportion, {
			color,
			maxRadius: scale * radius,
		});
	} else {
		glx.circle(ctxStack, pos, {
			color: strokeStyle,
			maxRadius: scale * radius,
		});
		glx.circle(ctxStack, pos, {
			color,
			maxRadius: scale * radius * strokeProportion,
		});
	}
}

function takeShakes(world: w.World) {
	let offset = vector.zero();
	const keep = new Array<w.Shake>();
	world.ui.shakes.forEach(shake => {
		const proportion = Math.min(1, Math.max(0, 1 - (world.tick - shake.fromTick) / shake.maxTicks));
		if (proportion > 0) {
			keep.push(shake);

			const magnitude = Math.pow(proportion, 2) * Math.cos(5 * proportion * 2 * Math.PI);
			offset = vector.plus(offset, vector.multiply(shake.direction, magnitude));
		}
	});
	world.ui.shakes = keep;
	return offset;
}

function takeHighlights(world: w.World): w.MapHighlight {
	if (world.ui.highlights.length === 0) {
		return null;
	}

	const highlight = world.ui.highlights[world.ui.highlights.length - 1];
	if (world.tick < highlight.fromTick + highlight.maxTicks) {
		world.ui.highlights = [highlight];
		return highlight;
	} else {
		world.ui.highlights = [];
		return null;
	}
}

function renderObstacle(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, world: w.World, options: RenderOptions) {
	if (obstacle.destroyedTick) {
		return;
	}

	const body = obstacle.body;
	const pos = body.getPosition();

	const proportion = obstacle.health / obstacle.maxHealth;

	const hitAge = obstacle.damagedTick ? world.tick - obstacle.damagedTick : Infinity;
	const flash = Math.max(0, (1 - hitAge / HeroColors.ObstacleFlashTicks));

	let color = parseColor(hsl(0, 1.0 - proportion, 0.5));
	if (flash > 0) {
		color = color.lighten(flash);
	}


	let scale = 1;
	if (world.tick - obstacle.createTick < obstacle.growthTicks) {
		// "Grow in" animation
		scale *= (world.tick - obstacle.createTick) / obstacle.growthTicks;
	}
	if (flash > 0) {
		// Hit animation
		scale *= 1 + HeroColors.ObstacleGrowFactor * flash;
	}

	const strokeStyle = color.lighten(0.6);
	const obstacleStrokeWidth = 5 * Pixel;
	const strokeProportion = 1 - Math.min(1, obstacleStrokeWidth / obstacle.extent);

	glx.convex(ctxStack, pos, obstacle.points, body.getAngle(), scale, {
		color: strokeStyle,
		maxRadius: scale * obstacle.extent,
	});
	glx.convex(ctxStack, pos, obstacle.points, body.getAngle(), scale * strokeProportion, {
		color,
		maxRadius: scale * obstacle.extent,
	});
}

function renderHero(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	if (hero.destroyedTick) {
		return;
	}

	renderRangeIndicator(ctxStack, hero, world);
	renderBuffs(ctxStack, hero, world); // Do this before applying translation

	const invisible = engine.isHeroInvisible(hero);
	if (invisible) {
		if (world.ui.myHeroId && (engine.calculateAlliance(hero.id, world.ui.myHeroId, world) & Alliances.Enemy) > 0) {
			// Enemy - render nothing
		} else {
			// Self or observer - render placeholder
			renderHeroInvisible(ctxStack, hero, invisible, world);
		}
	} else {
		renderHeroCharacter(ctxStack, hero, world);
		renderHeroBars(ctxStack, hero, world);
	}

	playHeroSounds(hero, world);
}

function renderTargetingIndicator(ctxStack: CanvasCtxStack, world: w.World) {
	const MaxAlpha = 0.5;
	const CrossWidth = 0.05;

	const hero = world.objects.get(world.ui.myHeroId);
	if (!(hero && hero.category === "hero")) {
		return;
	}

	const pos = hero.body.getPosition();
	const target = world.ui.nextTarget;
	if (!(pos && target)) {
		return;
	}

	const diff = vector.diff(target, pos);
	const guideLength = 0.5;
	const guideDirection = vector.unit(diff);
	const proportion = Math.min(1, vector.length(diff) / guideLength);

	const radius = vector.length(diff);
	const angle = vector.angle(diff);
	const circumference = 2 * Math.PI * radius;
	const angularProportion = CrossWidth / circumference;
	const startAngle = angle - (Math.PI * angularProportion);
	const endAngle = angle + (Math.PI * angularProportion);

	const lineWidth = hero.radius / 2;

	const gradient: r.Gradient = {
		from: pos,
		fromColor: parseColor("#000").alpha(MaxAlpha * proportion),
		to: vector.plus(pos, vector.multiply(guideDirection, guideLength)),
		toColor: parseColor("#000").alpha(0),
	};

	// Render cross
	glx.arc(ctxStack, pos, startAngle, endAngle, false, {
		gradient,
		minRadius: radius - lineWidth,
		maxRadius: radius,
	});

	// Render line to target
	glx.line(ctxStack, pos, vector.plus(pos, vector.multiply(guideDirection, guideLength)), {
		gradient,
		maxRadius: lineWidth / 2,
	});
}

function renderBuffs(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	hero.buffs.forEach(buff => {
		if (buff.render) {
			renderBuffSmoke(ctxStack, buff.render, buff, hero, world);
		}

		if (buff.sound) {
			world.ui.sounds.push({
				id: `buff-${buff.id}`,
				sound: `${buff.sound}`,
				pos: vector.clone(hero.body.getPosition()),
			});
		}
	});

	hero.uiDestroyedBuffs.forEach(buff => {
		if ((world.tick - buff.destroyedTick) >= MaxDestroyedTicks) {
			return;
		}

		if (buff.sound) {
			world.ui.sounds.push({
				id: `buff-${buff.id}-expired`,
				sound: `${buff.sound}-expired`,
				pos: vector.clone(hero.body.getPosition()),
			});
		}
	});
	hero.uiDestroyedBuffs = [];
}

function renderBuffSmoke(ctxStack: CanvasCtxStack, render: RenderBuff, buff: w.Buff, hero: w.Hero, world: w.World) {
	let color = render.color;
	if (render.heroColor) {
		color = heroColor(hero.id, world);
	}

	let alpha = Math.min(1, buff.numStacks * (render.alpha !== undefined ? render.alpha : 1.0));

	let proportion = 1.0;
	if (render.decay) {
		const remainingTicks = Math.max(0, buff.expireTick - world.tick);
		proportion = remainingTicks / buff.maxTicks;
		alpha *= proportion;
	}

	if (alpha < 1) {
		color = parseColor(color).alpha(alpha).string();
	}

	const thrust = vector.multiply(vector.fromAngle(hero.body.getAngle()), -hero.moveSpeedPerSecond);
	const velocity = particleVelocity(thrust);

	let pos = vector.clone(hero.body.getPosition());
	if (render.emissionRadius) {
		pos = vector.plus(pos, vector.multiply(vector.fromAngle(Math.random() * 2 * Math.PI), render.emissionRadius));
	}

	// Buffs on the bottom
	world.ui.trails.unshift({
		type: "circle",
		pos,
		velocity,
		radius: render.particleRadius,
		initialTick: world.tick,
		max: render.ticks,
		fillStyle: color,
	});
}

function particleVelocity(primaryVelocity: pl.Vec2) {
	const direction = vector.fromAngle(2 * Math.PI * Math.random());
	const speed = Math.random() * vector.dot(direction, primaryVelocity); // can be negative
	const velocity = vector.multiply(direction, speed);
	return velocity;
}

function renderHeroCharacter(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	const pos = hero.body.getPosition();

	const player = world.players.get(hero.id);
	let color = heroColor(hero.id, world);
	if (!(world.activePlayers.has(hero.id) || (player && player.isSharedBot))) {
		color = HeroColors.InactiveColor;
	}


	const damageAge = hero.damagedTick ? world.tick - hero.damagedTick : Infinity;
	const lavaAge = hero.lavaTick ? world.tick - (Math.floor(hero.lavaTick / HeroColors.LavaFlashInterval) * HeroColors.LavaFlashInterval) : Infinity;
	const hitAge = Math.min(lavaAge, damageAge);
	const flash = Math.max(0, (1 - hitAge / HeroColors.DamageFlashTicks));

	const angle = hero.body.getAngle();
	let radius = hero.radius;
	if (flash > 0) {
		radius += HeroColors.DamageGrowFactor * radius * flash;
	}

	let style = parseColor(color);
	if (flash > 0) {
		style = style.lighten(HeroColors.DamageGlowFactor * flash);
	}

	// Fill
	{
		let gradient: r.Gradient = null;
		if (ctxStack.rtx >= r.GraphicsLevel.Normal) {
			gradient = {
				from: vector.plus(pos, pl.Vec2(-radius, -radius)),
				fromColor: style,
				to: vector.plus(pos, pl.Vec2(radius, radius)),
				toColor: style.darken(0.5),
			};
		}
		glx.circle(ctxStack, pos, {
			color: style.darken(0.25),
			gradient,
			maxRadius: radius,
		});
	}

	// Orientation
	{
		const points = [
			pl.Vec2(0, 0),
			pl.Vec2(-1, 1),
			pl.Vec2(0, 1),
			pl.Vec2(0.5, 0),
			pl.Vec2(0, -1),
			pl.Vec2(-1, -1),
		];
		let glyphColor = style.mix(parseColor('#fff'), 0.5);
		glx.convex(ctxStack, pos, points, angle, radius, {
			color: glyphColor,
			maxRadius: radius,
		});
	}

	// Charging
	if (hero.casting && hero.casting.color && hero.casting.proportion > 0) {
		const strokeColor = parseColor(hero.casting.color).alpha(hero.casting.proportion);
		const strokeRadius = radius + ChargingIndicator.Margin;
		glx.circle(ctxStack, pos, {
			color: strokeColor,
			minRadius: strokeRadius - ChargingIndicator.Width / 2,
			maxRadius: strokeRadius + ChargingIndicator.Width / 2,
		});
	}
}

function renderHeroInvisible(ctxStack: CanvasCtxStack, hero: w.Hero, invisible: w.VanishBuff, world: w.World) {
	renderVanishSmoke(ctxStack, hero, world);
}

function playHeroSounds(hero: w.Hero, world: w.World) {
	// Casting sounds
	if (hero.casting) {
		const spell = world.settings.Spells[hero.casting.action.type];
		if (spell && spell.sound) {
			let stage: string = null;
			if (hero.casting.stage === w.CastStage.Charging) {
				stage = "charging";
			} else if (hero.casting.stage === w.CastStage.Channelling) {
				stage = "channelling";
			}

			if (stage) {
				// Make the sound happen in the correct direction
				const pos = vector.plus(
					hero.body.getPosition(),
					vector.multiply(vector.fromAngle(hero.body.getAngle()), hero.radius));
				const key = `${spell.sound}-${stage}`;
				world.ui.sounds.push({
					id: `${hero.id}-${key}`,
					sound: key,
					pos,
				});
			}
		}
	}
}

function renderRangeIndicator(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	if (!(hero.id === world.ui.myHeroId && world.ui.hoverSpellId && !isMobile)) {
		return;
	}

	let range = null;

	const spell = world.settings.Spells[world.ui.hoverSpellId];
	if (spell.action === "projectile" || spell.action === "spray" || spell.action === "focus" || spell.action === "retractor") {
		range = spell.projectile.speed * spell.projectile.maxTicks / constants.TicksPerSecond;
		if (spell.projectile.behaviours) {
			spell.projectile.behaviours.forEach(b => {
				if (b.type === "homing" && b.targetType === "self" && b.minDistanceToTarget > 0) {
					range = 2 * b.minDistanceToTarget; // Fudge factor of 2x
				}
			});
		}
	} else if (spell.action === "teleport" || spell.action === "thrust") {
		range = spell.range;
	} else if (spell.action === "scourge") {
		range = spell.detonate.radius;
	} else if (spell.action === "shield") {
		range = spell.radius;
	} else if (spell.action === "saber") {
		range = spell.length;
	} else if (spell.action === "wall") {
		range = spell.maxRange;
	}

	if (range > 0.5) {
		range = 0.5;
	}

	if (range) {
		const pos = hero.body.getPosition();

		const color = parseColor(spell.color);
		const fill = color.alpha(0.25);

		// Stroke
		const strokeWidth = ctxStack.pixel * 2;
		const stroke = color.alpha(0.25);
		glx.circle(ctxStack, pos, {
			color: stroke,
			minRadius: range - strokeWidth,
			maxRadius: range,
		});
	}
}

function renderHeroBars(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	const Hero = world.settings.Hero;
	const pos = hero.body.getPosition();

	const radius = hero.radius;

	// Health bar
	const ticksUntilStart = Math.max(0, world.startTick - world.tick);
	if (!(ticksUntilStart <= constants.Matchmaking.JoinPeriod || hero.health < Hero.MaxHealth)) {
		return;
	}

	// Health
	{
		const healthProportion = hero.health / Hero.MaxHealth;
		const startProportion = Math.min(healthProportion, ticksUntilStart / constants.Matchmaking.JoinPeriod);

		let color = parseColor(rgColor(healthProportion));
		if (startProportion > 0) {
			color = color.lighten(0.75 + 0.25 * startProportion);
		}

		const barY = pos.y - radius - HealthBar.Height - HealthBar.Margin;
		const barHalfWidth = HealthBar.HeroRadiusFraction * radius;
		const barHalfHeight = HealthBar.Height / 2;

		const barLeft = pl.Vec2(pos.x - barHalfWidth, barY);
		const barMid = pl.Vec2(barLeft.x + healthProportion * 2 * barHalfWidth, barY);
		const barRight = pl.Vec2(pos.x + barHalfWidth, barY);

		glx.line(ctxStack, barLeft, barRight, {
			color: parseColor("#111"),
			maxRadius: barHalfHeight,
		});
		glx.line(ctxStack, barLeft, barMid, {
			color,
			maxRadius: barHalfHeight,
		});
	}
}

function renderShield(ctxStack: CanvasCtxStack, shield: w.Shield, world: w.World) {
	const MaxAlpha = 0.75;
	const MinAlpha = 0.10;

	const glow = shield.glow;

	const ticksRemaining = shield.expireTick - world.tick;
	const maxTicks = shield.expireTick - shield.createTick;
	const proportion = 1.0 * ticksRemaining / maxTicks;

	let flash = 0;
	if (shield.hitTick >= 0) {
		const hitAge = world.tick - shield.hitTick;
		if (hitAge < HeroColors.ShieldFlashTicks) {
			flash = (1 - hitAge / HeroColors.ShieldFlashTicks);
		}
	}

	let color = parseColor((shield.selfColor && shield.owner === world.ui.myHeroId) ? HeroColors.MyHeroColor : shield.color);
	if (flash > 0) {
		color = color.lighten(HeroColors.ShieldGlowFactor * flash);
	}
	color = color.alpha((MaxAlpha - MinAlpha) * proportion + MinAlpha);

	let scale: number = 1;
	if (flash > 0) {
		scale += HeroColors.ShieldGrowFactor * flash;
	}
	if (world.tick - shield.createTick < shield.growthTicks) {
		const growthProportion = (world.tick - shield.createTick) / shield.growthTicks;
		scale *= growthProportion;
	}

	let feather: r.FeatherConfig = null;
	if (shield.glow && ctxStack.rtx >= r.GraphicsLevel.High) {
		feather = {
			sigma: HeroColors.GlowRadius,
			alpha: shield.glow,
		};
	}

	if (shield.type === "reflect") {
		const hero = world.objects.get(shield.owner);
		if (!hero) {
			return;
		}
		const pos = hero.body.getPosition();

		glx.circle(ctxStack, pos, {
			color,
			maxRadius: shield.radius * scale,
			feather,
		});
	} else if (shield.type === "wall") {
		const pos = shield.body.getPosition();
		const angle = shield.body.getAngle();

		glx.convex(ctxStack, pos, shield.points, angle, scale, {
			color,
			minRadius: 0,
			maxRadius: shield.extent * scale,
			feather,
		});
	} else if (shield.type === "saber") {
		const hero = world.objects.get(shield.owner);
		if (!(hero && hero.category === "hero")) {
			return;
		}
		const pos = hero.body.getPosition();
		const angle = shield.body.getAngle();

		const tip = vector.plus(pos, vector.multiply(vector.fromAngle(angle), shield.length));
		glx.line(ctxStack, pos, tip, {
			color,
			minRadius: hero.radius,
			maxRadius: shield.width,
			feather,
		});

		renderSaberTrail(shield, world);
	}
}

function renderSaberTrail(saber: w.Saber, world: w.World) {
	const previousAngle = saber.uiPreviousAngle || saber.body.getAngle();
	const newAngle = saber.body.getAngle();

	const antiClockwise = vector.angleDelta(previousAngle, newAngle) < 0;


	const highlightTick = saber.uiHighlight ? saber.uiHighlight.fromTick : 0;
	if (saber.hitTick > highlightTick) {
		// Highlight
		const highlight: w.TrailHighlight = {
			fromTick: saber.hitTick,
			maxTicks: saber.trailTicks,
			glow: true,
		};
		saber.uiHighlight = highlight;

		world.ui.trails.forEach(trail => {
			if (trail.tag === saber.id) {
				trail.highlight = highlight;
			}
		});
	}

	pushTrail({
		type: "arc",
		initialTick: world.tick,
		max: saber.trailTicks,
		pos: saber.body.getPosition(),
		minRadius: world.settings.Hero.Radius,
		maxRadius: saber.length,
		fromAngle: previousAngle,
		toAngle: newAngle,
		antiClockwise,
		fillStyle: saber.color,
		glow: saber.glow,
		highlight: saber.uiHighlight,
		tag: saber.id,
	}, world);

	saber.uiPreviousAngle = newAngle;

	if (saber.sound) {
		const intensity = Math.min(1, 10 * Math.abs(vector.angleDelta(previousAngle, newAngle)) / (2 * Math.PI));
		const tip = vector.multiply(vector.fromAngle(newAngle), saber.length);
		world.ui.sounds.push({
			id: saber.id,
			sound: saber.sound,
			pos: tip,
			intensity,
		});
	}
}

function playShieldSounds(obj: w.Shield, world: w.World) {
	if (obj.sound) {
		world.ui.sounds.push({
			id: obj.id,
			sound: obj.sound,
			pos: vector.clone(obj.body.getPosition()),
		});

		if (obj.hitTick) {
			world.ui.sounds.push({
				id: `${obj.id}-hit-${obj.hitTick}`, // Each hit has a unique ID
				sound: `${obj.sound}-hit`,
				pos: vector.clone(obj.body.getPosition()),
			});
		}
	}
}

export function heroColor(heroId: string, world: w.World) {
	const player = world.players.get(heroId);
	if (!world.ui.myHeroId) {
		return player.uiColor;
	}

	if (heroId === world.ui.myHeroId) {
		return HeroColors.MyHeroColor;
	} else if (engine.calculateAlliance(world.ui.myHeroId, heroId, world) & Alliances.Ally) {
		return HeroColors.AllyColor;
	} else {
		return player.uiColor;
	}
}

function healthBarPath(ctx: CanvasRenderingContext2D, radius: number, proportion: number, world: w.World) {
	barPath(ctx, radius, proportion, HealthBar.Margin, HealthBar.Height, world);
}

function barPath(ctx: CanvasRenderingContext2D, radius: number, proportion: number, margin: number, height: number, world: w.World) {
	const barRadius = HealthBar.HeroRadiusFraction * radius;
	ctx.rect(-barRadius, -radius - height - margin, barRadius * 2 * proportion, height);
}

function rgColor(proportion: number) {
	let hue = proportion * 120.0;
	return hsl(hue, 1.0, 0.5);
}

function renderSwirl(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, swirl: RenderSwirl) {
	const multiplier = engine.calculatePartialDamageMultiplier(world, projectile);
	renderSwirlAt(ctxStack, projectile.body.getPosition(), world, swirl, {
		color: projectileColor(swirl, projectile, world),
		baseVelocity: projectile.body.getLinearVelocity(),
		tag: projectile.id,
		multiplier,
	});
}

function renderGravityWell(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	if (!hero.gravity) {
		return;
	}

	const spell = world.settings.Spells[hero.gravity.spellId] as ProjectileSpell;
	const swirl = hero.gravity.render;
	if (swirl) {
		renderSwirlAt(ctxStack, hero.gravity.location, world, swirl, {});
	}

	if (spell.sound) {
		world.ui.sounds.push({
			id: `${hero.id}-trapped`,
			sound: `${spell.sound}-trapped`,
			pos: hero.gravity.location,
		});
	}
}

function renderSwirlAt(ctxStack: CanvasCtxStack, location: pl.Vec2, world: w.World, swirl: RenderSwirl, context: SwirlContext) {
	const animationLength = swirl.loopTicks;
	const numParticles = swirl.numParticles;

	const angleOffset = (2 * Math.PI) * (world.tick % animationLength) / animationLength;
	const velocity = swirl.smoke ? particleVelocity(vector.multiply(context.baseVelocity, -swirl.smoke)) : null;
	
	const multiplier = context.multiplier !== undefined ? context.multiplier : 1;
	for (let i = 0; i < numParticles; ++i) {
		const angle = angleOffset + (2 * Math.PI) * i / numParticles;
		pushTrail({
			type: "circle",
			pos: vector.plus(location, vector.multiply(vector.fromAngle(angle), multiplier * swirl.radius)),
			velocity,
			radius: multiplier * swirl.particleRadius,
			initialTick: world.tick,
			max: swirl.ticks, 
			fillStyle: context.color || swirl.color,
			glow: swirl.glow,
			fade: swirl.fade,
			tag: context.tag,
		}, world);
	}
}

function renderReticule(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, reticule: RenderReticule) {
	const remainingTicks = Math.max(0, projectile.expireTick - world.tick);
	if (reticule.remainingTicks && remainingTicks > reticule.remainingTicks) {
		// Only display when under remainingTicks
		return;
	}

	let proportion = 1;
	if (reticule.shrinkTicks) {
		proportion *= Math.min(1, remainingTicks / reticule.shrinkTicks);
	}
	if (reticule.usePartialDamageMultiplier) {
		proportion *= engine.calculatePartialDamageMultiplier(world, projectile);
	}

	const pos = projectile.body.getPosition();

	glx.circle(ctxStack, pos, {
		color: parseColor(reticule.color),
		minRadius: reticule.minRadius * proportion,
		maxRadius: reticule.radius * proportion,
	});
}

function renderStrike(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, strike: RenderStrike) {
	if (!projectile.hitTick) {
		return;
	}

	const highlightTick = projectile.uiHighlight ? projectile.uiHighlight.fromTick : 0;
	if (projectile.hitTick <= highlightTick) {
		return;
	}

	// Highlight
	const highlight: w.TrailHighlight = {
		fromTick: projectile.hitTick,
		maxTicks: strike.ticks,
		glow: strike.glow,
		growth: strike.growth,
	};
	projectile.uiHighlight = highlight;
	world.ui.trails.forEach(trail => {
		if (trail.tag === projectile.id) {
			trail.highlight = highlight;
		}
	});

	// Particles
	if (strike.numParticles) {
		for (let i = 0; i < strike.numParticles; ++i) {
			const velocity = particleVelocity(projectile.body.getLinearVelocity());
			pushTrail({
				type: "circle",
				initialTick: projectile.hitTick,
				max: strike.ticks,
				pos: projectile.body.getPosition(),
				velocity,
				radius: projectile.radius,
				fillStyle: projectileColor(strike, projectile, world),
				highlight,
				tag: projectile.id,
			}, world);
		}
	}
}

function renderLink(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, render: RenderLink) {
	let owner: w.WorldObject = world.objects.get(projectile.owner);
	if (owner && owner.category == "hero") {
		renderLinkBetween(ctxStack, owner, projectile, render);
	}
}

function renderLinkBetween(ctxStack: CanvasCtxStack, owner: w.Hero, target: w.WorldObject, render: RenderLink) {
	const fill: r.Fill = {
		color: parseColor(render.color),
		maxRadius: render.width / 2,
		feather: (render.glow && ctxStack.rtx >= r.GraphicsLevel.High) ? {
			sigma: HeroColors.GlowRadius,
			alpha: render.glow,
		} : null,
	};

	const from = owner.body.getPosition();
	const to = target.body.getPosition();
	glx.line(ctxStack, from, to, fill);
}

function renderRay(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, render: RenderRay) {
	let previous: pl.Vec2 = null;

	const multiplier = projectileRadiusMultiplier(projectile, world, render);
	for (let pos of getRenderPoints(projectile.uiPath, render.intermediatePoints)) {
		if (previous) {
			pushTrail({
				type: 'line',
				initialTick: world.tick,
				max: render.ticks, 
				from: previous,
				to: pos,
				fillStyle: projectileColor(render, projectile, world),
				width: multiplier * projectile.radius * 2,
				glow: render.glow,
				highlight: projectile.uiHighlight,
				tag: projectile.id,
			}, world);
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

function renderProjectile(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, render: RenderProjectile) {
	let ticks = render.ticks;
	const velocity = render.smoke ? particleVelocity(vector.multiply(projectile.body.getLinearVelocity(), -render.smoke)) : null;
	pushTrail({
		type: 'circle',
		initialTick: world.tick,
		max: ticks,
		pos: vector.clone(projectile.body.getPosition()),
		velocity,
		fillStyle: projectileColor(render, projectile, world),
		fade: render.fade,
		radius: projectileRadiusMultiplier(projectile, world, render) * projectile.radius,
		glow: render.glow,
		highlight: projectile.uiHighlight,
		tag: projectile.id,
	}, world);
}

function projectileRadiusMultiplier(projectile: w.Projectile, world: w.World, render: RenderProjectile | RenderRay): number {
	let multiplier = render.radiusMultiplier || 1;
	if (!render.noPartialRadius) {
		multiplier *= engine.calculatePartialDamageMultiplier(world, projectile);
	}
	return multiplier;
}

function projectileColor(render: ProjectileColorParams, projectile: w.Projectile, world: w.World) {
	if (render.selfColor && projectile.owner === world.ui.myHeroId) {
		return HeroColors.MyHeroColor;
	}

	if (render.ownerColor) {
		return heroColor(projectile.owner, world);
	}

	return render.color || projectile.color;
}

function renderTrail(ctxStack: CanvasCtxStack, trail: w.Trail, world: w.World) {
	const expireTick = trail.initialTick + trail.max;
	const remaining = expireTick - world.tick;
	if (remaining <= 0) {
		return true;
	}

	const proportion = 1.0 * remaining / trail.max;
	let scale = 1;

	let color = parseColor(trail.fillStyle);
	if (trail.fade) {
		color = color.mix(Color(trail.fade), 1 - proportion);
	}
	if (trail.highlight) {
		const highlightProportion = Math.max(0, 1 - ((world.tick - trail.highlight.fromTick) / trail.highlight.maxTicks));
		if (highlightProportion > 0) {
			if (trail.highlight.glow) {
				color = color.lighten(highlightProportion);
			}
			if (trail.highlight.growth) {
				scale = 1 + trail.highlight.growth * highlightProportion;
			}
		} else {
			trail.highlight = null; // highlight expired
		}
	}

	let feather: r.FeatherConfig = null;
	if (trail.glow && ctxStack.rtx >= r.GraphicsLevel.High) {
		feather = {
			sigma: HeroColors.GlowRadius,
			alpha: trail.glow,
		};
	}

	if (trail.type === "circle") {
		let pos = trail.pos;
		if (trail.velocity) {
			const time = (world.tick - trail.initialTick) / constants.TicksPerSecond;
			pos = vector.plus(pos, vector.multiply(trail.velocity, time));
		}

		const radius = scale * proportion * trail.radius;

		glx.circle(ctxStack, pos, {
			color,
			maxRadius: radius,
			feather,
		});
	} else if (trail.type === "line") {
		const lineWidth = scale * proportion * trail.width;

		glx.line(ctxStack, trail.from, trail.to, {
			color,
			minRadius: 0,
			maxRadius: lineWidth / 2,
			feather,
		});
	} else if (trail.type === "ripple") {
		const radius = proportion * trail.initialRadius + (1 - proportion) * trail.finalRadius;
		const lineWidth = proportion * trail.initialRadius / 2;
		
		const minRadius = Math.max(0, radius - lineWidth / 2);
		const maxRadius = radius + lineWidth / 2;
		glx.circle(ctxStack, trail.pos, {
			color: color.alpha(proportion),
			minRadius,
			maxRadius,
			feather,
		});
	} else if (trail.type === "arc") {
		glx.arc(ctxStack, trail.pos, trail.fromAngle, trail.toAngle, trail.antiClockwise, {
			color: color.alpha(proportion),
			minRadius: trail.minRadius,
			maxRadius: trail.maxRadius,
			feather: feather,
		});
	}

	return false;
}

function renderInterface(ctx: CanvasRenderingContext2D, world: w.World, rect: ClientRect, options: RenderOptions) {
	const myHero = world.objects.get(world.ui.myHeroId) as w.Hero;
	renderButtons(ctx, rect, world, myHero, options);
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
				if (!(hitSector.startAngle && hitSector.endAngle)) {
					key = candidateKey;
				}
			});
			if (!key) {
				key = w.SpecialKeys.WheelCenter;
			}
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

function renderButtons(ctx: CanvasRenderingContext2D, rect: ClientRect, world: w.World, hero: w.Hero, options: RenderOptions) {
	let buttonStateLookup: Map<string, w.ButtonRenderState> = null;
	if (hero) {
		buttonStateLookup = calculateButtonStatesFromHero(world, hero, options);
	} else if (world.ui.myHeroId) {
		// Dead - display buttons so user can continue customising
		buttonStateLookup = calculateButtonStatesFromKeyBindings(world, options.keysToSpells);
	} else {
		buttonStateLookup = null;
	}

	if (buttonStateLookup) {
		if (!world.ui.buttonBar) {
			world.ui.buttonBar = calculateButtonLayout(world.settings.Choices.Keys, rect, options);
		}

		const config = world.ui.buttonBar;
		const iconLookup = world.settings.Icons;
		if (config.view === "bar") {
			renderButtonBar(ctx, config, buttonStateLookup, iconLookup);
		} else if (config.view === "wheel") {
			renderButtonWheel(ctx, config, buttonStateLookup, iconLookup);
		}
	} else {
		ctx.clearRect(0, 0, rect.width, rect.height);
	}
}

function calculateButtonStatesFromHero(world: w.World, hero: w.Hero, options: RenderOptions) {
	const selectedAction = hero && hero.casting && hero.casting.action && hero.casting.action.type;
	const keys = world.settings.Choices.Keys;
	const buttonStateLookup = new Map<string, w.ButtonRenderState>();
	for (let i = 0; i < keys.length; ++i) {
		const key = keys[i];
		if (!key) {
			continue;
		}

		const btnState = calculateButtonState(key.btn, hero, selectedAction, world, options.rebindings);
		buttonStateLookup.set(key.btn, btnState);
	}
	return buttonStateLookup;
}

function calculateButtonStatesFromKeyBindings(world: w.World, keysToSpells: Map<string, string>) {
	const keys = world.settings.Choices.Keys;
	const hoverSpellId = world.ui.hoverSpellId;

	const buttonStateLookup = new Map<string, w.ButtonRenderState>();
	for (let i = 0; i < keys.length; ++i) {
		const key = keys[i];
		if (!key) { continue; }

		const spellId = keysToSpells.get(key.btn);
		if (!spellId) { continue }

		const spell = world.settings.Spells[spellId];
		if (!spell) { continue }

		const btnState: w.ButtonRenderState = {
			key: null,
			color: spell.id === hoverSpellId ? "#555555" : "#444444",
			icon: spell.icon,
			cooldownText: null,
		};
		buttonStateLookup.set(key.btn, btnState);
	}
	return buttonStateLookup;
}

function calculateButtonLayout(keys: KeyConfig[], rect: ClientRect, options: RenderOptions): w.ButtonConfig {
	if (isMobile) {
		return calculateButtonWheelLayout(keys, rect, options);
	} else {
		return calculateButtonBarLayout(keys, rect);
	}
}

function renderButtonBar(ctx: CanvasRenderingContext2D, config: w.ButtonBarConfig, states: Map<string, w.ButtonRenderState>, icons: IconLookup) {
	ctx.save();
	ctx.translate(config.region.left, config.region.top);
	ctx.scale(config.scaleFactor, config.scaleFactor);

	for (let i = 0; i < config.keys.length; ++i) {
		const key = config.keys[i];
		if (!key) {
			continue;
		}

		const newState = states.get(key.btn);
		const currentState = config.buttons.get(key.btn);

		if (buttonStateChanged(currentState, newState)) {
			const buttonRegion = config.hitBoxes.get(key.btn);
			if (buttonRegion) {
				config.buttons.set(key.btn, newState);

				ctx.save();
				ctx.translate(buttonRegion.left, buttonRegion.top);
				renderBarButton(ctx, buttonRegion, newState, icons);
				ctx.restore();
			}
		}
	}
	ctx.restore();
}

function renderButtonWheel(ctx: CanvasRenderingContext2D, config: w.ButtonWheelConfig, states: Map<string, w.ButtonRenderState>, iconLookup: IconLookup) {
	ctx.save();
	ctx.translate(config.center.x, config.center.y);

	for (const key of config.hitSectors.keys()) {
		if (!key) {
			continue;
		}

		const newState = states.get(key);
		const currentState = config.buttons.get(key);

		if (buttonStateChanged(currentState, newState)) {
			const buttonSector = config.hitSectors.get(key);
			if (buttonSector) {
				config.buttons.set(key, newState);

				ctx.save();
				renderWheelButton(ctx, buttonSector, config.innerRadius, config.outerRadius, newState, iconLookup);
				ctx.restore();
			}
		}
	}
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
			const size = ButtonBar.Size * (key.weight || 1);

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

	const scaleFactor = Math.min(
		calculateButtonScaleFactor(rect.width, nextOffset),
		calculateButtonScaleFactor(rect.height * ButtonBar.MaxHeightProportion, ButtonBar.Size)
	);
	const region = calculateButtonBarRegion(rect, nextOffset, scaleFactor);

	return {
		view: "bar",
		keys,
		hitBoxes,
		region,
		scaleFactor,
		buttons: new Map<string, w.ButtonRenderState>(),
	};
}

function calculateButtonScaleFactor(available: number, actual: number): number {
	if (available <= 0) {
		return 1.0; // Stop division by zero errors
	} else if (actual <= available) {
		return 1.0;
	} else {
		return available / actual;
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

function calculateButtonWheelLayout(keys: KeyConfig[], rect: ClientRect, options: RenderOptions): w.ButtonWheelConfig {
	const WheelAngleOffset = (2 * Math.PI) * (1.75 / 6);

	const hitSectors = new Map<string, w.HitSector>();

	const arcWidth = 2 * Math.PI / keys.filter(k => !!k).length;
	let nextAngle = WheelAngleOffset + arcWidth / 2;
	keys.forEach(key => {
		if (key) {
			const startAngle = nextAngle;
			const endAngle = startAngle + arcWidth;

			let hitSector = { startAngle, endAngle, weight: key.weight || 1.0 };
			if (options.wheelOnRight) {
				hitSector = invertSector(hitSector);
			}

			hitSectors.set(key.btn, hitSector);

			nextAngle += arcWidth;
		}
	});
	// hitSectors.set(w.SpecialKeys.RightClick, { startAngle: null, endAngle: null });

	const region = calculateButtonWheelRegion(rect, options);
	const outerRadius = Math.min(region.width, region.height) / 2.0;
	const innerRadius = outerRadius / 2;
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

function invertSector(input: w.HitSector): w.HitSector {
	return {
		startAngle: Math.PI - input.endAngle,
		endAngle: Math.PI - input.startAngle,
		weight: input.weight,
	};
}

function calculateButtonWheelRegion(rect: ClientRect, options: RenderOptions): ClientRect {
	const size = calculateButtonWheelSize(rect);

	let left;
	let right;
	if (options.wheelOnRight) {
		right = rect.width - ButtonBar.Margin;
		left = right - size;
	} else {
		left = ButtonBar.Margin;
		right = left + size;
	}

	const bottom = rect.bottom - ButtonBar.Margin;
	const top = bottom - size;
	const width = size;
	const height = size;

	return { left, top, right, bottom, width, height };
}

function calculateButtonWheelSize(rect: ClientRect) {
	const maxSize = ButtonBar.Size * 3;

	let size = Math.min(
		(rect.width - ButtonBar.Margin) / 2, // Half width
		(rect.height - ButtonBar.Margin * 2)); // Or whole height
	size = Math.max(0, Math.min(maxSize, size));

	return size;
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
	let remainingInSeconds = engine.cooldownRemaining(world, hero, spell) / constants.TicksPerSecond;

	if (isSelected) {
		button.color = '#f0f0f0';
	} else if (remainingInSeconds > 0) {
		button.color = '#444444';
	}

	if (isHovered) {
		button.color = parseColor(button.color).lighten(0.25).string();
	} 

	if (remainingInSeconds > 0) {
		// Cooldown
		let cooldownText = remainingInSeconds > 1 ? remainingInSeconds.toFixed(0) : remainingInSeconds.toFixed(1);
		button.cooldownText = cooldownText;
	}

	return button;
}

function renderBarButton(ctx: CanvasRenderingContext2D, buttonRegion: ClientRect, buttonState: w.ButtonRenderState, iconLookup: IconLookup) {
	const size = buttonRegion.width; // assume square
	if (buttonState) {
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
        ctx.fillStyle = buttonState.color;
		
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.fill();

		ctx.clip();

		renderIconOnly(ctx, icons.getIcon(buttonState.icon, iconLookup), 0.6, size);

		if (buttonState.cooldownText) {
			// Cooldown
			let cooldownText = buttonState.cooldownText

			ctx.font = 'bold ' + (size * 0.75 - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, cooldownText, size / 2, size / 2);
		} else {
			const key = buttonState.key;
			if (key && !keyboardUtils.isSpecialKey(key)) {
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

function renderWheelButton(ctx: CanvasRenderingContext2D, sector: w.HitSector, innerRadius: number, outerRadius: number, buttonState: w.ButtonRenderState, iconLookup: IconLookup) {
	outerRadius = innerRadius + (0.5 + 0.5 * sector.weight) * (outerRadius - innerRadius);

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
			renderIconOnly(ctx, icons.getIcon(buttonState.icon, iconLookup), 0.6, size);
			
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
	return 'hsl(' + h.toFixed(0) + ', ' + (100 * sProportion).toFixed(2) + '%, ' + (100 * lProportion).toFixed(2) + '%)';
}

function pushTrail(trail: w.Trail, world: w.World) {
	if (world.ui.renderedTick === world.tick) {
		// If network hangs and we keep re-rendering the same frame, don't need to add another trail to a tick when it already has one
		return;
	}
	world.ui.trails.push(trail);
}