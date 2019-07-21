import * as pl from 'planck-js';
import * as atlasController from './atlasController';
import * as audio from './audio';
import * as constants from '../../game/constants';
import * as engine from '../../game/engine';
import * as glx from './glx';
import * as keyboardUtils from '../core/keyboardUtils';
import * as icons from '../core/icons';
import * as shapes from '../../game/shapes';
import * as r from './render.model';
import * as vector from '../../game/vector';
import * as w from '../../game/world.model';

import { Alliances, ButtonBar, ChargingIndicator, DashIndicator, HealthBar, HeroColors } from '../../game/constants';
import { CanvasStack, CanvasCtxStack, RenderOptions } from './render.model';
import ColTuple from './colorTuple';
import { renderIconOnly } from './renderIcon';
import { isMobile, isEdge } from '../core/userAgent';

export { CanvasStack, RenderOptions, GraphicsLevel } from './render.model';

const MapCenter = pl.Vec2(0.5, 0.5);
const MaxDestroyedTicks = constants.TicksPerSecond;

const AtlasAiIcon = "ai";

const DefaultBloomRadius = 0.03;

const DefaultShine = 0.5;
const DefaultGlow = 0.1;

const ShadowOffset = pl.Vec2(0, 0.005);
const ShadowFeatherRadius = 0.001;

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

export function worldPointFromInterfacePoint(interfacePoint: pl.Vec2, world: w.World) {
	if (world.ui.renderDimensions) {
		const worldRect = world.ui.renderDimensions.worldRect;
		const worldPoint = pl.Vec2((interfacePoint.x - worldRect.left) / worldRect.width, (interfacePoint.y - worldRect.top) / worldRect.height);
		return worldPoint;
	} else {
		// Default to map center if not yet rendered
		return pl.Vec2(0.5, 0.5);
	}
}

function calculateViewRects(rect: ClientRect, wheelOnRight: boolean): ClientRect {
	return {
		left: 0,
		right: rect.width,
		width: rect.width,
		top: 0,
		bottom: rect.height,
		height: rect.height,
	};
}

function calculateWorldRect(viewRect: ClientRect, camera: w.Camera): ClientRect {
	const size = camera.zoom * Math.min(viewRect.width, viewRect.height);

	const width = size;
	const height = size;

	const left = viewRect.left + (viewRect.width / 2) - (camera.center.x * size);
	const top = viewRect.top + (viewRect.height / 2) - (camera.center.y * size);

	const right = left + width;
	const bottom = top + height;

	return { left, top, right, bottom, width, height };
}

export function direct(world: w.World, canvasStack: CanvasStack, options: RenderOptions) {
	const CenterAlpha = 0.004;
	const ZoomAlpha = 0.004;

	const MaxZoom = 2;
	const MinPixelsForZoom = 640;
	const SelfAlpha = 0.5;

	const CenterTolerance = 0.15;
	const ZoomTolerance = 0.2;

	const mapCenter = pl.Vec2(0.5, 0.5);

	// Calculate max zoom
	const rect = canvasStack.ui.getBoundingClientRect();
	const pixels = Math.min(rect.width, rect.height);
	const maxZoom = Math.max(1, Math.min(MaxZoom, MinPixelsForZoom / pixels));

	// Load existing camera
	const camera = world.ui.camera;

	// Choose new target
	let clampZoom = maxZoom;
	let cameraTarget: w.Camera = {
		zoom: 1,
		center: mapCenter,
	};
	if (options.cameraFollow && world.ui.myHeroId && world.ui.nextTarget) {
		const hero = world.objects.get(world.ui.myHeroId);
		if (hero) {
			const pos = hero.body.getPosition();
			const target = world.ui.nextTarget;

			// Must be able to see self
			clampZoom = calculateZoom(vector.distance(pos, camera.center), maxZoom);

			// Zoom relative to current center, not new one
			if (maxZoom > 1) {
				let distance = Math.max(vector.distance(target, camera.center), vector.distance(pos, camera.center));
				let zoom = calculateZoom(distance, maxZoom);
				cameraTarget.zoom = Math.abs(zoom - camera.zoom) <= ZoomTolerance ? camera.zoom : zoom;
			}

			// New center - only pan if some zooming is involved
			if (maxZoom > 1.1) {
				let center = pl.Vec2(
					SelfAlpha * pos.x + (1 - SelfAlpha) * target.x,
					SelfAlpha * pos.y + (1 - SelfAlpha) * target.y,
				);
				cameraTarget.center = vector.distance(center, camera.center) <= CenterTolerance ? camera.center : center;
			}
		}
	}

	// Ease
	const newCamera: w.Camera = {
		zoom: Math.min(clampZoom, ZoomAlpha * cameraTarget.zoom + (1 - ZoomAlpha) * camera.zoom),
		center: pl.Vec2(
			CenterAlpha * cameraTarget.center.x + (1 - CenterAlpha) * camera.center.x,
			CenterAlpha * cameraTarget.center.y + (1 - CenterAlpha) * camera.center.y,
		),
	};
	world.ui.camera = newCamera;
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function calculateZoom(distance: number, maxZoom: number) {
	const TargetDistanceFactor = 2.25;
	const zoom = 1 / Math.max(1e-6, TargetDistanceFactor * distance);
	return clamp(zoom, 1, maxZoom);
}

export function render(world: w.World, canvasStack: CanvasStack, options: RenderOptions) {
	const rect = canvasStack.ui.getBoundingClientRect();
	const viewRect = calculateViewRects(rect, options.wheelOnRight);
	const worldRect = calculateWorldRect(viewRect, world.ui.camera);
	const subpixel = 1 / Math.max(1, Math.min(canvasStack.gl.width, canvasStack.gl.height)) / world.ui.camera.zoom;
	const pixel = subpixel * options.retinaMultiplier;

	const ctxStack: CanvasCtxStack = {
		sounds: [],
		atlas: canvasStack.atlas.getContext('2d', { alpha: true }),
		gl: canvasStack.gl.getContext('webgl', { alpha: false }),
		ui: canvasStack.ui.getContext('2d', { alpha: true }),
		rtx: options.rtx,
		subpixel,
		pixel,
	};
	if (!(ctxStack.gl && ctxStack.ui)) {
		throw "Error getting context";
	}

	glx.initGl(ctxStack);
	glx.clearGl(ctxStack);

	renderAtlas(ctxStack, world, options);
	renderWorld(ctxStack, world, worldRect, options);
	renderCursor(ctxStack, world);
	renderInterface(ctxStack.ui, world, rect, options);

	glx.renderGl(ctxStack, worldRect, rect);

	playSounds(ctxStack, world, options);

	world.ui.destroyed = [];
	world.ui.events = [];

	world.ui.renderedTick = world.tick;

	world.ui.renderDimensions = {
		rect,
		viewRect,
		worldRect,
	};
}

function renderAtlas(ctxStack: CanvasCtxStack, world: w.World, options: RenderOptions) {
	const instructions = prepareAtlas(world, options);
	atlasController.renderAtlas(ctxStack, instructions);
}

function prepareAtlas(world: w.World, options: RenderOptions): r.AtlasInstruction[] {
	const instructions = new Array<r.AtlasInstruction>();

	instructions.push({
		id: AtlasAiIcon,
		type: "icon",
		icon: "microchip",
		color: 'rgba(255, 255, 255, 0.3)',
		height: Math.ceil(options.retinaMultiplier * HeroColors.IconSizePixels),
		width: Math.ceil(options.retinaMultiplier * HeroColors.IconSizePixels),
	});

	world.players.forEach(player => {
		instructions.push({
			id: player.heroId,
			type: "text",
			text: player.name,
			color: 'rgba(255, 255, 255, 0.3)',
			font: `${HeroColors.NameFontPixels * options.retinaMultiplier}px Helvetica,Arial,sans-serif`,
			height: Math.ceil(options.retinaMultiplier * HeroColors.NameHeightPixels),
			width: Math.ceil(options.retinaMultiplier * HeroColors.NameWidthPixels),
		});
	});
	return instructions;
}

function playSounds(ctxStack: CanvasCtxStack, world: w.World, options: RenderOptions) {
	if (options.mute
		|| world.tick <= world.ui.playedTick // Already played this tick
		|| (world.tick - world.ui.playedTick) > MaxDestroyedTicks) { // We've lagged or entered a game late, don't replay all the sounds because it just causes WebAudio to hang

		// Play nothing
	} else {
		const hero = world.objects.get(world.ui.myHeroId);
		const self = hero ? hero.body.getPosition() : pl.Vec2(0.5, 0.5);
		audio.play(self, ctxStack.sounds, world.settings.Sounds);
	}

	world.ui.playedTick = world.tick; // Always update this so if user unmutes they don't classified as get sound lag
}

function renderWorld(ctxStack: CanvasCtxStack, world: w.World, worldRect: ClientRect, options: RenderOptions) {
	renderMap(ctxStack, world);

	if (options.targetingIndicator) {
		renderTargetingIndicator(ctxStack, world);
	}

	world.objects.forEach(obj => {
		if (obj.category === "obstacle") {
			renderObject(ctxStack, obj, world, options)
		}
	});

	world.ui.underlays = renderTrails(ctxStack, world.ui.underlays, world);

	world.objects.forEach(obj => {
		if (obj.category !== "obstacle") {
			renderObject(ctxStack, obj, world, options)
		}
	});

	world.ui.destroyed.forEach(obj => renderDestroyed(ctxStack, obj, world, options));
	world.ui.events.forEach(obj => renderEvent(ctxStack, obj, world));

	world.ui.trails = renderTrails(ctxStack, world.ui.trails, world);

	world.ui.changedTrailHighlights.clear();
}

function renderTrails(ctxStack: CanvasCtxStack, trails: w.Trail[], world: w.World) {
	let newTrails = new Array<w.Trail>();
	trails.forEach(trail => {
		if (trail.tag) {
			const newHighlight = world.ui.changedTrailHighlights.get(trail.tag);
			if (newHighlight) {
				trail.highlight = newHighlight;
			}
		}

		renderTrail(ctxStack, trail, world);

		const expireTick = trail.initialTick + trail.max;
		if (world.tick < expireTick) {
			newTrails.push(trail);
		}
	});
	return newTrails;
}

function renderCursor(ctxStack: CanvasCtxStack, world: w.World) {
	const CrossHairSize = world.settings.Hero.Radius;

	if (!world.ui.myHeroId) {
		return;
	}

	if (!isMobile) {
		return;
	}

	const target = world.ui.nextTarget;
	if (!target) {
		return;
	}

	const fill: r.Fill = {
		color: ColTuple.parse("#fff"),
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
			renderAttachedLink(ctxStack, obj, world);
		}
	} else if (obj.category === "shield") {
		renderShield(ctxStack, obj, world);
		playShieldSounds(ctxStack, obj, world);
	} else if (obj.category === "projectile") {
		renderSpell(ctxStack, obj, world);
		playSpellSounds(ctxStack, obj, world);
	} else if (obj.category === "obstacle") {
		renderObstacle(ctxStack, obj, world, options);
	}
}

function renderAttachedLink(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	if (!(hero.link && hero.link.render)) {
		return;
	}

	const target = world.objects.get(hero.link.targetId);
	if (!target) {
		return;
	}

	applyHighlight(hero.link.redirectDamageTick, hero.link, world, hero.link.render.redirectFlash, hero.link.render.redirectGrowth);
	renderLinkBetween(ctxStack, hero, target, world, hero.link.render, hero.link.uiHighlight);
}

function renderDestroyed(ctxStack: CanvasCtxStack, obj: w.WorldObject, world: w.World, options: RenderOptions) {
	if (world.tick - obj.destroyedTick >= MaxDestroyedTicks) {
		// Don't render, too old
	} else if (obj.category === "hero") {
		renderHeroDeath(ctxStack, obj, world);
	} else if (obj.category === "projectile") {
		renderSpell(ctxStack, obj, world);
		playSpellSounds(ctxStack, obj, world);
	} else if (obj.category === "obstacle") {
		renderObstacleDestroyed(ctxStack, obj, world, options);
	}
}

function renderHeroDeath(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	const NumParticles = 10;
	const MaxTicks = 30;
	const Speed = 0.1;

	if (hero.exitTick) {
		// Exited intentionally, not a death
		return;
	}

	const pos = vector.clone(hero.body.getPosition());

	for (let i = 0; i < NumParticles; ++i) {
		const velocity = particleVelocity(hero.body.getLinearVelocity());
		const expireVelocity = vector.fromAngle(Math.random() * 2 * Math.PI).mul(Math.random() * Speed);
		velocity.add(expireVelocity);

		pushTrail({
			type: "circle",
			max: MaxTicks,
			initialTick: world.tick,
			pos,
			velocity,
			fillStyle: "white",
			radius: hero.radius,
			glow: DefaultGlow,
			bloom: DefaultBloomRadius,
		}, world);
	}

	ctxStack.sounds.push({
		id: `${hero.id}-death`,
		sound: 'death',
		pos,
	});
}

function renderObstacleDestroyed(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, world: w.World, options: RenderOptions) {
	const NumParticles = 10;
	const ExplodeSpeed = 0.1;
	const MaxParticleRadius = 0.01;

	const mapCenter = pl.Vec2(0.5, 0.5);
	const particleRadius = Math.min(MaxParticleRadius, shapes.getMinExtent(obstacle.shape));

	for (let i = 0; i < NumParticles; ++i) {
		const pos = shapes.randomEdgePoint(obstacle.shape, obstacle.body.getPosition(), obstacle.body.getAngle(), particleRadius);
		const edgeOffset = vector.diff(pos, mapCenter);
		edgeOffset.normalize();
		edgeOffset.mul(ExplodeSpeed);
		const velocity = particleVelocity(edgeOffset);
		underlay({
			tag: obstacle.id,
			type: "circle",
			pos,
			velocity,
			radius: particleRadius,
			initialTick: world.tick,
			max: 30,
			fillStyle: '#fff',
			fade: 'rgba(0, 0, 0, 0)',
		}, world);
	}
}


function renderSpell(ctxStack: CanvasCtxStack, obj: w.Projectile, world: w.World) {
	obj.uiPath.push(obj.body.getPosition().clone());

	obj.renderers.forEach(render => {
		if (render.type === "projectile") {
			renderProjectile(ctxStack, obj, world, render);
		} else if (render.type === "polygon") {
			renderPolygon(ctxStack, obj, world, render);
		} else if (render.type == "ray") {
			renderRay(ctxStack, obj, world, render);
		} else if (render.type === "link") {
			renderUnattachedLink(ctxStack, obj, world, render);
		} else if (render.type === "swirl") {
			renderSwirl(ctxStack, obj, world, render);
		} else if (render.type === "reticule") {
			renderReticule(ctxStack, obj, world, render);
		} else if (render.type === "strike") {
			renderStrike(ctxStack, obj, world, render);
		} else if (render.type === "bloom") {
			renderBloom(ctxStack, obj, world, render);
		}
	});

	while (obj.uiPath.length > 1) {
		obj.uiPath.shift();
	}
}

function playSpellSounds(ctxStack: CanvasCtxStack, obj: w.Projectile, world: w.World) {
	if (obj.sound) {
		ctxStack.sounds.push({
			id: obj.id,
			sound: obj.sound,
			pos: obj.body.getPosition().clone(),
		});
	}

	const hitSound = obj.soundHit || obj.sound;
	if (hitSound && obj.hit) {
		ctxStack.sounds.push({
			id: `${obj.id}-hit-${obj.hit}`, // Each hit has a unique ID
			sound: `${hitSound}-hit`,
			pos: obj.body.getPosition().clone(),
		});
	}
}

function renderLifeStealReturn(ctxStack: CanvasCtxStack, ev: w.LifeStealEvent, world: w.World) {
	const MaxTicks = 15;

	if (world.tick >= ev.tick + MaxTicks) {
		return; // Too late
	}

	let owner = world.objects.get(ev.owner);
	if (!(owner && owner.category === "hero")) {
		return;
	}

	if (engine.isHeroInvisible(owner)) {
		// Don't let lifesteal glow give away position
		return;
	}

	const pos = owner.body.getPosition();
	pushTrail({
		type: 'ripple',
		initialTick: ev.tick,
		max: MaxTicks,
		pos: pos.clone(),
		fillStyle: HeroColors.HealColor,
		shine: DefaultShine,
		vanish: 1,
		initialRadius: owner.radius * 1,
		finalRadius: owner.radius * 1.5,
	}, world);
}

function renderSetCooldown(ctxStack: CanvasCtxStack, ev: w.SetCooldownEvent, world: w.World) {
	const MaxTicks = 15;

	if (world.tick >= ev.tick + MaxTicks) {
		return; // Too late
	}

	let owner = world.objects.get(ev.heroId);
	if (!(owner && owner.category === "hero")) {
		return;
	}
	const pos = owner.body.getPosition();

	if (ev.color) {
		pushTrail({
			type: 'ripple',
			initialTick: ev.tick,
			max: MaxTicks,
			pos: pos.clone(),
			fillStyle: ev.color,
			vanish: 1,
			initialRadius: owner.radius * 1,
			finalRadius: owner.radius * 1.5,
		}, world);
	}

	if (ev.sound && (!world.ui.myHeroId || ev.heroId === world.ui.myHeroId)) {
		// Only play sound if it affects me
		ctxStack.sounds.push({
			id: `${owner.id}-setCooldown`,
			sound: `${ev.sound}-setCooldown`,
			pos,
		});
	}
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
	} else if (ev.type === "cooldown") {
		renderSetCooldown(ctxStack, ev, world);
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
		glow: DefaultGlow,
		bloom: DefaultBloomRadius,
	}, world);

	if (ev.sound) {
		ctxStack.sounds.push({
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
		for (let i = 0; i < NumParticles; ++i) {
			renderVanishSmoke(ctxStack, hero, world, ev.pos);
		}
	}
}

function renderVanishSmoke(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World, pos?: pl.Vec2) {
	const velocity = particleVelocity(vector.fromAngle(hero.body.getAngle(), -hero.moveSpeedPerSecond));
	pushTrail({
		type: 'circle',
		initialTick: world.tick,
		max: 60,
		pos: pos || hero.body.getPosition().clone(),
		fillStyle: "#111",
		vanish: 1,
		radius: hero.radius,
		velocity,
	}, world);
}

function renderTeleport(ctxStack: CanvasCtxStack, ev: w.TeleportEvent, world: w.World) {
	const Hero = world.settings.Hero;
	const MaxTicks = 30;

	const color = heroColor(ev.heroId, world);

	if (ev.fromPos) {
		renderJumpSmoke(ctxStack, color, ev.fromPos, world, ev.tick);
	}

	if (ev.toPos) {
		renderJumpSmoke(ctxStack, color, ev.toPos, world, ev.tick);

		if (ev.heroId === world.ui.myHeroId) {
			// Clearly indicate yourself
			pushTrail({
				type: "ripple",
				max: MaxTicks,
				initialTick: ev.tick,
				pos: ev.toPos,
				fillStyle: '#ccc',
				shine: DefaultShine,
				vanish: 1,
				bloom: 0.05,
				initialRadius: Hero.Radius,
				finalRadius: Hero.Radius * 4,
			}, world);
		}

		if (ev.sound) {
			ctxStack.sounds.push({
				id: `${ev.heroId}-teleport-arriving`,
				sound: `${ev.sound}-arriving`,
				pos: ev.toPos,
			});
		}
	}
}

function renderJumpSmoke(ctxStack: CanvasCtxStack, color: string, pos: pl.Vec2, world: w.World, initialTick: number = world.tick) {
	const Hero = world.settings.Hero;
	const MaxTicks = 15;
	const NumParticles = 5;
	const MaxSpeed = 0.05;

	if (world.tick >= initialTick + MaxTicks) {
		return; // Too late
	}

	for (let i = 0; i < NumParticles; ++i) {
		world.ui.trails.unshift({ // Smoke at bottom
			type: "circle",
			pos,
			velocity: vector.fromAngle(Math.random() * 2 * Math.PI).mul(MaxSpeed * Math.random()),
			radius: Hero.Radius,
			initialTick: initialTick,
			max: MaxTicks,
			fillStyle: color,
			bloom: 0.015,
			glow: DefaultGlow,
		});
	}
}

function renderPush(ctxStack: CanvasCtxStack, ev: w.PushEvent, world: w.World) {
	if (world.ui.myHeroId && !(ev.owner === world.ui.myHeroId || ev.objectId === world.ui.myHeroId)) {
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
		maxTicks: HeroColors.HighlightTicks,
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
	let color: ColTuple;
	if (world.winner) {
		const proportion = Math.max(0, 1 - (world.tick - (world.winTick || 0)) / HeroColors.WorldAnimateWinTicks);
		scale *= 1 + HeroColors.WorldWinGrowth * proportion;
		color = ColTuple.parse(heroColor(world.winner, world)).darken(0.5 * (1 - proportion));
	} else {
		color = ColTuple.parse(world.color);

		const highlight = takeHighlights(world);
		if (highlight) {
			const proportion = Math.max(0, 1 - (world.tick - highlight.fromTick) / highlight.maxTicks);
			color.mix(ColTuple.parse(highlight.color), HeroColors.HighlightFactor * proportion);
		}
	}

	const easeMultiplier = ease(0, world);
	if (easeMultiplier > 0) {
		scale *= 1 - easeMultiplier;
	}

	const strokeStyle = color.clone().lighten(0.05);
	const strokeProportion = 0.99;

	const radius = world.radius * world.mapRadiusMultiplier;

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
			offset.addMul(magnitude, shake.direction);
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
	applyHighlight(obstacle.activeTick, obstacle, world);
	obstacle.render.forEach(render => {
		if (render.type === "solid") {
			renderObstacleSolid(ctxStack, obstacle, render, world, options);
		} else if (render.type === "smoke") {
			renderObstacleSmoke(ctxStack, obstacle, render, world, options)
		}
	});

	playObstacleSounds(ctxStack, obstacle, world);
}

function playObstacleSounds(ctxStack: CanvasCtxStack, obj: w.Obstacle, world: w.World) {
	if (obj.sound) {
		if (obj.touchTick) {
			ctxStack.sounds.push({
				id: `${obj.id}-touch-${obj.touchTick}`, // Each touch has a unique ID
				sound: obj.sound,
				pos: obj.body.getPosition().clone(),
			});
		}
	}
}

function renderObstacleSolid(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, fill: SwatchFill, world: w.World, options: RenderOptions) {
	const hitAge = obstacle.uiHighlight ? world.tick - obstacle.uiHighlight.fromTick : Infinity;
	const flash = Math.max(0, (1 - hitAge / HeroColors.FlashTicks));

	let color = ColTuple.parse(fill.color);

	const proportion = obstacle.health / obstacle.maxHealth;
	if (fill.deadColor && proportion < 1) {
		color.mix(ColTuple.parse(fill.deadColor), 1 - proportion);
	}

	if (fill.flash) {
		if (flash > 0) {
			color.lighten(flash);
		}
	}

	let scale = 1;
	const pos = obstacle.body.getPosition();
	const angle = obstacle.body.getAngle();

	const easeMultiplier = ease(obstacle.createTick, world);
	if (easeMultiplier > 0) {
		scale *= 1 - easeMultiplier;
	}

	const shape = obstacle.shape;
	if (shape.type === "polygon" || shape.type === "radial") {
		let drawShape = shape;
		if (flash > 0 && fill.strikeGrow) {
			drawShape = shapes.grow(drawShape, flash * fill.strikeGrow) as shapes.Polygon;
		}
		if (fill.expand) {
			drawShape = shapes.grow(drawShape, fill.expand) as shapes.Polygon;
		}

		let drawPos = vector.scaleAround(pos, MapCenter, scale);
		if (fill.shadow) {
			drawPos = drawPos.clone().add(ShadowOffset);
		}
		glx.convex(ctxStack, drawPos, drawShape.points, angle, scale, {
			color,
			maxRadius: 1,
		});
	} else if (shape.type === "arc") {
		const center = shapes.toWorldCoords(pos, angle, shape.localCenter);

		let radialExtent = shape.radialExtent;
		if (flash > 0 && fill.strikeGrow) {
			radialExtent += flash * fill.strikeGrow;
		}
		if (fill.expand) {
			radialExtent += flash * fill.expand;
		}

		const drawPos = vector.scaleAround(center, MapCenter, scale);
		const fromAngle = angle - shape.angularExtent;
		const toAngle = angle + shape.angularExtent;
		glx.arc(ctxStack, drawPos, fromAngle, toAngle, false, {
			color,
			minRadius: scale * (shape.radius - radialExtent),
			maxRadius: scale * (shape.radius + radialExtent),
			feather: fill.glow && options.rtx >= r.GraphicsLevel.Normal ? {
				sigma: HeroColors.GlowRadius,
				alpha: fill.glow,
			} : null,
		});
	} else if (shape.type === "circle") {
		let radius = shape.radius;
		if (flash > 0 && fill.strikeGrow) {
			radius += flash * fill.strikeGrow;
		}
		if (fill.expand) {
			radius += flash * fill.expand;
		}

		let drawPos = vector.scaleAround(pos, MapCenter, scale);
		if (fill.shadow) {
			drawPos = drawPos.clone().add(ShadowOffset);
		}
		glx.circle(ctxStack, drawPos, {
			color,
			maxRadius: scale * radius,
		});
	}
}

function renderObstacleSmoke(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, smoke: SwatchSmoke, world: w.World, options: RenderOptions) {
	if (smoke.interval && (world.tick % smoke.interval) !== 0) {
		return;
	}

	const easeMultiplier = ease(obstacle.createTick, world);

	const mapCenter = pl.Vec2(0.5, 0.5);
	let particleRadius = Math.min(smoke.particleRadius, shapes.getMinExtent(obstacle.shape));

	let pos = shapes.randomEdgePoint(obstacle.shape, obstacle.body.getPosition(), obstacle.body.getAngle(), particleRadius);
	const outward = vector.diff(pos, mapCenter);
	outward.normalize();

	const velocity = vector.zero();

	if (smoke.speed) {
		velocity.add(particleVelocity(outward, smoke.speed));
	}

	if (smoke.conveyor && obstacle.conveyor) {
		if (obstacle.conveyor.radialSpeed) {
			velocity.addMul(obstacle.conveyor.radialSpeed * smoke.conveyor, outward);
		}
		if (obstacle.conveyor.lateralSpeed) {
			velocity.addMul(obstacle.conveyor.lateralSpeed * smoke.conveyor, vector.rotateRight(outward));
		}
	}

	if (easeMultiplier > 0) {
		const scale = 1 - easeMultiplier;
		pos = vector.scaleAround(pos, mapCenter, scale);
		particleRadius *= scale;
	}

	underlay({
		tag: obstacle.id,
		type: "circle",
		pos,
		velocity,
		radius: particleRadius,
		initialTick: world.tick,
		max: smoke.ticks,
		fillStyle: smoke.color,
		fade: smoke.fade,
		highlight: obstacle.uiHighlight,
	}, world);
}

function applyHighlight(activeTick: number, obj: w.HighlightSource, world: w.World, glow: boolean = true, growth?: number) {
	if (!activeTick) {
		return false;
	}

	const highlightTick = obj.uiHighlight ? obj.uiHighlight.fromTick : 0;
	if (activeTick <= highlightTick) {
		return false;
	}

	// Highlight
	const highlight: w.TrailHighlight = {
		tag: obj.id,
		fromTick: activeTick,
		maxTicks: HeroColors.FlashTicks,
		glow,
		growth,
	};
	obj.uiHighlight = highlight;

	world.ui.changedTrailHighlights.set(highlight.tag, highlight);

	return true;
}

function renderHero(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World) {
	if (hero.destroyedTick) {
		return;
	}

	const pos = hero.body.getPosition().clone();

	// Ease in hero on arrival
	let easeMultiplier = ease(hero.createTick, world);
	let arriving = true;
	if (hero.exitTick) {
		arriving = false;

		const leaveMultiplier = 1 - ease(hero.exitTick, world);
		if (leaveMultiplier >= 1) {
			// This hero has already left, don't render
			return;
		}

		// Ease out
		easeMultiplier = leaveMultiplier;
	}

	if (easeMultiplier > 0) {
		const direction = vector.diff(pos, MapCenter);
		direction.normalize();
		pos.addMul(HeroColors.EaseInDistance * easeMultiplier, direction);

		renderHeroArrival(ctxStack, pos, direction, arriving, hero, world);
	}

	renderRangeIndicator(ctxStack, hero, pos, world);
	renderBuffs(ctxStack, hero, pos, world); // Do this before applying translation

	const invisible = engine.isHeroInvisible(hero);
	if (invisible) {
		if (world.ui.myHeroId && (engine.calculateAlliance(hero.id, world.ui.myHeroId, world) & Alliances.Enemy) > 0) {
			// Enemy - render nothing
		} else {
			// Self or observer - render placeholder
			renderHeroInvisible(ctxStack, hero, pos, invisible, world);
		}
	} else {
		renderHeroCharacter(ctxStack, hero, pos, world);
		renderHeroName(ctxStack, hero, pos, world);
		renderHeroIcon(ctxStack, hero, pos, world);

		if (!easeMultiplier) {
			renderHeroBars(ctxStack, hero, pos, world);
		}
	}

	playHeroSounds(ctxStack, hero, pos, world);
}

function renderHeroArrival(ctxStack: CanvasCtxStack, pos: pl.Vec2, outward: pl.Vec2, arriving: boolean, hero: w.Hero, world: w.World) {
	world.ui.trails.unshift({
		type: "circle",
		pos,
		velocity: particleVelocity(outward, 0.1),
		radius: hero.radius,
		initialTick: world.tick,
		max: HeroColors.EaseTicks,
		fillStyle: heroColor(hero.id, world),
		shine: 0.5,
		glow: DefaultGlow,
		bloom: DefaultBloomRadius,
		vanish: 1,
	});

	if (arriving) {
		ctxStack.sounds.push({ id: `joining-${hero.id}`, sound: 'joining', pos });
	} else {
		ctxStack.sounds.push({ id: `leaving-${hero.id}`, sound: 'leaving', pos });
	}
}

function ease(createTick: number, world: w.World): number {
	const age = world.tick - createTick;
	if (age < 0) {
		return 1;
	} else if (age < HeroColors.EaseTicks) {
		return Math.pow(1 - age / HeroColors.EaseTicks, HeroColors.EasePower);
	} else {
		return 0;
	}
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
	const proportion = Math.min(1, diff.length() / guideLength);

	const radius = vector.length(diff);
	const angle = vector.angle(diff);
	const circumference = 2 * Math.PI * radius;
	const angularProportion = CrossWidth / circumference;
	const startAngle = angle - (Math.PI * angularProportion);
	const endAngle = angle + (Math.PI * angularProportion);

	const lineWidth = hero.radius / 2;

	const gradient: r.Gradient = {
		from: pos,
		fromColor: ColTuple.parse("#000").alpha(MaxAlpha * proportion),
		to: pos.clone().addMul(guideLength, guideDirection),
		toColor: ColTuple.parse("#000").alpha(0),
	};

	// Render line to target
	glx.line(ctxStack, pos, pos.clone().addMul(guideLength, guideDirection), {
		gradient,
		maxRadius: lineWidth / 2,
	});
}

function renderBuffs(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	hero.buffs.forEach(buff => {
		if (buff.render) {
			renderBuffSmoke(ctxStack, buff.render, buff, hero, pos, world);
		}

		if (buff.sound) {
			ctxStack.sounds.push({
				id: `buff-${buff.id}`,
				sound: `${buff.sound}`,
				pos,
			});
		}
	});

	hero.uiDestroyedBuffs.forEach(buff => {
		if ((world.tick - buff.destroyedTick) >= MaxDestroyedTicks) {
			return;
		}

		if (buff.sound) {
			ctxStack.sounds.push({
				id: `buff-${buff.id}-expired`,
				sound: `${buff.sound}-expired`,
				pos,
			});
		}
	});
	hero.uiDestroyedBuffs = [];
}

function renderBuffSmoke(ctxStack: CanvasCtxStack, render: RenderBuff, buff: w.Buff, hero: w.Hero, heroPos: pl.Vec2, world: w.World) {
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
		color = ColTuple.parse(color).alpha(alpha).string();
	}

	let velocity: pl.Vec2 = null;
	if (render.smoke) {
		velocity = particleVelocity(hero.thrust.velocity, render.smoke);
	} else {
		// Normally hero not moving fast enough to create smoke
		velocity = particleVelocity(vector.fromAngle(hero.body.getAngle()), -hero.moveSpeedPerSecond);
	}

	const pos = heroPos.clone();
	if (render.emissionRadiusFactor) {
		pos.addMul(render.emissionRadiusFactor * hero.radius, vector.fromAngle(Math.random() * 2 * Math.PI));
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
		glow: render.glow,
		shine: render.shine,
		fade: render.fade,
		vanish: render.vanish,
	});

	if (render.bloom && ctxStack.rtx >= r.GraphicsLevel.High) {
		glx.circle(ctxStack, pos, {
			color: ColTuple.parse(color),
			maxRadius: 0,
			feather: {
				sigma: render.bloom,
				alpha: render.glow !== undefined ? render.glow : DefaultGlow,
			},
		});
	}
}

function particleVelocity(primaryVelocity: pl.Vec2, multiplier: number = 1) {
	const velocity = vector.fromAngle(2 * Math.PI * Math.random());
	const speed = multiplier * Math.random() * vector.dot(velocity, primaryVelocity); // can be negative
	velocity.mul(speed);
	return velocity;
}

function renderHeroCharacter(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	let color = heroColor(hero.id, world);

	const hitAge = hero.hitTick ? world.tick - hero.hitTick : Infinity;
	const flash = Math.max(0, (1 - hitAge / HeroColors.DamageFlashTicks));

	const angle = hero.body.getAngle();
	let radius = hero.radius;
	if (flash > 0) {
		radius += HeroColors.DamageGrowFactor * radius * flash;
	}

	let style = ColTuple.parse(color);
	if (flash > 0) {
		style.lighten(HeroColors.DamageGlowFactor * flash);
	}

	// Charging
	if (hero.casting && hero.casting.color && hero.casting.proportion > 0) {
		const strokeColor = ColTuple.parse(hero.casting.color).alpha(hero.casting.proportion);
		glx.circle(ctxStack, pos, {
			color: strokeColor,
			minRadius: radius,
			maxRadius: radius + ChargingIndicator.MinWidth,
			feather: {
				sigma: 0.03,
				alpha: DefaultGlow,
			},
		});
	} else if (hero.uiCastTrail) {
		const castRadius = ChargingIndicator.MinWidth + ChargingIndicator.WidthPerBonus * engine.calculateScalingFromHero(hero, world);
		const proportion = 1 - (world.tick - hero.uiCastTrail.castTick) / ChargingIndicator.TrailTicks;
		if (proportion > 0) {
			const strokeColor = ColTuple.parse(color).alpha(0.5 * proportion);
			glx.circle(ctxStack, pos, {
				color: strokeColor,
				minRadius: radius + castRadius * (1 - proportion),
				maxRadius: radius + castRadius,
				feather: {
					sigma: 0.03,
					alpha: DefaultGlow,
				},
			});
		}
	}

	// Shadow
	{
		glx.circle(ctxStack, pos.clone().add(ShadowOffset), {
			color: ColTuple.parse("rgba(0, 0, 0, 0.75)"),
			maxRadius: radius,
			feather: {
				sigma: ShadowFeatherRadius,
				alpha: 0.5,
			},
		});
	}

	// Fill
	{
		let gradient: r.Gradient = null;
		if (ctxStack.rtx >= r.GraphicsLevel.Normal) {
			const from = pos.clone();
			from.x += radius;
			from.y += -radius;

			const to = pos.clone();
			to.x += -radius;
			to.y += radius;

			gradient = {
				from,
				fromColor: style.clone(),
				to,
				toColor: style.clone().darken(0.5),
			};
		}
		glx.circle(ctxStack, pos, {
			color: style.clone().darken(0.25),
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
		let glyphColor = style.clone().mix(ColTuple.parse('#fff'), 0.5);
		glx.convex(ctxStack, pos, points, angle, radius, {
			color: glyphColor,
			maxRadius: radius,
		});
	}
}

function renderHeroInvisible(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, invisible: w.VanishBuff, world: w.World) {
	renderVanishSmoke(ctxStack, hero, world, pos);
}

function playHeroSounds(ctxStack: CanvasCtxStack, hero: w.Hero, heroPos: pl.Vec2, world: w.World) {
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
				const pos = heroPos.clone().addMul(hero.radius, vector.fromAngle(hero.body.getAngle()));
				const key = `${spell.sound}-${stage}`;
				ctxStack.sounds.push({
					id: `${hero.id}-${key}`,
					sound: key,
					pos,
				});
			}
		}
	}
}

function renderRangeIndicator(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	if (!(hero.id === world.ui.myHeroId && world.ui.toolbar.hoverSpellId && !isMobile)) {
		return;
	}

	let range = null;

	const spell = world.settings.Spells[world.ui.toolbar.hoverSpellId];
	if (spell.action === "projectile" || spell.action === "spray" || spell.action === "focus") {
		range = spell.projectile.speed * spell.projectile.maxTicks / constants.TicksPerSecond;
		if (spell.projectile.behaviours) {
			spell.projectile.behaviours.forEach(b => {
				if (b.type === "homing") {
					if (b.targetType === "self" && b.minDistanceToTarget > 0) {
						range = 2 * b.minDistanceToTarget; // Fudge factor of 2x
					} else if (b.newSpeed === 0 && b.trigger && b.trigger.afterTicks) {
						range = spell.projectile.speed * b.trigger.afterTicks / constants.TicksPerSecond;
					}
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
	} else if (spell.action === "buff") {
		spell.buffs.forEach(buff => {
			if (buff.type === "movement") {
				range = buff.movementProportion * hero.moveSpeedPerSecond * buff.maxTicks / constants.TicksPerSecond;
			} else if (buff.type === "vanish") {
				range = spell.movementProportionWhileChannelling * hero.moveSpeedPerSecond * buff.maxTicks / constants.TicksPerSecond;
			}
		});
	}

	if (range > 0.5) {
		range = 0.5;
	}

	if (range) {
		const color = ColTuple.parse(spell.color);

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

function renderHeroBars(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	const Hero = world.settings.Hero;

	const radius = hero.radius;

	// Health bar
	const ticksUntilStart = Math.max(0, world.startTick - world.tick);
	if (!(ticksUntilStart <= constants.Matchmaking.JoinPeriod || hero.health < Hero.MaxHealth)) {
		return;
	}

	// Health
	{
		const healthProportion = Math.max(0, hero.health / Hero.MaxHealth);
		const shineProportion = Math.max(0, hero.uiHealth / Hero.MaxHealth);
		const startProportion = Math.min(healthProportion, ticksUntilStart / constants.Matchmaking.JoinPeriod);

		let color = rgColor(healthProportion);
		if (startProportion > 0) {
			color.lighten(0.75 + 0.25 * startProportion);
		}

		const barY = pos.y - radius - HealthBar.Height - HealthBar.Margin;
		const barHalfWidth = HealthBar.HeroRadiusFraction * radius;
		const barHalfHeight = HealthBar.Height / 2;

		const barLeft = pl.Vec2(pos.x - barHalfWidth, barY);
		const barMid = pl.Vec2(barLeft.x + healthProportion * 2 * barHalfWidth, barY);
		const barShine = pl.Vec2(barLeft.x + shineProportion * 2 * barHalfWidth, barY);
		const barRight = pl.Vec2(pos.x + barHalfWidth, barY);

		glx.line(ctxStack, barLeft, barRight, {
			color: ColTuple.parse("#111"),
			maxRadius: barHalfHeight,
		});
		glx.line(ctxStack, barLeft, barMid, {
			color,
			maxRadius: barHalfHeight,
		});

		if (barShine > barMid) {
			glx.line(ctxStack, barMid, barShine, {
				color: ColTuple.parse("#ccc"),
				maxRadius: barHalfHeight,
			});
		} else {
			glx.line(ctxStack, barShine, barMid, {
				color: color.clone().darken(0.5),
				maxRadius: barHalfHeight,
			});
		}

		hero.uiHealth += 0.025 * (hero.health - hero.uiHealth);
	}
}

function renderHeroIcon(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	/*
	const player = world.players.get(hero.id);
	if (player.isBot) {
		renderHeroIconByName(ctxStack, hero, pos, AtlasAiIcon);
	}
	*/
}

function renderHeroIconByName(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, icon: string) {
	const texRect: ClientRect = atlasController.lookupImage(ctxStack, icon);
	if (!texRect) {
		return;
	}

	const drawWidth = HeroColors.IconSizePixels * ctxStack.pixel;
	const drawHeight = HeroColors.IconSizePixels * ctxStack.pixel;
	const yOffset = -hero.radius - HeroColors.IconMargin - drawHeight;
	const drawRect: ClientRect = {
		left: pos.x - drawWidth / 2,
		right: pos.x + drawWidth / 2,
		width: drawWidth,
		top: yOffset + pos.y,
		bottom: yOffset + pos.y + drawHeight,
		height: drawHeight,
	};
	glx.image(ctxStack, drawRect, texRect);
}

function renderHeroName(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	const texRect: ClientRect = atlasController.lookupImage(ctxStack, hero.id);
	if (!texRect) {
		return;
	}

	const yOffset = hero.radius + HeroColors.NameMargin;
	const drawWidth = HeroColors.NameWidthPixels * ctxStack.pixel;
	const drawHeight = HeroColors.NameHeightPixels * ctxStack.pixel;
	const drawRect: ClientRect = {
		left: pos.x - drawWidth / 2,
		right: pos.x + drawWidth / 2,
		width: drawWidth,
		top: yOffset + pos.y,
		bottom: yOffset + pos.y + drawHeight,
		height: drawHeight,
	};
	glx.image(ctxStack, drawRect, texRect);
}

function renderShield(ctxStack: CanvasCtxStack, shield: w.Shield, world: w.World) {
	const MaxAlpha = 0.75;
	const MinAlpha = 0.10;

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

	let color = ColTuple.parse((shield.selfColor && shield.owner === world.ui.myHeroId) ? HeroColors.MyHeroColor : shield.color);
	if (flash > 0) {
		color.lighten(HeroColors.ShieldGlowFactor * flash);
	}
	color.alpha((MaxAlpha - MinAlpha) * proportion + MinAlpha);

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
			sigma: shield.bloom !== undefined ? shield.bloom : HeroColors.GlowRadius,
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

		const tip = vector.fromAngle(angle).mul(shield.length).add(pos);
		glx.line(ctxStack, pos, tip, {
			color,
			minRadius: 0,
			maxRadius: shield.width,
			feather,
		});

		renderSaberTrail(ctxStack, shield, world);
	}
}

function renderSaberTrail(ctxStack: CanvasCtxStack, saber: w.Saber, world: w.World) {
	const previousAngle = saber.uiPreviousAngle || saber.body.getAngle();
	const newAngle = saber.body.getAngle();

	const antiClockwise = vector.angleDelta(previousAngle, newAngle) < 0;


	applyHighlight(saber.hitTick, saber, world);

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
		vanish: 1,
		glow: saber.glow,
		shine: saber.shine,
		highlight: saber.uiHighlight,
		tag: saber.id,
	}, world);

	saber.uiPreviousAngle = newAngle;

	if (saber.sound) {
		const intensity = Math.min(1, 10 * Math.abs(vector.angleDelta(previousAngle, newAngle)) / (2 * Math.PI));
		const tip = vector.fromAngle(newAngle).mul(saber.length);
		ctxStack.sounds.push({
			id: saber.id,
			sound: saber.sound,
			pos: tip,
			intensity,
		});
	}
}

function playShieldSounds(ctxStack: CanvasCtxStack, obj: w.Shield, world: w.World) {
	if (obj.sound) {
		ctxStack.sounds.push({
			id: obj.id,
			sound: obj.sound,
			pos: obj.body.getPosition().clone(),
		});

		if (obj.hitTick) {
			ctxStack.sounds.push({
				id: `${obj.id}-hit-${obj.hitTick}`, // Each hit has a unique ID
				sound: `${obj.sound}-hit`,
				pos: obj.body.getPosition().clone(),
			});
		}
	}
}

export function heroColor(heroId: string, world: w.World) {
	const player = world.players.get(heroId);
	if (player.userHash === world.ui.myUserHash) {
		return HeroColors.MyHeroColor;
	}
	
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

function rgColor(proportion: number): ColTuple {
	return ColTuple.hsl(proportion * 120.0, 100, 50);
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
		ctxStack.sounds.push({
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
	const velocity = swirl.smoke ? particleVelocity(context.baseVelocity, -swirl.smoke) : null;
	
	const multiplier = context.multiplier !== undefined ? context.multiplier : 1;
	const fillStyle = context.color || swirl.color;
	for (let i = 0; i < numParticles; ++i) {
		const angle = angleOffset + (2 * Math.PI) * i / numParticles;
		pushTrail({
			type: "circle",
			pos: vector.fromAngle(angle).mul(multiplier * swirl.radius).add(location),
			velocity,
			radius: multiplier * swirl.particleRadius,
			initialTick: world.tick,
			max: swirl.ticks, 
			fillStyle,
			shine: swirl.shine !== undefined ? swirl.shine : DefaultShine,
			glow: swirl.glow !== undefined ? swirl.glow : DefaultGlow,
			vanish: swirl.vanish,
			fade: swirl.fade,
			tag: context.tag,
		}, world);
	}

	if (swirl.bloom && ctxStack.rtx >= r.GraphicsLevel.High) {
		glx.circle(ctxStack, location, {
			color: ColTuple.parse(fillStyle),
			maxRadius: 0,
			feather: {
				sigma: swirl.bloom,
				alpha: swirl.glow !== undefined ? swirl.glow : DefaultGlow,
			},
		});
	}
}

function renderReticule(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, reticule: RenderReticule) {
	const finalTick = reticule.startingTicks ? (projectile.createTick + reticule.startingTicks) : projectile.expireTick;
	const remainingTicks = Math.max(0, finalTick - world.tick);
	if (reticule.remainingTicks && remainingTicks > reticule.remainingTicks) {
		// Only display when under remainingTicks
		return;
	}

	let proportion = 1;
	if (reticule.shrinkTicks) {
		let tick = remainingTicks;
		if (reticule.repeat) {
			tick = tick % reticule.shrinkTicks;
		}

		let multiplier = Math.min(1, tick / reticule.shrinkTicks);
		if (reticule.grow) {
			multiplier = 1 - multiplier;
		}

		proportion *= multiplier;
	}

	if (reticule.usePartialDamageMultiplier) {
		proportion *= engine.calculatePartialDamageMultiplier(world, projectile);
	}
	if (proportion <= 0) {
		return;
	}

	const pos = projectile.body.getPosition();

	let color = ColTuple.parse(reticule.color);

	const shine = reticule.shine !== undefined ? reticule.shine : DefaultShine;
	if (shine) {
		color.lighten(shine * proportion);
	}

	if (reticule.fade) {
		color.fade(proportion);
	}

	let feather: r.FeatherConfig = null;
	if (reticule.glow && ctxStack.rtx >= r.GraphicsLevel.High) {
		const bloom = reticule.bloom !== undefined ? reticule.bloom : DefaultBloomRadius;
		feather = {
			sigma: proportion * bloom,
			alpha: reticule.glow,
		};
	}

	glx.circle(ctxStack, pos, {
		color,
		minRadius: reticule.minRadius * proportion,
		maxRadius: reticule.radius * proportion,
		feather,
	});
}

function renderStrike(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, strike: RenderStrike) {
	if (!projectile.hitTick) {
		return;
	}

	if (!applyHighlight(projectile.hitTick, projectile, world, strike.glow, strike.growth)) {
		return;
	}

	// Particles
	if (strike.numParticles) {
		for (let i = 0; i < strike.numParticles; ++i) {
			const velocity = particleVelocity(projectile.body.getLinearVelocity(), strike.speedMultiplier || 1);
			pushTrail({
				type: "circle",
				initialTick: projectile.hitTick,
				max: strike.ticks,
				pos: projectile.body.getPosition().clone(),
				velocity,
				radius: projectile.radius,
				fillStyle: projectileColor(strike, projectile, world),
				vanish: strike.particleVanish,
				glow: strike.particleGlow !== undefined ? strike.particleGlow : DefaultGlow,
				shine: strike.particleShine !== undefined ? strike.particleShine: DefaultShine,
				bloom: strike.particleBloom !== undefined ? strike.particleBloom : DefaultBloomRadius,
				highlight: projectile.uiHighlight,
				tag: projectile.id,
			}, world);
		}
	}

	// Detonation
	if (strike.detonate) {
		pushTrail({
			type: "circle",
			max: 15,
			initialTick: world.tick,
			pos: projectile.body.getPosition().clone(),
			fillStyle: 'white',
			radius: strike.detonate,
			bloom: DefaultBloomRadius,
			glow: DefaultGlow,
		}, world);
	}
}

function renderUnattachedLink(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, render: RenderLink) {
	let owner: w.WorldObject = world.objects.get(projectile.owner);
	if (owner && owner.category == "hero") {
		renderLinkBetween(ctxStack, owner, projectile, world, render);
	}
}

function renderLinkBetween(ctxStack: CanvasCtxStack, owner: w.Hero, target: w.WorldObject, world: w.World, render: RenderLink, highlight?: w.TrailHighlight) {
	let color = ColTuple.parse(render.color);
	let scale = 1;

	if (highlight) {
		const highlightProportion = calculateHighlightProportion(highlight, world);
		if (highlightProportion > 0) {
			color.lighten(highlightProportion);
			scale += highlight.growth * highlightProportion;
		}
	}

	const fromFill: r.Fill = {
		color,
		maxRadius: scale * render.width / 2,
		feather: (render.glow && ctxStack.rtx >= r.GraphicsLevel.High) ? {
			sigma: render.bloom !== undefined ? render.bloom : HeroColors.GlowRadius,
			alpha: render.glow,
		} : null,
	};

	const toFill = { ...fromFill };
	const shine = render.shine !== undefined ? render.shine : DefaultShine;
	if (shine) {
		toFill.color = fromFill.color.clone().lighten(shine);
	}
	if (render.toWidth) {
		toFill.maxRadius = scale * render.toWidth / 2;
	}

	const from = owner.body.getPosition();
	const to = target.body.getPosition();
	glx.line(ctxStack, from, to, fromFill, toFill);
}

function renderRay(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, render: RenderRay) {
	let previous: pl.Vec2 = null;

	const multiplier = projectileRadiusMultiplier(projectile, world, render);

	const path = projectile.uiPath;
	const step = render.intermediatePoints ? 1 : path.length - 1;
	for (let i = 0; i < path.length; i += step) {
		const pos = path[i];

		if (previous) {
			pushTrail({
				type: 'line',
				initialTick: world.tick,
				max: render.ticks, 
				from: previous,
				to: pos,
				fillStyle: projectileColor(render, projectile, world),
				shine: render.shine !== undefined ? render.shine : DefaultShine,
				fade: render.fade,
				vanish: render.vanish,
				width: multiplier * projectile.radius * 2,
				glow: render.glow !== undefined ? render.glow : DefaultGlow,
				bloom: render.bloom,
				highlight: projectile.uiHighlight,
				tag: projectile.id,
			}, world);
		}

		previous = pos;
	}
}

function renderProjectile(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, render: RenderProjectile) {
	let ticks = render.ticks;
	const velocity = render.smoke ? particleVelocity(projectile.body.getLinearVelocity(), -render.smoke) : null;

	const last = projectile.body.getPosition();
	const first = projectile.uiPath[0] || last;
	const numRenders = 1 + (render.intermediateInterpolations || 0);
	for (let i = 1; i <= numRenders; ++i) {
		const proportion = i / numRenders;
		const pos = pl.Vec2.combine(1 - proportion, first, proportion, last);
		pushTrail({
			type: 'circle',
			initialTick: world.tick,
			max: ticks,
			pos,
			velocity,
			fillStyle: projectileColor(render, projectile, world),
			shine: render.shine !== undefined ? render.shine : DefaultShine,
			fade: render.fade,
			radius: projectileRadiusMultiplier(projectile, world, render) * projectile.radius,
			glow: render.glow !== undefined ? render.glow : DefaultGlow,
			bloom: render.bloom,
			vanish: render.vanish,
			highlight: projectile.uiHighlight,
			tag: projectile.id,
		}, world);
	}
}

function renderPolygon(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, render: RenderPolygon) {
	let ticks = render.ticks;
	const angle = ((world.tick % render.revolutionInterval) / render.revolutionInterval) * 2 * Math.PI;
	const velocity = render.smoke ? particleVelocity(projectile.body.getLinearVelocity(), -render.smoke) : null;

	const points = new Array<pl.Vec2>();
	for (let i = 0; i < render.numPoints; ++i) {
		points.push(vector.fromAngle((i / render.numPoints) * 2 * Math.PI));
	}

	pushTrail({
		type: 'polygon',
		initialTick: world.tick,
		max: ticks,
		pos: projectile.body.getPosition().clone(),
		points,
		angle,
		velocity,
		fillStyle: projectileColor(render, projectile, world),
		fade: render.fade,
		extent: projectileRadiusMultiplier(projectile, world, render) * projectile.radius,
		shine: render.shine !== undefined ? render.shine : DefaultShine,
		glow: render.glow,
		bloom: render.bloom,
		highlight: projectile.uiHighlight,
		tag: projectile.id,
	}, world);
}

function renderBloom(ctxStack: CanvasCtxStack, projectile: w.Projectile, world: w.World, render: RenderBloom) {
	let color = ColTuple.parse(projectileColor(render, projectile, world));
	if (render.shine) {
		color.lighten(render.shine);
	}
	glx.circle(ctxStack, projectile.body.getPosition(), {
		color,
		maxRadius: 0,
		feather: {
			sigma: render.radius !== undefined ? render.radius : DefaultBloomRadius,
			alpha: render.glow !== undefined ? render.glow : DefaultGlow,
		},
	});
}

function projectileRadiusMultiplier(projectile: w.Projectile, world: w.World, render: RenderProjectile | RenderRay | RenderPolygon): number {
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

	let color = ColTuple.parse(trail.fillStyle);
	if (trail.shine) {
		color.lighten(trail.shine * proportion);
	}
	if (trail.fade) {
		color.mix(ColTuple.parse(trail.fade), 1 - proportion);
	}
	if (trail.highlight) {
		const highlightProportion = calculateHighlightProportion(trail.highlight, world);
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
	if (trail.vanish) {
		color.fade(trail.vanish * (1 - proportion));
	}

	let feather: r.FeatherConfig = null;
	if (trail.glow && ctxStack.rtx >= r.GraphicsLevel.High) {
		feather = {
			sigma: scale * proportion * (trail.bloom !== undefined ? trail.bloom : HeroColors.GlowRadius),
			alpha: trail.glow,
		};
	}

	if (trail.type === "circle") {
		let pos = trail.pos;
		if (trail.velocity) {
			const time = (world.tick - trail.initialTick) / constants.TicksPerSecond;
			pos = pos.clone().addMul(time, trail.velocity);
		}

		const radius = scale * proportion * trail.radius;

		glx.circle(ctxStack, pos, {
			color,
			maxRadius: radius,
			feather,
		});
	} else if (trail.type === "polygon") {
		let pos = trail.pos;
		if (trail.velocity) {
			const time = (world.tick - trail.initialTick) / constants.TicksPerSecond;
			pos = pos.clone().addMul(time, trail.velocity);
		}

		const extent = scale * proportion * trail.extent;

		glx.convex(ctxStack, pos, trail.points, trail.angle, extent, {
			color,
			maxRadius: extent,
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
			color,
			minRadius,
			maxRadius,
			feather,
		});
	} else if (trail.type === "arc") {
		glx.arc(ctxStack, trail.pos, trail.fromAngle, trail.toAngle, trail.antiClockwise, {
			color,
			minRadius: trail.minRadius,
			maxRadius: trail.maxRadius,
			feather: feather,
		});
	}

	return false;
}

function calculateHighlightProportion(highlight: w.TrailHighlight, world: w.World) {
	return Math.max(0, 1 - ((world.tick - highlight.fromTick) / highlight.maxTicks));
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
		const radius = offset.length();

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
	const hoverSpellId = world.ui.toolbar.hoverSpellId;

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
			emphasis: 1,
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
			const size = ButtonBar.Size * (key.barSize || 1);

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

			let hitSector: w.HitSector = { startAngle, endAngle, weight: key.wheelSize || 1.0 };
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
		emphasis: 1,
	};

	let isSelected = selectedAction === spell.id || world.ui.nextSpellId === spell.id;
	let isHovered = world.ui.toolbar.hoverSpellId === spell.id;
	let age = (world.tick - (hero.spellChangedTick.get(spell.id) || 0)) / constants.TicksPerSecond;
	let remainingInSeconds = engine.cooldownRemaining(world, hero, spell.id) / constants.TicksPerSecond;

	if (isSelected) {
		button.color = '#f0f0f0';
	} else if (remainingInSeconds > 1) {
		button.color = '#222';
		button.emphasis = 0.7;
	} else if (remainingInSeconds > 0.2) {
		button.color = '#777';
	} else if (remainingInSeconds > 0.1) {
		button.color = '#111';
	} else if (remainingInSeconds > 0) {
		button.color = '#eee';
	}

	if (age < 0.1) {
		button.color = ColTuple.parse(button.color).darken(0.5).string();
	}
	if (isHovered) {
		button.color = ColTuple.parse(button.color).lighten(0.25).string();
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
	const emphasis = buttonState.emphasis;
	if (buttonState) {
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
        ctx.fillStyle = buttonState.color;
		
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.fill();

		ctx.clip();

		renderIconOnly(ctx, icons.getIcon(buttonState.icon, iconLookup), emphasis * 0.6, size);

		if (buttonState.cooldownText) {
			// Cooldown
			let cooldownText = buttonState.cooldownText

			ctx.font = 'bold ' + (size * 0.75 - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, cooldownText, size / 2, size / 2, emphasis);
		} else {
			const key = buttonState.key;
			if (key && !keyboardUtils.isSpecialKey(key)) {
				// Keyboard shortcut
				ctx.save();

				ctx.font = 'bold ' + (size / 2 - 1) + 'px sans-serif';

				renderTextWithShadow(ctx, key.toUpperCase(), size / 4, size * 3 / 4, emphasis);

				ctx.restore();
			}
		}


		ctx.restore();
	} else {
		ctx.clearRect(0, 0, size, size);
	}
}

function renderWheelButton(ctx: CanvasRenderingContext2D, sector: w.HitSector, innerRadius: number, outerRadius: number, buttonState: w.ButtonRenderState, iconLookup: IconLookup) {
	outerRadius = innerRadius + sector.weight * (outerRadius - innerRadius);

	const emphasis = buttonState.emphasis;

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
			const midVector = vector.fromAngle((sector.startAngle + sector.endAngle) / 2).mul((innerRadius + outerRadius) / 2);
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
			renderTextWithShadow(ctx, cooldownText, 0, 0, emphasis);

			ctx.restore();
		}

		ctx.restore();
	}

	ctx.restore();
}

function renderTextWithShadow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, emphasis: number = 1) {
	ctx.save();

	ctx.fillStyle = 'black';
	ctx.fillText(text, x + 1, y + 1);

	ctx.fillStyle = ColTuple.parse('#fff').darken(1 - emphasis).string();
	ctx.fillText(text, x, y);

	ctx.restore();
}

function pushTrail(trail: w.Trail, world: w.World) {
	if (world.ui.renderedTick === world.tick) {
		// If network hangs and we keep re-rendering the same frame, don't need to add another trail to a tick when it already has one
		return;
	}
	world.ui.trails.push(trail);
}

function underlay(trail: w.Trail, world: w.World) {
	if (world.ui.renderedTick === world.tick) {
		// If network hangs and we keep re-rendering the same frame, don't need to add another trail to a tick when it already has one
		return;
	}
	world.ui.underlays.unshift(trail);
}