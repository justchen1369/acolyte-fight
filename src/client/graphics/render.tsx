import _ from 'lodash';
import * as pl from 'planck-js';
import * as atlas from './atlas';
import * as audio from '../audio/audio';
import * as constants from '../../game/constants';
import * as engine from '../../game/engine';
import * as glx from './glx';
import * as keyboardUtils from '../core/keyboardUtils';
import * as icons from '../core/icons';
import * as shapes from '../../game/shapes';
import * as r from './render.model';
import * as vector from '../../game/vector';
import * as w from '../../game/world.model';

import { Alliances } from '../../game/constants';
import { CanvasStack, CanvasCtxStack, RenderOptions } from './render.model';
import ColTuple from './colorTuple';
import { renderIconOnly } from './renderIcon';

export { CanvasStack, RenderOptions, GraphicsLevel } from './render.model';

const HeroAtlasSizeMultiplier = 2; // Draw larger than the hero to ensure the edges are not cut off

const VectorZero = pl.Vec2(0, 0);
const MapCenter = pl.Vec2(0.5, 0.5);
const MaxDestroyedTicks = constants.TicksPerSecond;

const DefaultBloomRadius = 0.03;
const DefaultParticleBloomRadius = 0.015;

const DefaultShine = 0.5;
const DefaultGlow = 0.2;

const DefaultCastingGlow = 0.1;

const ShadowOffset = pl.Vec2(0, 0.005);
const ShadowFeatherRadius = 0.001;

const EaseDecay = 0.9;

interface SwirlContext {
	color?: string;
	baseVelocity?: pl.Vec2;
	tag?: string;
	multiplier?: number;
}

interface RenderObstacleContext {
	pos: pl.Vec2;
	highlight: HighlightResult;
	healthProportion: number;
	ease: number;
}

interface HighlightResult {
	created: boolean; // A new highlight was created
	proportion: number;
	flash: number;
	growth: number;
	bloom: number;
	params: w.TrailHighlight;
}

// Rendering
function resetRenderState(world: w.World) {
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
	const Visuals = world.settings.Visuals;

	// Calculate max zoom
	const rect = canvasStack.ui.getBoundingClientRect();
	const pixels = Math.min(rect.width, rect.height);
	const maxZoom = Math.max(1, Math.min(Visuals.CameraMaxZoom, Visuals.CameraMinPixelsForZoom / pixels));

	// Load existing camera
	const camera = world.ui.camera;

	// Choose new target
	let clampZoom = maxZoom;
	let cameraTarget: w.Camera = {
		zoom: 1,
		center: MapCenter,
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
				cameraTarget.zoom = Math.abs(zoom - camera.zoom) <= Visuals.CameraZoomTolerance ? camera.zoom : zoom;
			}

			// New center - only pan if some zooming is involved or if can't see entire map
			if (maxZoom > 1 || engine.calculateWorldMinExtent(world) > 0.5) {
				let center = pl.Vec2(
					Visuals.CameraSmoothRate * pos.x + (1 - Visuals.CameraSmoothRate) * target.x,
					Visuals.CameraSmoothRate * pos.y + (1 - Visuals.CameraSmoothRate) * target.y,
				);
				cameraTarget.center = vector.distance(center, camera.center) <= Visuals.CameraCenterTolerance ? camera.center : center;
			}
		}
	}

	// Ease
	const newCamera: w.Camera = {
		zoom: Math.min(clampZoom, Visuals.CameraZoomRate * cameraTarget.zoom + (1 - Visuals.CameraZoomRate) * camera.zoom),
		center: pl.Vec2(
			Visuals.CameraPanRate * cameraTarget.center.x + (1 - Visuals.CameraPanRate) * camera.center.x,
			Visuals.CameraPanRate * cameraTarget.center.y + (1 - Visuals.CameraPanRate) * camera.center.y,
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
	if (invalidRenderState(world, rect, options)) {
		resetRenderState(world);
	}

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
		tick: world.tick,
		mobile: options.mobile,
	};
	if (!(ctxStack.gl && ctxStack.ui)) {
		throw "Error getting context";
	}

	if (world.ui.initialRenderTick === undefined) {
		world.ui.initialRenderTick = world.tick;
	}
	glx.initGl(ctxStack);
	glx.clearGl(ctxStack);

	renderAtlas(ctxStack, world, options);
	renderWorld(ctxStack, world, worldRect, options);
	renderCursor(ctxStack, world);
	renderInterface(ctxStack.ui, world, rect, options);

	const background = ColTuple.parse(options.hideMap ? '#000' : world.background);
	glx.renderGl(ctxStack, worldRect, rect, background);

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

function invalidRenderState(world: w.World, rect: ClientRect, options: RenderOptions) {
	const buttonBar = world.ui.buttonBar;
	if (buttonBar) {
		if (buttonBar.screenHeight !== rect.height || buttonBar.screenWidth !== rect.width || buttonBar.retinaMultiplier !== options.retinaMultiplier) {
			return true;
		} else if (buttonBar.view === "wheel" && buttonBar.wheelOnRight !== options.wheelOnRight) {
			return true;
		} else if (touchControls(buttonBar) !== options.mobile) {
			return true;
		}
	}
	return false;
}

function renderAtlas(ctxStack: CanvasCtxStack, world: w.World, options: RenderOptions) {
	atlas.renderAtlas(ctxStack, r.Texture.Text, prepareTextAtlas(ctxStack, world, options));
	atlas.renderAtlas(ctxStack, r.Texture.Images, prepareHeroAtlas(ctxStack, world, options));
}

function prepareTextAtlas(ctxStack: CanvasCtxStack, world: w.World, options: RenderOptions): r.AtlasInstruction[] {
	const instructions = new Array<r.AtlasInstruction>();

	world.players.forEach(player => {
		instructions.push(heroNameInstruction(ctxStack, player, world, options));
	});

	return instructions;
}

function prepareHeroAtlas(ctxStack: CanvasCtxStack, world: w.World, options: RenderOptions): r.AtlasInstruction[] {
	const instructions = new Array<r.AtlasInstruction>();

	world.players.forEach(player => {
		instructions.push(...heroBodyInstructions(ctxStack, player, world));
	});

	return instructions;
}

function playSounds(ctxStack: CanvasCtxStack, world: w.World, options: RenderOptions) {
	if (world.tick <= world.ui.playedTick // Already played this tick
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
	renderMap(ctxStack, world, options);

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
	world.ui.events.forEach(obj => renderEvent(ctxStack, obj, world, options));

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

	if (!ctxStack.mobile) {
		return;
	}

	const target = world.ui.nextTarget;
	if (!target) {
		return;
	}

	const fill: r.TrailFill = {
		color: ColTuple.parse("#fff"),
		maxRadius: 1 * ctxStack.pixel,
	};
	glx.lineTrail(ctxStack, pl.Vec2(target.x, target.y - CrossHairSize), pl.Vec2(target.x, target.y + CrossHairSize), fill);
	glx.lineTrail(ctxStack, pl.Vec2(target.x - CrossHairSize, target.y), pl.Vec2(target.x + CrossHairSize, target.y), fill);
}

function renderObject(ctxStack: CanvasCtxStack, obj: w.WorldObject, world: w.World, options: RenderOptions) {
	if (obj.category === "hero") {
		renderHero(ctxStack, obj, world, options);
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
		playObstacleSounds(ctxStack, obj, world);
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

	applyHighlight(hero.link.redirectDamageTick, hero.link, world, hero.link.render.strike);
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
			glow: 0.05,
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

	const particleRadius = Math.min(MaxParticleRadius, shapes.getMinExtent(obstacle.shape));

	for (let i = 0; i < NumParticles; ++i) {
		const pos = shapes.proportionalEdgePoint(obstacle.shape, obstacle.body.getPosition(), obstacle.body.getAngle(), Math.random(), Math.random(), particleRadius);
		const edgeOffset = vector.diff(pos, MapCenter);
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
	// Don't render anything
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

function renderCast(ctxStack: CanvasCtxStack, ev: w.CastEvent, world: w.World, options: RenderOptions) {
	if (!options.targetingIndicator) { return; }

	if (ev.success) { return; } // Only care when the cast failed

	const Visuals = world.settings.Visuals;

	if (world.ui.myHeroId !== ev.heroId) {
		return; // Only show off cooldown indicator for self
	}

	const radius = Visuals.CastFailedRadius;
	const points = [
		vector.fromAngle(vector.Tau * 1 / 8, radius).add(ev.target),
		vector.fromAngle(vector.Tau * 3 / 8, radius).add(ev.target),
		vector.fromAngle(vector.Tau * 5 / 8, radius).add(ev.target),
		vector.fromAngle(vector.Tau * 7 / 8, radius).add(ev.target),
	];
	pushTrail({
		type: 'line',
		initialTick: ev.tick,
		max: Visuals.CastFailedTicks,
		from: points[0],
		to: points[2],
		width: Visuals.CastFailedLineWidth,
		fillStyle: Visuals.CastFailedColor,
		vanish: 1,
	}, world);
	pushTrail({
		type: 'line',
		initialTick: ev.tick,
		max: Visuals.CastFailedTicks,
		from: points[1],
		to: points[3],
		width: Visuals.CastFailedLineWidth,
		fillStyle: Visuals.CastFailedColor,
		vanish: 1,
	}, world);
}

function renderEvent(ctxStack: CanvasCtxStack, ev: w.WorldEvent, world: w.World, options: RenderOptions) {
	if (ev.type === "detonate") {
		renderDetonate(ctxStack, ev, world);
	} else if (ev.type === "lifeSteal") {
		renderLifeStealReturn(ctxStack, ev, world);
	} else if (ev.type === "teleport") {
		renderTeleport(ctxStack, ev, world);
	} else if (ev.type === "push") {
		renderPush(ctxStack, ev, world);
	} else if (ev.type === "cooldown") {
		renderSetCooldown(ctxStack, ev, world);
	} else if (ev.type === "cast") {
		renderCast(ctxStack, ev, world, options);
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

function renderTeleport(ctxStack: CanvasCtxStack, ev: w.TeleportEvent, world: w.World) {
	const Hero = world.settings.Hero;
	const MaxTicks = 15;

	const color = heroColor(ev.heroId, world);

	if (ev.fromPos) {
		renderJumpSmoke(ctxStack, color, ev.fromPos, world, ev.tick);
	}

	if (ev.toPos) {
		renderJumpSmoke(ctxStack, color, ev.toPos, world, ev.tick);

		if (ctxStack.rtx > r.GraphicsLevel.Low) {
			pushTrail({
				type: "ripple",
				max: MaxTicks,
				initialTick: ev.tick,
				pos: ev.toPos,
				fillStyle: color,
				shine: DefaultShine,
				glow: DefaultGlow,
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
		unshiftTrail({ // Smoke at bottom
			type: "circle",
			pos,
			velocity: vector.fromAngle(Math.random() * 2 * Math.PI).mul(MaxSpeed * Math.random()),
			radius: Hero.Radius,
			initialTick: initialTick,
			max: MaxTicks,
			fillStyle: color,
			bloom: 0.015,
			glow: DefaultGlow,
		}, world);
	}
}

function renderPush(ctxStack: CanvasCtxStack, ev: w.PushEvent, world: w.World) {
	const Visuals = world.settings.Visuals;

	if (world.ui.myHeroId && !(ev.owner === world.ui.myHeroId || ev.objectId === world.ui.myHeroId)) {
		return;
	}

	const shake: w.Shake = {
		fromTick: ev.tick,
		maxTicks: Visuals.ShakeTicks,
		direction: vector.relengthen(ev.direction, Visuals.ShakeDistance),
	};
	if (world.tick < shake.fromTick + shake.maxTicks) {
		world.ui.shakes.push(shake);
	}

	const highlight: w.MapHighlight = {
		fromTick: ev.tick,
		maxTicks: Visuals.HighlightTicks,
		color: ev.color || '#ffffff',
	};
	if (world.tick < highlight.fromTick + highlight.maxTicks) {
		world.ui.highlights.push(highlight);
	}
}

function renderMap(ctxStack: CanvasCtxStack, world: w.World, options: RenderOptions) {
	if (options.hideMap) {
		return;
	}

	const Visuals = world.settings.Visuals;

	const shake = takeShakes(world);
	const pos = pl.Vec2(0.5, 0.5);
	if (options.shake) {
		pos.add(shake);
	}

	let scale = 1;
	let color: ColTuple;
	let hexColor: ColTuple;
	if (world.winner) {
		const proportion = Math.max(0, 1 - (world.tick - (world.winTick || 0)) / Visuals.WorldAnimateWinTicks);
		scale *= 1 + Visuals.WorldWinGrowth * proportion;
		color = ColTuple.parse(heroColor(world.winner, world)).darken(0.5 * (1 - proportion));
		hexColor = color.clone();
	} else {
		color = ColTuple.parse(world.color);
		hexColor = color.clone();
	}

	const highlight = takeHighlights(world);
	if (highlight && options.shake) {
		const proportion = Math.max(0, 1 - (world.tick - highlight.fromTick) / highlight.maxTicks);

		color.mix(ColTuple.parse(highlight.color), Visuals.HighlightFactor * proportion);
		hexColor.mix(ColTuple.parse(highlight.color).lighten(Visuals.HighlightHexShineFactor * proportion), Visuals.HighlightHexFactor * proportion);
	}

	const easeMultiplier = ease(world.ui.initialRenderTick, world);
	if (easeMultiplier > 0) {
		scale *= 1 - easeMultiplier;
	}

	const strokeStyle = color.clone().adjust(Visuals.WorldStrokeBrightness);
	const hex: r.HexConfig = {
		heightPixels: Visuals.WorldHexHeight,
		widthPixels: Visuals.WorldHexWidth,
		mask: ctxStack.rtx >= r.GraphicsLevel.Ultra ? Visuals.WorldHexMask : 0,
		interval: Visuals.WorldHexInterval,
		color: hexColor,
	};

	const minExtent = engine.calculateWorldMinExtent(world);
	const strokeExtent = Visuals.WorldStrokeProportion * minExtent;
	if (world.shape.type === "radial") {
		const maxExtentMultiplier = shapes.calculateMaxExtentMultiplier(world.shape.points.length);
		glx.convexPlate(ctxStack, pos, world.shape.points, world.angle, minExtent * scale, {
			color,
			radius: scale * minExtent * maxExtentMultiplier,
			strokeColor: strokeStyle,
			stroke: strokeExtent,
			hex,
		});
	} else if (world.shape.type === "circle") {
		const radius = world.shape.radius;
		glx.circlePlate(ctxStack, pos, {
			color,
			stroke: strokeExtent,
			strokeColor: strokeStyle,
			radius: scale * radius * minExtent,
			hex,
		});
	}
}

function takeShakes(world: w.World) {
	const Visuals = world.settings.Visuals;

	let offset = vector.zero();
	const keep = new Array<w.Shake>();
	world.ui.shakes.forEach(shake => {
		const proportion = Math.min(1, Math.max(0, 1 - (world.tick - shake.fromTick) / shake.maxTicks));
		if (proportion > 0) {
			keep.push(shake);

			const magnitude = Math.pow(proportion, Visuals.ShakeDampening) * Math.cos(Visuals.ShakeCycles * proportion * 2 * Math.PI);
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
	if (options.hideMap) {
		return;
	}

	const highlight = applyHighlight(obstacle.activeTick, obstacle, world, obstacle.strike);
	const healthProportion = obstacle.health / obstacle.maxHealth;
	const easeMultiplier = ease(Math.max(obstacle.createTick, world.ui.initialRenderTick), world);
	
	const pos = obstacle.body.getPosition().clone();
	if (obstacle.uiEase) {
		pos.add(obstacle.uiEase);
		obstacle.uiEase.mul(EaseDecay);
	}

	const params: RenderObstacleContext = {
		pos,
		highlight,
		healthProportion,
		ease: easeMultiplier,
	};

	obstacle.render.forEach(render => {
		if (render.type === "solid") {
			renderObstacleSolid(ctxStack, obstacle, params, render, world);
		} else if (render.type === "bloom") {
			renderObstacleBloom(ctxStack, obstacle, params, render, world);
		} else if (render.type === "smoke") {
			renderObstacleSmoke(ctxStack, obstacle, params, render, world)
		}
	});
}

function playObstacleSounds(ctxStack: CanvasCtxStack, obj: w.Obstacle, world: w.World) {
	if (obj.sound) {
		if (obj.activeTick) {
			ctxStack.sounds.push({
				id: `${obj.id}-touch-${obj.activeTick}`, // Each touch has a unique ID
				sound: obj.sound,
				pos: obj.body.getPosition().clone(),
			});
		}
	}
}

function calculateObstacleColor(obstacle: w.Obstacle, context: RenderObstacleContext, fill: SwatchColor, world: w.World) {
	let color = ColTuple.parse(fill.color);

	if (fill.deadColor && context.healthProportion < 1) {
		color.mix(ColTuple.parse(fill.deadColor), 1 - context.healthProportion);
	}

	if (context.highlight && context.highlight.flash) {
		const flash = fill.flash !== undefined ? fill.flash : true;
		if (flash) {
			color.lighten(context.highlight.flash);
		}
	}

	return color;
}

function renderObstacleSolid(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, context: RenderObstacleContext, fill: SwatchFill, world: w.World) {
	const Visuals = world.settings.Visuals;

	if (fill.shadow && ctxStack.rtx <= r.GraphicsLevel.Low) {
		// No shadows for Low
		return;
	}

	const color = calculateObstacleColor(obstacle, context, fill, world);

	const pos = obstacle.body.getPosition();
	const angle = obstacle.body.getAngle();

	let scale = 1;
	if (context.ease > 0) {
		scale *= 1 - context.ease;
	}

	let feather: r.FeatherConfig = null;
	if (fill.glow && ctxStack.rtx >= r.GraphicsLevel.Ultra) {
		feather = {
			sigma: fill.bloom !== undefined ? fill.bloom : Visuals.DefaultGlowRadius,
			alpha: fill.glow,
		};
	}

	const highlight = context.highlight;
	const shape = obstacle.shape;
	if (shape.type === "polygon" || shape.type === "radial") {
		let drawShape = shape;
		let growth = 0;
		if (highlight && highlight.growth) {
			growth += highlight.growth;
		}
		if (fill.expand) {
			growth += fill.expand;
		}
		if (growth !== 0) {
			drawShape = shapes.grow(drawShape, growth) as shapes.Polygon;
		}

		let drawPos = vector.scaleAround(pos, MapCenter, scale);
		if (fill.shadow) {
			drawPos = drawPos.clone().add(ShadowOffset);
		}

		glx.convexSwatch(ctxStack, drawPos, drawShape.points, angle, scale, {
			color,
			maxRadius: 1,
			feather,
		});
	} else if (shape.type === "arc") {
		const center = shapes.toWorldCoords(pos, angle, shape.localCenter);

		let radialExtent = shape.radialExtent;
		if (highlight && highlight.growth) {
			radialExtent += highlight.growth;
		}
		if (fill.expand) {
			radialExtent += fill.expand;
		}

		const drawPos = vector.scaleAround(center, MapCenter, scale);
		const fromAngle = angle - shape.angularExtent;
		const toAngle = angle + shape.angularExtent;
		glx.arcSwatch(ctxStack, drawPos, fromAngle, toAngle, false, {
			color,
			minRadius: scale * (shape.radius - radialExtent),
			maxRadius: scale * (shape.radius + radialExtent),
			feather,
		});
	} else if (shape.type === "circle") {
		let radius = shape.radius;
		if (highlight && highlight.growth) {
			radius += highlight.growth;
		}
		if (fill.expand) {
			radius += fill.expand;
		}

		let drawPos = vector.scaleAround(pos, MapCenter, scale);
		if (fill.shadow) {
			drawPos = drawPos.clone().add(ShadowOffset);
		}
		glx.circleSwatch(ctxStack, drawPos, {
			color,
			maxRadius: scale * radius,
			feather,
		});
	}
}

function renderObstacleBloom(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, context: RenderObstacleContext, fill: SwatchBloom, world: w.World) {
	if (ctxStack.rtx < r.GraphicsLevel.Ultra) {
		return;
	}

	const color = calculateObstacleColor(obstacle, context, fill, world);
	let bloom = fill.bloom !== undefined ? fill.bloom : DefaultBloomRadius;

	const highlight = context.highlight;
	if (highlight && highlight.bloom) {
		bloom += highlight.bloom;
	}

	if (fill.strikeOnly) {
		if (highlight) {
			color.fade(1 - highlight.proportion);
		} else {
			return;
		}
	}

	let scale = 1;
	if (context.ease > 0) {
		scale *= 1 - context.ease;
	}

	if (!(bloom && color.a > 0)) {
		return;
	}

	const extent = shapes.getMinExtent(obstacle.shape);
	let feather: r.FeatherConfig = {
		sigma: extent + scale * bloom,
		alpha: fill.glow !== undefined ? fill.glow : DefaultGlow,
	};

	const pos = obstacle.body.getPosition();
	const drawPos = vector.scaleAround(pos, MapCenter, scale);

	glx.circleTrail(ctxStack, drawPos, {
		color,
		maxRadius: 0,
		feather,
	});
}

function renderObstacleSmoke(ctxStack: CanvasCtxStack, obstacle: w.Obstacle, params: RenderObstacleContext, smoke: SwatchSmoke, world: w.World) {
	if (ctxStack.rtx < r.GraphicsLevel.High) {
		return;
	}

	if (smoke.interval && (world.tick % smoke.interval) !== 0) {
		return;
	}

	let particleRadius = Math.min(smoke.particleRadius, shapes.getMinExtent(obstacle.shape));

	let pos = shapes.proportionalEdgePoint(obstacle.shape, obstacle.body.getPosition(), obstacle.body.getAngle(), Math.random(), Math.random(), particleRadius);
	const outward = vector.diff(pos, MapCenter);
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

	if (params.ease > 0) {
		const scale = 1 - params.ease;
		pos = vector.scaleAround(pos, MapCenter, scale);
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
		shine: smoke.shine,
		fade: smoke.fade,
		glow: smoke.glow,
		bloom: smoke.bloom,
		vanish: smoke.vanish,
		highlight: obstacle.uiHighlight,
	}, world);
}

function applyHighlight(activeTick: number, obj: w.HighlightSource, world: w.World, strike: RenderStrikeParams): HighlightResult {
	const created = modifyHighlight(activeTick, obj, world, strike);

	if (obj.uiHighlight && world.tick >= obj.uiHighlight.fromTick + obj.uiHighlight.maxTicks) {
		obj.uiHighlight = null;
	}

	const highlight = obj.uiHighlight;
	if (highlight) {
		const proportion = calculateHighlightProportion(highlight, world);
		return {
			created,
			proportion,
			flash: highlight.flash ? proportion : 0,
			growth: highlight.growth ? proportion * highlight.growth : 0,
			bloom: highlight.bloom ? proportion * highlight.bloom : 0,
			params: highlight,
		};
	} else {
		return null;
	}
}

function modifyHighlight(activeTick: number, obj: w.HighlightSource, world: w.World, strike: RenderStrikeParams) {
	if (!strike) {
		// No highlight configured
		return false;
	}

	const Visuals = world.settings.Visuals;

	if (!activeTick) {
		return false;
	}

	const highlightTick = obj.uiHighlight ? obj.uiHighlight.fromTick : 0;
	if (activeTick <= highlightTick) {
		// Already highlighted
		return false;
	}

	// Highlight
	const highlight: w.TrailHighlight = {
		tag: obj.id,
		fromTick: activeTick,
		maxTicks: strike.ticks || Visuals.DefaultFlashTicks,
		flash: strike.flash,
		growth: strike.growth,
		bloom: strike.bloom,
	};
	obj.uiHighlight = highlight;

	world.ui.changedTrailHighlights.set(highlight.tag, highlight);

	return true;
}

function renderHero(ctxStack: CanvasCtxStack, hero: w.Hero, world: w.World, options: RenderOptions) {
	const Visuals = world.settings.Visuals;

	if (hero.destroyedTick) {
		return;
	}

	const pos = hero.body.getPosition().clone();

	// Ease in hero on arrival
	let easeMultiplier = ease(Math.max(hero.createTick, world.ui.initialRenderTick), world);
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
		pos.addMul(Visuals.EaseInDistance * easeMultiplier, direction);

		renderHeroArrival(ctxStack, pos, direction, arriving, hero, world);
	}

	if (hero.uiEase) {
		pos.add(hero.uiEase);
		hero.uiEase.mul(EaseDecay);
	}

	renderRangeIndicator(ctxStack, hero, pos, world);

	const invisible = engine.isHeroInvisible(hero);
	if (invisible) {
		renderBuffs(ctxStack, hero, pos, world);
	} else {
		renderHeroCharacter(ctxStack, hero, pos, world);

		if (!options.hideMap) {
			renderHeroName(ctxStack, hero, pos, world, options);
		}

		if (!easeMultiplier) {
			renderHeroBars(ctxStack, hero, pos, world);
		}

		renderBuffs(ctxStack, hero, pos, world);
	}

	playHeroSounds(ctxStack, hero, pos, world);
}

function visibleToMe(heroId: string, world: w.World) {
	const visible = world.ui.myHeroId ? (engine.calculateAlliance(world.ui.myHeroId, heroId, world) & Alliances.Friendly) > 0  : true;
	return visible;
}

function renderHeroArrival(ctxStack: CanvasCtxStack, pos: pl.Vec2, outward: pl.Vec2, arriving: boolean, hero: w.Hero, world: w.World) {
	const Visuals = world.settings.Visuals;

	unshiftTrail({
		type: "circle",
		pos,
		velocity: particleVelocity(outward, 0.1),
		radius: hero.radius,
		initialTick: world.tick,
		max: Visuals.EaseTicks,
		fillStyle: heroColor(hero.id, world),
		shine: 0.5,
		glow: 0.05,
		bloom: DefaultBloomRadius,
		vanish: 1,
	}, world);

	if (arriving) {
		ctxStack.sounds.push({ id: `joining-${hero.id}`, sound: 'joining', pos });
	} else {
		ctxStack.sounds.push({ id: `leaving-${hero.id}`, sound: 'leaving', pos });
	}
}

function ease(createTick: number, world: w.World): number {
	const Visuals = world.settings.Visuals;

	const age = world.tick - createTick;
	if (age < 0) {
		return 1;
	} else if (age < Visuals.EaseTicks) {
		return Math.pow(1 - age / Visuals.EaseTicks, Visuals.EasePower);
	} else {
		return 0;
	}
}

function renderTargetingIndicator(ctxStack: CanvasCtxStack, world: w.World) {
	const MaxAlpha = 0.5;

	const hero = world.objects.get(world.ui.myHeroId);
	if (!(hero && hero.category === "hero")) {
		return;
	}

	const invisible = engine.isHeroInvisible(hero);
	if (invisible && invisible.noTargetingIndicator) {
		return;
	}

	const pos = hero.body.getPosition().clone().add(hero.uiEase || VectorZero);
	const target = world.ui.nextTarget;
	if (!(pos && target)) {
		return;
	}

	const guideLength = 0.5;
	const guideDirection = vector.angleDiff(target, pos);
	const proportion = Math.min(1, vector.distance(target, pos) / guideLength);

	const lineWidth = hero.radius / 2;

	const gradient: r.TrailGradient = {
		angle: guideDirection,
		anchor: pos,
		fromExtent: 0,
		fromColor: ColTuple.parse("#000").alpha(MaxAlpha * proportion),
		toExtent: guideLength,
		toColor: ColTuple.parse("#000").alpha(0),
	};

	// Render line to target
	const to = vector.fromAngle(guideDirection, guideLength).add(pos);
	glx.lineSwatch(ctxStack, pos, to, {
		gradient,
		maxRadius: lineWidth / 2,
	});
}

function renderBuffs(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	const invisible = engine.isHeroInvisible(hero);
	const isVisibleToMe = visibleToMe(hero.id, world);

	hero.buffs.forEach(buff => {
		if (buff.renderStart && !buff.uiStartRendered) {
			buff.uiStartRendered = true;
			renderBuffSmoke(ctxStack, buff.renderStart, buff, hero, pos, world);
		}

		if (buff.render) {
			let visible = true;
			if (invisible) {
				if (invisible.noBuffs) {
					visible = false;
				}
				if (buff.render.invisible && !isVisibleToMe) {
					visible = false;
				}
			}

			if (visible) {
				renderBuffSmoke(ctxStack, buff.render, buff, hero, pos, world);
			}
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

		if (buff.renderFinish) {
			renderBuffSmoke(ctxStack, buff.renderFinish, buff, hero, pos, world);
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
	const Visuals = world.settings.Visuals;

	let color = render.color;
	if (render.selfColor && buff.owner === world.ui.myHeroId) {
		color = Visuals.MyHeroColor;
	} else if (render.heroColor) {
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

	let numParticles = render.numParticles !== undefined ? render.numParticles : 1;
	for (let i = 0; i < numParticles; ++i) {
		let velocity: pl.Vec2 = null;
		if (render.smoke) {
			velocity = particleVelocity(hero.body.getLinearVelocity(), render.smoke);
		} else {
			// Normally hero not moving fast enough to create smoke
			velocity = particleVelocity(vector.fromAngle(hero.body.getAngle()), hero.moveSpeedPerSecond, -1);
		}

		const pos = heroPos.clone();
		if (render.emissionRadiusFactor) {
			pos.addMul(render.emissionRadiusFactor * hero.radius, vector.fromAngle(Math.random() * 2 * Math.PI));
		}

		// Buffs on the bottom
		unshiftTrail({
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
		}, world);
	}

	let bloom = ctxStack.rtx >= r.GraphicsLevel.Ultra ? render.bloom : render.bloomLow;
	if (bloom) {
		glx.circleTrail(ctxStack, heroPos, {
			color: ColTuple.parse(color),
			maxRadius: 0,
			feather: {
				sigma: bloom,
				alpha: render.glow !== undefined ? render.glow : DefaultGlow,
			},
		});
	}
}

function particleVelocity(primaryVelocity: pl.Vec2, config?: RenderSmoke, multiplier: number = 1) {
	let axisMultiplier = 1;
	let isotropicSpeed = 0;
	if (_.isNumber(config)) {
		axisMultiplier = config;
	} else if (_.isObject(config)) {
		axisMultiplier = config.axisMultiplier;
		isotropicSpeed = config.isotropicSpeed;
	}

	const velocity = vector.fromAngle(2 * Math.PI * Math.random());

	let speed = 0;

	if (axisMultiplier) {
		speed += axisMultiplier * Math.random() * vector.dot(velocity, primaryVelocity); // can be negative
	}

	if (isotropicSpeed) {
		speed += isotropicSpeed * Math.random();
	}

	velocity.mul(multiplier * speed);
	return velocity;
}

function renderHeroCharacter(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	const Visuals = world.settings.Visuals;

	let color = heroColor(hero.id, world);

	const highlight = applyHighlight(hero.hitTick, hero, world, Visuals.Damage);

	const angle = hero.body.getAngle();
	let radius = hero.radius;

	if (highlight && highlight.growth) {
		radius += highlight.growth * radius;
	}

	let style = ColTuple.parse(color);
	if (highlight && highlight.flash) {
		style.lighten(highlight.flash);

		// Hit flash
		if (highlight.bloom && ctxStack.rtx >= r.GraphicsLevel.Ultra) {
			glx.circleSwatch(ctxStack, pos, {
				color: style,
				maxRadius: 0,
				feather: {
					sigma: radius + highlight.bloom,
					alpha: DefaultCastingGlow,
				},
			});
		}
	}

	// Turn highlight
	{
		const TurnHighlightTicks = Visuals.TurnHighlightTicks;
		const MaxAngleDelta = Visuals.TurnHighlightRevs * vector.Tau;

		let previousAngle = angle;
		if (hero.uiPreviousAngle !== undefined) {
			previousAngle = hero.uiPreviousAngle;
		}

		const angleDelta = vector.angleDelta(angle, previousAngle);

		let ticks = TurnHighlightTicks * Math.min(1, Math.abs(angleDelta) / MaxAngleDelta);
		ticks = Math.max(ticks, hero.uiTurnHighlightTicks || 0);

		if (ticks > 0) {
			const proportion = ticks / TurnHighlightTicks;
			radius *= 1 + Visuals.TurnHighlightGrowth * proportion;
			style.lighten(Visuals.TurnHighlightFlash * proportion);
		}

		hero.uiPreviousAngle = angle;
		hero.uiTurnHighlightTicks = Math.max(0, ticks - 1);
	}

	// Charging
	if (hero.casting && hero.casting.color && hero.casting.proportion > 0) {
		const strokeColor = ColTuple.parse(hero.casting.color).alpha(hero.casting.proportion);
		glx.circleSwatch(ctxStack, pos, {
			color: strokeColor,
			minRadius: 0,
			maxRadius: radius + Visuals.ChargingRadius,
			feather: ctxStack.rtx >= r.GraphicsLevel.Ultra ? {
				sigma: DefaultBloomRadius,
				alpha: DefaultCastingGlow,
			} : null,
		});
	} else if (hero.uiCastTrail) {
		const proportion = 1 - (world.tick - hero.uiCastTrail.castTick) / Visuals.CastingFlashTicks;
		if (proportion > 0) {
			const strokeColor = ColTuple.parse(color).alpha(proportion);
			glx.circleSwatch(ctxStack, pos, {
				color: strokeColor,
				maxRadius: 0,
				feather: ctxStack.rtx >= r.GraphicsLevel.Ultra ? {
					sigma: radius + proportion * DefaultBloomRadius,
					alpha: hero.uiCastTrail.glow !== undefined ? hero.uiCastTrail.glow : DefaultCastingGlow,
				} : null,
			});
		}
	}

	// Shadow
	/*
	if (ctxStack.rtx > r.GraphicsLevel.Low) {
		glx.circleTrail(ctxStack, pos.clone().add(ShadowOffset), {
			color: ColTuple.parse("rgba(0, 0, 0, 0.75)"),
			maxRadius: radius,
			feather: {
				sigma: ShadowFeatherRadius,
				alpha: 0.5,
			},
		});
	}
	*/

	// Dimensions
	const drawRadius = HeroAtlasSizeMultiplier * radius;

	// Body
	const bodyTexRect: ClientRect = atlas.lookup(ctxStack, r.Texture.Images, heroBodyTextureId(hero.id));
	if (bodyTexRect) {
		// Shadow
		if (ctxStack.rtx > r.GraphicsLevel.Low) {
			glx.hero(ctxStack, pos.clone().add(ShadowOffset), angle, drawRadius, bodyTexRect, {
				color: ColTuple.parse('#0008'),
			});
		}

		// Fill
		glx.hero(ctxStack, pos, angle, drawRadius, bodyTexRect, {
			color: style,
			gradient: {
				fromColor: style,
				toColor: style.clone().darken(0.5),
				angle: vector.Tau * 3 / 8,
			},
		});
	}

	const glyphTexRect: ClientRect = atlas.lookup(ctxStack, r.Texture.Images, heroGlyphTextureId(hero.id));
	if (glyphTexRect) {
		// Glyph
		glx.hero(ctxStack, pos, angle, drawRadius, glyphTexRect, {
			color: style.clone().lighten(0.5),
		});
	}
}

function heroBodyInstructions(ctxStack: CanvasCtxStack, player: w.Player, world: w.World): r.AtlasHeroInstruction[] {
	const Hero = world.settings.Hero;
	const Visuals = world.settings.Visuals;

	const heroId = player.heroId;
	const atlasSizeMultiplier = 2 * HeroAtlasSizeMultiplier; // 2x because need to fit diameter in the atlas not the radius
	const atlasPixels = Math.ceil(2 * HeroAtlasSizeMultiplier * Hero.Radius / ctxStack.subpixel);
	const radiusPixels = atlasPixels / atlasSizeMultiplier;

	const template: r.AtlasHeroInstruction = {
		id: null,
		type: "hero",
		radius: radiusPixels,
		skin: {
			body: {
				numPoints: 0,
				bend: 1,

				stroke: Visuals.HeroOutlineProportion,
				strokeMask: Visuals.HeroOutlineColor,
			},
			glyph: {
				rise: 0.5,
				inflect: 0,

				attack: 0,
				fall: 1,

				span: 1,
			},
		},
		height: atlasPixels,
		width: atlasPixels,
	};

	return [
		{...template, id: heroBodyTextureId(heroId), body: true },
		{...template, id: heroGlyphTextureId(heroId), glyph: true },
	];
}

function heroBodyTextureId(heroId: string) {
	return `${heroId}-body`;
}

function heroGlyphTextureId(heroId: string) {
	return `${heroId}-glyph`;
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
					id: `${hero.id}-casting${hero.casting.id}-${key}`,
					sound: key,
					pos,
				});
			}
		}
	}

	// Bump sounds
	if (hero.bumpTick) {
		ctxStack.sounds.push({
			id: `${hero.id}-bump-${hero.bumpTick}`,
			sound: "bump",
			pos: heroPos.clone(),
		});
	}
}

function renderRangeIndicator(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	if (!(hero.id === world.ui.myHeroId && world.ui.toolbar.hoverSpellId && !ctxStack.mobile)) {
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
		glx.circleTrail(ctxStack, pos, {
			color: stroke,
			minRadius: range - strokeWidth,
			maxRadius: range,
		});
	}
}

function renderHeroBars(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World) {
	const Hero = world.settings.Hero;
	const Visuals = world.settings.Visuals;

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

		const barY = pos.y - radius - Visuals.HealthBarHeight - Visuals.HealthBarMargin;
		const barHalfWidth = Visuals.HealthBarHeroRadiusFraction * radius;
		const barHalfHeight = Visuals.HealthBarHeight / 2;

		const barLeft = pl.Vec2(pos.x - barHalfWidth, barY);
		const barMid = pl.Vec2(barLeft.x + healthProportion * 2 * barHalfWidth, barY);
		const barShine = pl.Vec2(barLeft.x + shineProportion * 2 * barHalfWidth, barY);
		const barRight = pl.Vec2(pos.x + barHalfWidth, barY);

		glx.lineTrail(ctxStack, pl.Vec2(barLeft.x - constants.Pixel, barLeft.y), pl.Vec2(barRight.x + constants.Pixel, barRight.y), {
			color: ColTuple.parse("#111"),
			maxRadius: barHalfHeight + 2 * constants.Pixel,
		});
		glx.lineTrail(ctxStack, barLeft, barMid, {
			color,
			maxRadius: barHalfHeight,
		});

		if (barShine > barMid) {
			glx.lineTrail(ctxStack, barMid, barShine, {
				color: ColTuple.parse("#ccc"),
				maxRadius: barHalfHeight,
			});
		} else {
			glx.lineTrail(ctxStack, barShine, barMid, {
				color: color.clone().darken(0.5),
				maxRadius: barHalfHeight,
			});
		}

		// Adjust upwards slower so lifesteal clearer
		const adjustProportion = hero.health <= hero.uiHealth ? 0.025 : 0.01;
		hero.uiHealth += adjustProportion * (hero.health - hero.uiHealth);
	}
}

function renderHeroName(ctxStack: CanvasCtxStack, hero: w.Hero, pos: pl.Vec2, world: w.World, options: RenderOptions) {
	const Visuals = world.settings.Visuals;

	const texRect: ClientRect = atlas.lookup(ctxStack, r.Texture.Text, heroNameTextureId(hero.id));
	if (!texRect) {
		return;
	}

	const fontSizeMultiplier = options.fontSizeMultiplier || 1;
	const yOffset = hero.radius + Visuals.NameMargin;
	const drawWidth = fontSizeMultiplier * Visuals.NameWidthPixels * ctxStack.pixel;
	const drawHeight = fontSizeMultiplier * Visuals.NameHeightPixels * ctxStack.pixel;
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

function heroNameInstruction(ctxStack: CanvasCtxStack, player: w.Player, world: w.World, options: RenderOptions): r.AtlasTextInstruction {
	const Visuals = world.settings.Visuals;
	const retinaMultiplier = ctxStack.pixel / ctxStack.subpixel;
	const fontSizeMultiplier = retinaMultiplier * options.fontSizeMultiplier;

	return {
		id: heroNameTextureId(player.heroId),
		type: "text",
		text: player.name,
		color: 'rgba(255, 255, 255, 0.3)',
		font: `${Visuals.NameFontPixels * fontSizeMultiplier}px 'Maven Pro',Helvetica,Arial,sans-serif`,
		height: Math.ceil(fontSizeMultiplier * Visuals.NameHeightPixels),
		width: Math.ceil(fontSizeMultiplier * Visuals.NameWidthPixels),
	};
}

function heroNameTextureId(heroId: string) {
	return `${heroId}-name`;
}

function renderShield(ctxStack: CanvasCtxStack, shield: w.Shield, world: w.World) {
	const Visuals = world.settings.Visuals;

	const MaxAlpha = 0.75;
	const MinAlpha = 0.10;

	const ticksRemaining = shield.expireTick - world.tick;
	const maxTicks = shield.expireTick - shield.createTick;
	const proportion = 1.0 * ticksRemaining / maxTicks;

	const highlight = applyHighlight(shield.hitTick, shield, world, shield.strike);

	let color = ColTuple.parse((shield.selfColor && shield.owner === world.ui.myHeroId) ? Visuals.MyHeroColor : shield.color);
	if (highlight && highlight.flash) {
		color.lighten(highlight.flash);
	}
	color.alpha((MaxAlpha - MinAlpha) * proportion + MinAlpha);

	let scale: number = 1;
	if (highlight && highlight.growth) {
		scale += highlight.growth;
	}
	if (world.tick - shield.createTick < shield.growthTicks) {
		const growthProportion = (world.tick - shield.createTick) / shield.growthTicks;
		scale *= growthProportion;
	}

	let feather: r.FeatherConfig = null;
	if (shield.glow && ctxStack.rtx >= r.GraphicsLevel.Ultra) {
		feather = {
			sigma: shield.bloom !== undefined ? shield.bloom : Visuals.DefaultGlowRadius,
			alpha: shield.glow,
		};
	}
	if (highlight && highlight.bloom && feather) {
		feather.sigma += highlight.bloom;
	}

	if (shield.type === "reflect") {
		const hero = world.objects.get(shield.owner);
		if (!hero) {
			return;
		}
		const pos = hero.body.getPosition();

		if (shield.points) {
			glx.convexTrail(ctxStack, pos, shield.points, shield.body.getAngle(), scale, {
				color,
				maxRadius: shield.radius * scale,
				feather,
			});

			if (feather) {
				// Convex trails don't bloom, add some specifically
				glx.circleTrail(ctxStack, pos, {
					color,
					maxRadius: 0,
					feather,
				});
			}
		} else {
			glx.circleTrail(ctxStack, pos, {
				color,
				maxRadius: shield.radius * scale,
				feather,
			});
		}
	} else if (shield.type === "wall") {
		const pos = shield.body.getPosition();
		const angle = shield.body.getAngle();

		glx.convexTrail(ctxStack, pos, shield.points, angle, scale, {
			color,
			minRadius: 0,
			maxRadius: shield.extent * scale,
			feather,
		});

		if (feather) {
			glx.circleTrail(ctxStack, pos, {
				color,
				maxRadius: 0,
				feather,
			});

			for (let i = 0; i < shield.points.length; ++i) {
				const point = vector.turnVectorBy(shield.points[i], angle).add(pos);
				glx.circleTrail(ctxStack, point, {
					color,
					maxRadius: 0,
					feather,
				});
			}
		}
	} else if (shield.type === "saber") {
		const hero = world.objects.get(shield.owner);
		if (!(hero && hero.category === "hero")) {
			return;
		}
		const pos = hero.body.getPosition();
		const angle = shield.body.getAngle();

		// Draw the saber
		const handle = vector.fromAngle(angle).mul(hero.radius).add(pos);
		const tip = vector.fromAngle(angle).mul(hero.radius + (shield.length - hero.radius) * scale).add(pos);
		glx.lineTrail(ctxStack, handle, tip, {
			color,
			minRadius: 0,
			maxRadius: shield.width,
			feather: null, // Don't bloom the saber, bloom the owner
		});

		// Bloom the owner
		glx.circleTrail(ctxStack, pl.Vec2.mid(pos, tip), {
			color,
			maxRadius: 0,
			feather,
		});

		renderSaberTrail(ctxStack, shield, scale, world);
	}
}

function renderSaberTrail(ctxStack: CanvasCtxStack, saber: w.Saber, scale: number, world: w.World) {
	const previousAngle = saber.uiPreviousAngle || saber.body.getAngle();
	const newAngle = saber.body.getAngle();

	const antiClockwise = vector.angleDelta(previousAngle, newAngle) < 0;


	applyHighlight(saber.hitTick, saber, world, saber.strike);

	const minRadius = world.settings.Hero.Radius;
	pushTrail({
		type: "arc",
		initialTick: world.tick,
		max: saber.trailTicks,
		pos: saber.body.getPosition(),
		minRadius,
		maxRadius: minRadius + (saber.length - minRadius) * scale,
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
	const Visuals = world.settings.Visuals;

	const player = world.players.get(heroId);
	if (player.userHash === world.ui.myUserHash) {
		return Visuals.MyHeroColor;
	}
	
	if (!world.ui.myHeroId) {
		return player.uiColor;
	}

	if (heroId === world.ui.myHeroId) {
		return Visuals.MyHeroColor;
	} else if (engine.calculateAlliance(world.ui.myHeroId, heroId, world) & Alliances.Ally) {
		return Visuals.AllyColor;
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
	const velocity = swirl.smoke ? particleVelocity(context.baseVelocity, swirl.smoke, -1) : null;
	
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

	if (swirl.bloom && ctxStack.rtx >= r.GraphicsLevel.Ultra) {
		glx.circleTrail(ctxStack, location, {
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
		proportion *= engine.calculatePartialDamageMultiplier(world, projectile, projectile.partialDetonateRadius);
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
	if (reticule.glow && ctxStack.rtx >= r.GraphicsLevel.Ultra) {
		const bloom = reticule.bloom !== undefined ? reticule.bloom : DefaultBloomRadius;
		feather = {
			sigma: proportion * bloom,
			alpha: reticule.glow,
		};
	}

	glx.circleTrail(ctxStack, pos, {
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

	const highlightResult = applyHighlight(projectile.hitTick, projectile, world, strike);
	if (!(highlightResult && highlightResult.created)) {
		// Sometimes can strike multiple times in same tick - don't want to create extra copies of particles
		return;
	}

	// Particles
	if (strike.numParticles && ctxStack.rtx >= r.GraphicsLevel.High) {
		for (let i = 0; i < strike.numParticles; ++i) {
			const velocity = particleVelocity(projectile.body.getLinearVelocity(), strike.speedMultiplier);
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
				shine: strike.particleShine,
				bloom: strike.particleBloom !== undefined ? strike.particleBloom : DefaultParticleBloomRadius,
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
	const Visuals = world.settings.Visuals;

	let color = ColTuple.parse(render.color);
	let scale = 1;

	if (highlight) {
		const highlightProportion = calculateHighlightProportion(highlight, world);
		if (highlightProportion > 0) {
			color.lighten(highlightProportion);
			scale += highlight.growth * highlightProportion;
		}
	}

	const fromFill: r.TrailFill = {
		color,
		maxRadius: scale * render.width / 2,
		feather: (render.glow && ctxStack.rtx >= r.GraphicsLevel.Ultra) ? {
			sigma: render.bloom !== undefined ? render.bloom : Visuals.DefaultGlowRadius,
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
	glx.lineTrail(ctxStack, from, to, fromFill, toFill);
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
	const velocity = render.smoke ? particleVelocity(projectile.body.getLinearVelocity(), render.smoke, -1) : null;

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
	const velocity = render.smoke ? particleVelocity(projectile.body.getLinearVelocity(), render.smoke, -1) : null;

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
	if (ctxStack.rtx < r.GraphicsLevel.Ultra) {
		return;
	}

	let color = ColTuple.parse(projectileColor(render, projectile, world));
	if (render.shine) {
		color.lighten(render.shine);
	}
	glx.circleTrail(ctxStack, projectile.body.getPosition(), {
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
	const Visuals = world.settings.Visuals;

	if (render.selfColor && projectile.owner === world.ui.myHeroId) {
		return Visuals.MyHeroColor;
	}

	if (render.ownerColor) {
		return heroColor(projectile.owner, world);
	}

	return render.color || projectile.color;
}

function renderTrail(ctxStack: CanvasCtxStack, trail: w.Trail, world: w.World) {
	const Visuals = world.settings.Visuals;

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
	if (trail.vanish) {
		color.fade(trail.vanish * (1 - proportion));
	}

	let feather: r.FeatherConfig = null;
	if (trail.glow && ctxStack.rtx >= r.GraphicsLevel.Ultra) {
		feather = {
			sigma: proportion * (trail.bloom !== undefined ? trail.bloom : Visuals.DefaultGlowRadius),
			alpha: trail.glow,
		};
	}

	if (trail.highlight) {
		const highlightProportion = calculateHighlightProportion(trail.highlight, world);
		if (highlightProportion > 0) {
			if (trail.highlight.flash) {
				color = color.lighten(highlightProportion);
			}
			if (trail.highlight.growth) {
				scale = 1 + trail.highlight.growth * highlightProportion;
			}
			if (trail.highlight.bloom && feather) {
				feather.sigma += proportion * trail.highlight.bloom * highlightProportion;
			}
		} else {
			trail.highlight = null; // highlight expired
		}
	}

	if (trail.type === "circle") {
		let pos = trail.pos;
		if (trail.velocity) {
			const time = (world.tick - trail.initialTick) / constants.TicksPerSecond;
			pos = pos.clone().addMul(time, trail.velocity);
		}

		const radius = scale * proportion * trail.radius;

		glx.circleTrail(ctxStack, pos, {
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

		glx.convexTrail(ctxStack, pos, trail.points, trail.angle, extent, {
			color,
			maxRadius: extent,
			feather,
		});
	} else if (trail.type === "line") {
		const lineWidth = scale * proportion * trail.width;

		glx.lineTrail(ctxStack, trail.from, trail.to, {
			color,
			minRadius: 0,
			maxRadius: lineWidth / 2,
			feather,
		});
	} else if (trail.type === "ripple") {
		const maxRadius = trail.initialRadius * proportion + trail.finalRadius * (1 - proportion);
		const minRadius = maxRadius * (1 - proportion);
		glx.circleTrail(ctxStack, trail.pos, {
			color,
			minRadius,
			maxRadius,
			feather,
		});
	} else if (trail.type === "arc") {
		glx.arcTrail(ctxStack, trail.pos, trail.fromAngle, trail.toAngle, trail.antiClockwise, {
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
	ctx.save();
	ctx.scale(options.retinaMultiplier, options.retinaMultiplier);
	const myHero = world.objects.get(world.ui.myHeroId) as w.Hero;
	renderButtons(ctx, rect, world, myHero, options);
	ctx.restore();
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
		buttonStateLookup = calculateButtonStatesFromKeyBindings(world, options.keysToSpells, options.customizingSpells);
	} else {
		buttonStateLookup = null;
	}

	if (buttonStateLookup) {
		if (!world.ui.buttonBar) {
			ctx.clearRect(0, 0, rect.width, rect.height); // Rendering a new button bar, clear previous ones (e.g. from previous resizes of the window)
			world.ui.buttonBar = calculateButtonLayout(world.settings.Choices.Keys, rect, world, options);
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

function calculateButtonStatesFromKeyBindings(world: w.World, keysToSpells: Map<string, string>, customizingSpells: boolean) {
	const buttonStateLookup = new Map<string, w.ButtonRenderState>();
	if (keysToSpells) {
		const keys = world.settings.Choices.Keys;
		const hoverSpellId = world.ui.toolbar.hoverSpellId;

		for (let i = 0; i < keys.length; ++i) {
			const key = keys[i];
			if (!key) { continue; }

			const spellId = keysToSpells.get(key.btn);
			if (!spellId) { continue }

			const spell = world.settings.Spells[spellId];
			if (!spell) { continue }

			let color = spell.passive ? "#111" : spell.color;
			if (spell.id === hoverSpellId) {
				color = ColTuple.parse(color).lighten(0.25).string();
			}

			const btnState: w.ButtonRenderState = {
				key: null,
				color,
				icon: spell.icon,
				cooldownText: null,
				emphasis: spell.passive ? 0.4 : 1,
			};
			buttonStateLookup.set(key.btn, btnState);
		}
	}
	return buttonStateLookup;
}

function calculateButtonLayout(keys: KeyConfig[], rect: ClientRect, world: w.World, options: RenderOptions): w.ButtonConfig {
	if (options.mobile) {
		return calculateButtonWheelLayout(keys, rect, world, options);
	} else {
		return calculateButtonBarLayout(keys, rect, world, options);
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

	config.hitSectors.forEach((buttonSector, key) => {
		if (!(key && buttonSector)) {
			return;
		}

		const newState = states.get(key);
		const currentState = config.buttons.get(key);

		if (buttonStateChanged(currentState, newState)) {
			config.buttons.set(key, newState);

			ctx.save();
			renderWheelButton(ctx, buttonSector, config.innerRadius, config.outerRadius, newState, iconLookup);
			ctx.restore();
		}

	});
	ctx.restore();

	if (!config.targetSurfaceDrawn) {
		const InnerRadiusBlend = 0.75;

		config.targetSurfaceDrawn = true;

		ctx.save();
		ctx.translate(config.targetSurfaceCenter.x, config.targetSurfaceCenter.y);

		ctx.lineWidth = 1;
		ctx.strokeStyle = "#ffffff44";
		ctx.fillStyle = "#ffffff22";

		const radius = InnerRadiusBlend * config.innerRadius + (1 - InnerRadiusBlend) * config.outerRadius;

		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, 2 * Math.PI);
		ctx.stroke();

		for (let i = 0; i < 4; ++i) {
			ctx.save();
			ctx.rotate(i * Math.PI / 2);

			ctx.beginPath();
			ctx.moveTo(radius * -0.2, radius * 0.5);
			ctx.lineTo(radius * 0.2, radius * 0.5);
			ctx.lineTo(0, radius * 0.75);
			ctx.closePath();
			ctx.fill();

			ctx.restore();
		}

		ctx.restore();
	}
}

function calculateButtonBarLayout(keys: KeyConfig[], rect: ClientRect, world: w.World, options: RenderOptions): w.ButtonBarConfig {
	const Visuals = world.settings.Visuals;

	const hitBoxes = new Map<string, ClientRect>();
	let nextOffset = 0;
	keys.forEach(key => {
		if (nextOffset > 0) {
			nextOffset += Visuals.ButtonBarSpacing;
		}

		if (key) {
			const offset = nextOffset;
			const size = Visuals.ButtonBarSize * (key.barSize || 1);

			const left = offset;
			const top = Visuals.ButtonBarSize - size;
			const width = size;
			const height = size;
			const right = left + width;
			const bottom = top + height;
			hitBoxes.set(key.btn, { left, top, right, bottom, width, height });

			nextOffset += size;
		} else {
			nextOffset += Visuals.ButtonBarGap;
		}
	});

	const scaleFactor = Math.min(
		calculateButtonScaleFactor(rect.width, nextOffset),
		calculateButtonScaleFactor(rect.height * Visuals.ButtonBarMaxHeightProportion, Visuals.ButtonBarSize)
	);
	const region = calculateButtonBarRegion(rect, nextOffset, scaleFactor, world);

	return {
		view: "bar",
		screenHeight: rect.height,
		screenWidth: rect.width,
		retinaMultiplier: options.retinaMultiplier,
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

function calculateButtonBarRegion(rect: ClientRect, totalSize: number, scaleFactor: number, world: w.World): ClientRect {
	const Visuals = world.settings.Visuals;

	const axisSize = totalSize * scaleFactor;
	const crossSize = Visuals.ButtonBarSize * scaleFactor;

	const height = crossSize;
	const width = axisSize;

	const left = rect.width / 2.0 - width / 2.0;
	const top = rect.height - crossSize - Visuals.ButtonBarMargin;

	const right = left + width;
	const bottom = top + height;
	return { left, top, right, bottom, width, height };
}

function calculateButtonWheelLayout(keys: KeyConfig[], rect: ClientRect, world: w.World, options: RenderOptions): w.ButtonWheelConfig {
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

	const region = calculateButtonWheelRegion(rect, world, options);
	const outerRadius = Math.min(region.width, region.height) / 2.0;
	const innerRadius = outerRadius / 2;
	const center = pl.Vec2((region.left + region.right) / 2, (region.top + region.bottom) / 2);

	const targetSurfaceCenter = pl.Vec2(rect.right - (center.x - rect.left), center.y); // Mirror the wheel on the right

	return {
		view: "wheel",
		screenWidth: rect.width,
		screenHeight: rect.height,
		retinaMultiplier: options.retinaMultiplier,
		wheelOnRight: options.wheelOnRight,
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

function calculateButtonWheelRegion(rect: ClientRect, world: w.World, options: RenderOptions): ClientRect {
	const Visuals = world.settings.Visuals;

	const size = calculateButtonWheelSize(rect, world);

	let left;
	let right;
	if (options.wheelOnRight) {
		right = rect.width - Visuals.ButtonBarMargin;
		left = right - size;
	} else {
		left = Visuals.ButtonBarMargin;
		right = left + size;
	}

	const bottom = rect.bottom - Visuals.ButtonBarMargin;
	const top = bottom - size;
	const width = size;
	const height = size;

	return { left, top, right, bottom, width, height };
}

function calculateButtonWheelSize(rect: ClientRect, world: w.World) {
	const Visuals = world.settings.Visuals;

	const maxSize = Visuals.ButtonBarSize * 3;

	let size = Math.min(
		(rect.width - Visuals.ButtonBarMargin) / 2, // Half width
		(rect.height - Visuals.ButtonBarMargin * 2)); // Or whole height
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

	const settings = world.settings;
	const rebindingLookup = keyboardUtils.getRebindingLookup({ rebindings, settings });
	let button: w.ButtonRenderState = {
		key: spell.passive ? "" : (rebindingLookup.get(key) || ""),
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
	} else if (spell.passive) {
		button.color = '#111';
		button.emphasis = 0.4;
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

	if (!spell.passive && remainingInSeconds > 0) {
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

		// Shadow
		ctx.fillStyle = '#000';
        ctx.beginPath();
		ctx.rect(1, 1, size + 1, size + 1);
		ctx.fill();

		// Button
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		ctx.strokeStyle = '#000';
		ctx.lineWidth = 1;

		const gradient = ctx.createLinearGradient(size * 1/3, 0, size * 2/3, size);
        gradient.addColorStop(0, ColTuple.parse(buttonState.color).lighten(0.1).string());
        gradient.addColorStop(0.4, ColTuple.parse(buttonState.color).lighten(0.3).string());
        gradient.addColorStop(0.4, buttonState.color);
        gradient.addColorStop(1, ColTuple.parse(buttonState.color).lighten(0.2).string());
		ctx.fillStyle = gradient;
		
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
		ctx.fill();
		ctx.stroke();

		ctx.clip();

		renderIconOnly(ctx, icons.getIcon(buttonState.icon, iconLookup), emphasis * 0.6, size);

		if (buttonState.cooldownText) {
			// Cooldown
			let cooldownText = buttonState.cooldownText

			ctx.font = 'bold ' + (size * 0.6 - 1) + 'px "Maven Pro",sans-serif';
			renderTextWithShadow(ctx, cooldownText, size / 2, size / 2, emphasis);
		} else {
			const key = buttonState.key;
			if (key && !keyboardUtils.isSpecialKey(key)) {
				// Keyboard shortcut
				ctx.save();

				ctx.font = 'bold ' + (size / 2 - 1) + 'px "Maven Pro",sans-serif';

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
	const buttonCenter = vector.fromAngle((sector.startAngle + sector.endAngle) / 2).mul((innerRadius + outerRadius) / 2);
	const size = outerRadius - innerRadius;

	const emphasis = buttonState.emphasis;

	ctx.save();

	// Render button
	const gradient = ctx.createLinearGradient(
		buttonCenter.x - size / 2, buttonCenter.y - size / 2,
		buttonCenter.x + size / 2, buttonCenter.y + size / 2);

	gradient.addColorStop(0, ColTuple.parse(buttonState.color).lighten(0.1).string());
	gradient.addColorStop(0.45, ColTuple.parse(buttonState.color).lighten(0.3).string());
	gradient.addColorStop(0.45, buttonState.color);
	gradient.addColorStop(1, ColTuple.parse(buttonState.color).lighten(0.2).string());

	ctx.lineWidth = 1;
	ctx.strokeStyle = "#000";
	ctx.fillStyle = gradient;

	ctx.beginPath();
	if (sector.startAngle && sector.endAngle) {
		ctx.arc(0, 0, outerRadius, sector.startAngle, sector.endAngle, false);
		ctx.arc(0, 0, innerRadius, sector.endAngle, sector.startAngle, true);
	} else {
		ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI)
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.clip(); // Clip icon inside button

	{
		ctx.save();

		// Translate to center of button
		if (sector.startAngle && sector.endAngle) {
			ctx.translate(buttonCenter.x, buttonCenter.y);
		}

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
	ctx.strokeStyle = '#000c';
	ctx.lineWidth = 1;
	ctx.fillText(text, x, y);
	ctx.strokeText(text, x, y);

	ctx.restore();
}

function unshiftTrail(trail: w.Trail, world: w.World) {
	if (world.ui.renderedTick === world.tick) {
		// If network hangs and we keep re-rendering the same frame, don't need to add another trail to a tick when it already has one
		return;
	}
	world.ui.trails.unshift(trail);
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