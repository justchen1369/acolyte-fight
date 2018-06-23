import * as constants from '../game/constants';
import * as engine from '../game/engine';
import * as vector from '../game/vector';
import * as w from '../game/world.model';

import { ButtonBar, ChargingIndicator, HealthBar, Hero, Spells, Pixel } from '../game/constants';
import { Icons } from '../ui/icons';
import { renderIcon } from '../ui/renderIcon';

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

export function render(world: w.World, canvas: HTMLCanvasElement) {
	let rect = canvas.getBoundingClientRect();
	let ctx = canvas.getContext('2d');
	if (!ctx) {
		throw "Error getting context";
	}

	ctx.save();
	clearCanvas(ctx, rect);
	renderWorld(ctx, world, rect);
	renderInterface(ctx, world, rect);
	ctx.restore();
}

function clearCanvas(ctx: CanvasRenderingContext2D, rect: ClientRect) {
	ctx.save();

	ctx.fillStyle = '#000000';
	ctx.beginPath();
	ctx.rect(0, 0, rect.width, rect.height);
	ctx.fill();

	ctx.restore();
}

function renderWorld(ctx: CanvasRenderingContext2D, world: w.World, rect: ClientRect) {
	ctx.save();

	let worldRect = calculateWorldRect(rect);
	ctx.translate(worldRect.left, worldRect.top);
	ctx.scale(worldRect.width, worldRect.height);

	renderMap(ctx, world);

	world.objects.forEach(obj => renderObject(ctx, obj, world));
	world.destroyed.forEach(obj => renderDestroyed(ctx, obj, world));
	world.explosions.forEach(obj => renderExplosion(ctx, obj, world));

	let newTrails = new Array<w.Trail>();
	world.ui.trails.forEach(trail => {
		let complete = true;
		complete = renderTrail(ctx, trail);
		if (!complete) {
			newTrails.push(trail);
		}
	});
	world.ui.trails = newTrails;

	ctx.restore();
}

function renderObject(ctx: CanvasRenderingContext2D, obj: w.WorldObject, world: w.World) {
	if (obj.category === "hero") {
		renderHero(ctx, obj, world);
	} else if (obj.category === "projectile") {
		renderSpell(ctx, obj, world);
	}
}

function renderDestroyed(ctx: CanvasRenderingContext2D, obj: w.WorldObject, world: w.World) {
	if (obj.category === "projectile") {
		renderSpell(ctx, obj, world);
	}
}

function renderSpell(ctx: CanvasRenderingContext2D, obj: w.Projectile, world: w.World) {
	if (obj.render === "link") {
		renderLink(ctx, obj, world);
	} else if (obj.render === "projectile") {
		// Render both to ensure there are no gaps in the trail
        renderProjectile(ctx, obj, world);
        renderRay(ctx, obj, world);
	} else if (obj.render == "ray") {
        renderRay(ctx, obj, world);
	}
}

function renderExplosion(ctx: CanvasRenderingContext2D, explosion: w.Explosion, world: w.World) {
	let ticks;
	let radius;
	if (explosion.type === w.ExplosionType.Scourge) {
		ticks = 30;
		radius = Spells.scourge.radius;
	} else if (explosion.type === w.ExplosionType.HeroDeath) {
		ticks = 15;
		radius = Hero.Radius * 1.5;
	} else {
		return;
	}

	world.ui.trails.push({
		type: "circle",
		max: ticks,
		remaining: ticks,
		pos: explosion.pos,
		fillStyle: 'white',
		glowPixels: 20,
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
		const numTriangles = 3;
		ctx.save();

		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, 2 * Math.PI);
		ctx.clip();

		ctx.rotate(angle);
		ctx.scale(Hero.Radius, Hero.Radius);

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
	if (ticksUntilStart <= constants.Matchmaking.JoinPeriod) {
		ctx.fillStyle = 'black';
		ctx.beginPath();
		ctx.rect(-HealthBar.Radius, -radius - HealthBar.Height - HealthBar.Margin, HealthBar.Radius * 2, HealthBar.Height);
		ctx.fill();

		let healthProportion = hero.health / Hero.MaxHealth;
		ctx.fillStyle = rgColor(healthProportion);
		ctx.beginPath();
		ctx.rect(-HealthBar.Radius, -radius - HealthBar.Height - HealthBar.Margin, HealthBar.Radius * 2 * healthProportion, HealthBar.Height);
		ctx.fill();

		let startProportion = ticksUntilStart / constants.Matchmaking.JoinPeriod;
		if (startProportion > 0) {
			ctx.save();

			ctx.fillStyle = "#ffffff";
			ctx.globalAlpha = startProportion;
			ctx.beginPath();
			ctx.rect(-HealthBar.Radius, -radius - HealthBar.Height - HealthBar.Margin, HealthBar.Radius * 2, HealthBar.Height);
			ctx.fill();

			ctx.restore();
		}
	}

	ctx.restore();
}

function rgColor(proportion: number) {
	let hue = proportion * 120.0;
	return 'hsl(' + Math.round(hue) + ', 100%, 50%)';
}

function renderLink(ctx: CanvasRenderingContext2D, projectile: w.Projectile, world: w.World) {
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
			renderProjectile(ctx, projectile, world);
		}
	}

	if (!(owner && target)) {
		return;
	}

	ctx.lineWidth = Pixel * 5;
	ctx.strokeStyle = projectile.color;
	ctx.shadowColor = projectile.color;
	ctx.shadowBlur = 10;

	const from = owner.body.getPosition();
	const to = target.body.getPosition();
	ctx.beginPath();
	ctx.moveTo(from.x, from.y);
	ctx.lineTo(to.x, to.y);
	ctx.stroke();
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
		remaining: projectile.trailTicks,
		max: projectile.trailTicks, 
		from: vector.clone(previous),
		to: vector.clone(pos),
		fillStyle: projectileColor(projectile, world),
		glowPixels: projectile.glowPixels,
		width: projectile.radius * 2,
	} as w.LineTrail);
}

function renderProjectile(ctx: CanvasRenderingContext2D, projectile: w.Projectile, world: w.World) {
	let pos = projectile.body.getPosition();

	world.ui.trails.push({
		type: 'circle',
		remaining: projectile.trailTicks,
		max: projectile.trailTicks, 
		pos: vector.clone(pos),
		fillStyle: projectileColor(projectile, world),
		glowPixels: projectile.glowPixels,
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

function renderTrail(ctx: CanvasRenderingContext2D, trail: w.Trail) {
	let proportion = 1.0 * trail.remaining / trail.max;
	if (proportion <= 0) {
		return true;
	}


	ctx.save(); 

	ctx.globalAlpha = proportion;
	ctx.fillStyle = trail.fillStyle;
	ctx.strokeStyle = trail.fillStyle;
	
	ctx.shadowColor = trail.fillStyle;
	ctx.shadowBlur = trail.glowPixels || 0;

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

	--trail.remaining;
	return trail.remaining <= 0;
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



