import pl from 'planck-js';
import { TicksPerSecond } from './constants';
import * as model from './model';
import * as vector from './vector';

const MyHeroColor = '#00ccff';

let HealthBarRadius = model.HeroRadius * 0.9;
let HealthBarHeight = model.Pixel * 3;
let HealthBarMargin = model.Pixel * 2;
let ChargingIndicatorMargin = model.Pixel * 5;
let ChargingIndicatorWidth = model.Pixel * 2;

let ButtonSpacing = 10;
let ButtonMargin = 5;
let ButtonSize = 50;

let ui = {
	buttons: [
		"teleport",
		"shield",
		null,
		"fireball",
		"lightning",
		"homing",
		"meteor",
		null,
		"bouncer",
		"scourge",
		// "shield",
	],
};

// Rendering
export function calculateWorldRect(rect) {
	let size = Math.min(rect.width, rect.height);
	return {
		left: (rect.width - size) / 2.0,
		top: (rect.height - size) / 2.0,
		width: size,
		height: size,
	};
}

export function render(world, canvas) {
	let rect = canvas.getBoundingClientRect();
	let ctx = canvas.getContext('2d');

	ctx.save();
	clearCanvas(ctx, rect);
	renderWorld(ctx, world, rect);
	renderInterface(ctx, world, rect);
	ctx.restore();
}

function clearCanvas(ctx, rect) {
	ctx.save();

	ctx.fillStyle = '#000000';
	ctx.beginPath();
	ctx.rect(0, 0, rect.width, rect.height);
	ctx.fill();

	ctx.restore();
}

function renderWorld(ctx, world, rect) {
	ctx.save();

	let worldRect = calculateWorldRect(rect);
	ctx.translate(worldRect.left, worldRect.top);
	ctx.scale(worldRect.width, worldRect.height);

	renderMap(ctx, world);

	world.objects.forEach(obj => renderObject(ctx, obj, world));
	world.destroyed.forEach(obj => renderDestroyed(ctx, obj, world));

	let newTrails = [];
	world.trails.forEach(trail => {
		let complete = true;
		complete = renderTrail(ctx, trail);
		if (!complete) {
			newTrails.push(trail);
		}
	});
	world.trails = newTrails;

	ctx.restore();
}

function renderObject(ctx, obj, world) {
	if (obj.type === "hero") {
		renderHero(ctx, obj, world);
	} else if (obj.type in model.Spells) {
		let spell = model.Spells[obj.type];
		renderSpell(ctx, obj, world, spell);
	}
}

function renderDestroyed(ctx, obj, world) {
	let spell = model.Spells[obj.type];
    renderSpell(ctx, obj, world, spell);
}

function renderSpell(ctx, obj, world, spell) {
    if (!spell) {
        return;
    }

    switch (spell.render) {
        case 'projectile': renderProjectile(ctx, obj, world, spell);
        case 'ray': renderRay(ctx, obj, world, spell);
    }
}

function renderMap(ctx, world) {
	ctx.save();

	ctx.translate(0.5, 0.5);

	ctx.fillStyle = '#333333';
	ctx.beginPath();
	ctx.arc(0, 0, world.radius, 0, 2 * Math.PI);
	ctx.fill();

	ctx.restore();
}

function renderHero(ctx, hero, world) {
	if (hero.destroyed) {
		return;
	}

	let pos = hero.body.getPosition();

	ctx.save();
	ctx.translate(pos.x, pos.y);

	// Fill
	ctx.fillStyle = hero.fillStyle;
	if (!world.activePlayers.has(hero.id)) {
		ctx.fillStyle = '#666666';
	} else if (hero.id === world.ui.myHeroId) {
		ctx.fillStyle = MyHeroColor;
	}
	ctx.beginPath();
	ctx.arc(0, 0, model.HeroRadius, 0, 2 * Math.PI);
	ctx.fill();

	// Charging
	if (hero.charging && hero.charging.spell && hero.charging.proportion > 0) {
		ctx.save();

		let spell = model.Spells[hero.charging.spell];
		ctx.globalAlpha = hero.charging.proportion;
		ctx.strokeStyle = spell.fillStyle;
		ctx.lineWidth = ChargingIndicatorWidth;
		ctx.beginPath();
		ctx.arc(0, 0, model.HeroRadius + ChargingIndicatorMargin, 0, 2 * Math.PI);
		ctx.stroke();

		ctx.restore();
	}

	// Shield
	if (hero.shieldTicks) {
		let spell = model.Spells.shield;
		let proportion = 1.0 * hero.shieldTicks / spell.maxTicks;

		ctx.save();

		ctx.globalAlpha = proportion;
		ctx.fillStyle = spell.fillStyle;
		ctx.beginPath();
		ctx.arc(0, 0, spell.radius, 0, 2 * Math.PI);
		ctx.fill();


		ctx.restore();
	}

	// Health bar
	ctx.fillStyle = 'black';
	ctx.beginPath();
	ctx.rect(-HealthBarRadius, -model.HeroRadius - HealthBarHeight - HealthBarMargin, HealthBarRadius * 2, HealthBarHeight);
	ctx.fill();

	let healthProportion = hero.health / model.HeroMaxHealth;
	ctx.fillStyle = rgColor(healthProportion);
	ctx.beginPath();
	ctx.rect(-HealthBarRadius, -model.HeroRadius - HealthBarHeight - HealthBarMargin, HealthBarRadius * 2 * healthProportion, HealthBarHeight);
	ctx.fill();

	ctx.restore();
}

function rgColor(proportion) {
	let hue = proportion * 120.0;
	return 'hsl(' + Math.round(hue) + ', 100%, 50%)';
}

function renderRay(ctx, projectile, world, spell) {
	let pos = projectile.body.getPosition();
	let previous = projectile.uiPreviousPos;
	projectile.uiPreviousPos = vector.clone(pos);

	if (!previous) {
		renderProjectile(ctx, projectile, world, spell);
		return;
	}


	world.trails.push({
		type: 'line',
		remaining: spell.trailTicks,
		max: spell.trailTicks, 
		from: vector.clone(previous),
		to: vector.clone(pos),
		fillStyle: spell.fillStyle,
		width: spell.radius * 2,
	});
}

function renderProjectile(ctx, projectile, world, spell) {
	let pos = projectile.body.getPosition();

	world.trails.push({
		type: 'circle',
		remaining: spell.trailTicks,
		max: spell.trailTicks, 
		pos: vector.clone(pos),
		fillStyle: spell.fillStyle,
		radius: spell.radius,
	});
}

function renderTrail(ctx, trail) {
	let proportion = 1.0 * trail.remaining / trail.max;
	if (proportion <= 0) {
		return true;
	}


	ctx.save(); 

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

	--trail.remaining;
	return trail.remaining <= 0;
}

function renderInterface(ctx, world, rect) {
	let myHero = world.objects.get(world.ui.myHeroId);
	if (myHero) {
		renderButtons(ctx, ui.buttons, world, myHero, world.actions, rect);
	}
}

function renderButtons(ctx, buttons, world, hero, actions, rect) {
	let heroAction = actions.get(hero.id);
	let selectedAction = heroAction && heroAction.type;

	let buttonBarWidth = buttons.length * ButtonSize + (buttons.length - 1) * ButtonSpacing;

	ctx.save();
	ctx.translate(rect.width / 2.0 - buttonBarWidth / 2.0, rect.height - ButtonSize - ButtonMargin);

	for (let i = 0; i < buttons.length; ++i) {
		let spell = model.Spells[buttons[i]];
		if (!spell) {
			continue;
		}

		let isSelected = selectedAction === spell.id;
		let isCharging = hero.charging && hero.charging.spell === spell.id;
		let remainingInSeconds = model.cooldownRemaining(world, hero, spell.id) / TicksPerSecond;

		ctx.save();
		ctx.translate((ButtonSize + ButtonSpacing) * i, 0);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		// Button
		{
			ctx.save();

			ctx.fillStyle = spell.fillStyle;
			if (remainingInSeconds > 0) {
				ctx.fillStyle = isSelected ? '#cccccc' : '#444444';
			} else if (isCharging) {
				ctx.fillStyle = 'white';
			}

			ctx.beginPath();
			ctx.rect(0, 0, ButtonSize, ButtonSize);
			ctx.fill();

			ctx.restore();
		}
		
		// Icon
		if (spell.icon) {
			ctx.save();

			ctx.globalAlpha = 0.6;
			ctx.fillStyle = 'white';
			ctx.scale(ButtonSize / 512, ButtonSize / 512);
			ctx.fill(spell.icon);

			ctx.restore();
		}

		if (remainingInSeconds > 0) {
		// Cooldown
			let cooldownText = remainingInSeconds > 1 ? remainingInSeconds.toFixed(0) : remainingInSeconds.toFixed(1);

			ctx.font = 'bold ' + (ButtonSize - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, cooldownText, ButtonSize / 2, ButtonSize / 2);
		} else {
			// Keyboard shortcut
			ctx.save();

			ctx.font = 'bold ' + (ButtonSize / 2 - 1) + 'px sans-serif';
			renderTextWithShadow(ctx, spell.key.toUpperCase(), ButtonSize / 4, ButtonSize * 3 / 4);

			ctx.restore();
		}


		ctx.restore();
	}

	ctx.restore();
}

function renderTextWithShadow(ctx, text, x, y) {
	ctx.save();

	ctx.fillStyle = 'black';
	ctx.fillText(text, x + 1, y + 1);

	ctx.fillStyle = 'white';
	ctx.fillText(text, x, y);

	ctx.restore();
}



