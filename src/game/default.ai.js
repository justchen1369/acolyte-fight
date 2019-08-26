var center = { x: 0.5, y: 0.5 };

var CloseEnoughDistance = 0.01;
var MissRadius = 0.05;
var DodgeRadius = 0.05;
var SpellCastIntervalMilliseconds = 1000;
var SpellCastJitterMilliseconds = 500;

var TicksPerSecond = 60;

var DefaultReactionMilliseconds = 400;
var ReactionMillisecondsLookup = { // Change the reaction time on certain spells
    retarget: 200,
};

var alreadyChosenSpells = false;
var nextSpell = 0;

// See ai.contracts.ts:
// input is InputContract - contains information about the current state of the world
// output is OutputContract - an action you want to take in response to the world 
function act(input) {
    // Want the bot to do nothing? Uncomment the line below (remove the //):
    // return null;

    var state = input.state;
    var heroId = input.heroId;
    var hero = state.heroes[heroId];
    var cooldowns = input.cooldowns;
    var settings = input.settings;

    var opponent = findOpponent(state.heroes, heroId);
    if (!(hero && opponent)) {
        // Either we're dead, or everyone else is, nothing to do
        return null;
    }
    
    var action = null;
    if (state.started) {
        action =
            recovery(state, hero, cooldowns)
            || dodge(state, hero, cooldowns)
            || castSpell(state, hero, opponent, cooldowns, settings)
            || focus(hero, opponent)
            || chase(state, hero, cooldowns, opponent)
            || move(state, hero);
    } else {
        action =
            chooseSpells(settings)
            || dodge(state, hero, cooldowns)
            || move(state, hero);
    }

    if (action) {
        // Give the bot a reaction time otherwise it is OP
        var reactionMilliseconds = ReactionMillisecondsLookup[action.spellId] || DefaultReactionMilliseconds;
        action.delayMilliseconds = reactionMilliseconds;
        return action;
    } else {
        return null;
    }
}

function chooseSpells(settings) {
    if (alreadyChosenSpells) {
        return null;
    }
    alreadyChosenSpells = true;

    var spells = randomSpells(settings);

    // Want to test a particular spell? Uncomment and edit the lines below
    // spells["e"] = "saber";

    return { spells };
}

function randomSpells(settings) {
	var keyBindings = {};
	var allOptions = settings.Choices.Options;
	for (var btn in allOptions) { // One of the buttons, e.g. Q or R
        var options = allOptions[btn];

        var spellIds = [];
        for (var i = 0; i < options.length; ++i) {
            var row = options[i];
            for (var j = 0; j < row.length; ++j) {
                var spellId = row[j];
                spellIds.push(spellId);
            }
        }

		if (spellIds.length > 1) {
			keyBindings[btn] = spellIds[Math.floor(Math.random() * spellIds.length)];
		}
	}
	return keyBindings;
}

function findOpponent(heroes, myHeroId) {
    var myHero = heroes[myHeroId];
    if (!myHero) {
        return null;
    }

    var choice = null;
    var mostHealth = 0;
    for (var heroId in heroes) {
        var hero = heroes[heroId];

        if (!hero.isEnemy) { continue; }

        // Uncomment the line below to only target humans
        // if (hero.isBot) { continue; }

        if (hero.health > mostHealth) {
            // Target the enemy with the most health
            mostHealth = hero.health;
            choice = hero;
        }
    }
    return choice;
}

function recovery(state, hero, cooldowns) {
    if (hero.inside || state.radius <= 0) {
        // No need to recover
        return null;
    }

    var spellId = null;
    if (cooldowns["teleport"] === 0) {
        spellId = "teleport";
    } else if (cooldowns["thrust"] === 0) {
        spellId = "thrust";
    } else if (cooldowns["swap"] === 0) {
        spellId = "swap";
    } else if (cooldowns["voidRush"] === 0) {
        spellId = "voidRush";
    } else if (cooldowns["vanish"] === 0) {
        spellId = "vanish";
    } else {
        spellId = "move";
    }

    if (spellId) {
        return { spellId, target: center };
    }
    return null;
}

function deflect(state, hero, cooldowns, projectile) {
    var target = vectorMidpoint(hero.pos, projectile.pos);
    var spellId = null;
    if (cooldowns["shield"] === 0) {
        spellId = "shield";
    } else if (cooldowns["icewall"] === 0) {
        spellId = "icewall";
    } else if (cooldowns["saber"] === 0) {
        spellId = "saber";
    } else if (cooldowns["dualSaber"] === 0) {
        spellId = "dualSaber";
    } else if (cooldowns["meteor"] === 0) {
        spellId = "meteor";
    } else if (cooldowns["meteorite"] === 0) {
        spellId = "meteorite";
    } else if (cooldowns["whirlwind"] === 0) {
        spellId = "whirlwind";
    } else if (cooldowns["phaseOut"] === 0) {
        spellId = "phaseOut";
    } else {
        spellId = null;
    }

    if (spellId) {
        return { spellId, target };
    } else {
        return null;
    }
}

function castSpell(state, hero, opponent, cooldowns, settings) {
    if (!readyForNextSpell(hero)) {
        return null;
    }

    var candidates = [];
    for (var spellId in cooldowns) {
        var readyToCast = !cooldowns[spellId];
        var spell = settings.Spells[spellId];

        if (spell
            && readyToCast
            && validAttack(state, hero, opponent, spell)) {

            candidates.push(spellId);
        }
    }

    if (candidates.length > 0) {
        var spellId = candidates[Math.floor(Math.random() * candidates.length)];
        var action = { spellId, target: jitter(opponent.pos, MissRadius) };
        if (action.spellId === spellId) {
            updateNextSpellTime();
        }
        return action;
    } else {
        return null;
    }
}

function validAttack(state, hero, opponent, spell) {
    var opponentShielded = !!opponent.shieldTicksRemaining;

    var distance = vectorDistance(hero.pos, opponent.pos);
    if (spell.action === "projectile" || spell.action === "spray" || spell.action === "retractor" || spell.action === "focus" || spell.action === "charge") {
        if (spell.projectile.swapWith) { // Swap doesn't work as an attack
            return false;
        }
        if (opponentShielded && !spell.projectile.detonate) { // Detonate spells can penetrate shields, nothing else can
            return false;
        }
        if (spell.id === "whip") {
            // Just keep casting Electroshock even if out of range
            return true;
        }

        var range = spell.projectile.speed * spell.projectile.maxTicks / TicksPerSecond + opponent.radius;
        return distance <= range;
    } else if (spell.action === "scourge") {
        var range = spell.radius + opponent.radius;
        return distance <= range;
    } else {
        return false;
    }
}

function readyForNextSpell(hero) {
    return (
        Date.now() >= nextSpell // Don't cast too fast
        || !!hero.link // If linked to something, cast as many spells as possible
    );
}

function updateNextSpellTime() {
    nextSpell = Date.now() + SpellCastIntervalMilliseconds + Math.floor((Math.random() < 0.5 ? -1 : 1) * Math.random() * SpellCastJitterMilliseconds);
}

function jitter(target, missRadius) {
    var radius = Math.random() * missRadius;
    var angle = Math.random() * 2 * Math.PI;
    return {
        x: target.x + radius * Math.cos(angle),
        y: target.y + radius * Math.sin(angle),
    };
}

function focus(hero, opponent) { // When using a spell (e.g. Acolyte Beam, Spirit Missile) - ensure we are focusing the enemy, otherwise we will miss
    if (hero.casting) {
        if (hero.casting.spellId === "blast" || hero.casting.spellId === "retractor" || hero.casting.spellId === "rocket") {
            // Have to release or it won't fire
            return { spellId: hero.casting.spellId, release: true, target: opponent.pos };
        } else if (hero.casting.spellId === "saber" || hero.casting.spellId === "dualSaber") {
            // Don't focus the lightsaber, just swish it around
            return { spellId: "retarget", target: vectorPlus(hero.pos, vectorFromAngle(hero.heading + Math.PI / 2)) };
        } else if (hero.casting.spellId === "grapple") {
            // Throw away to the right (TODO: be smarter about this)
            return { spellId: hero.casting.spellId, release: true, target: vectorPlus(hero.pos, vectorFromAngle(hero.heading + Math.PI / 2)) };
        } else if (hero.casting.spellId === "halo") {
            return { spellId: "move", target: opponent.pos };
        } else {
            return { spellId: "retarget", target: opponent.pos };
        }
    } else {
        return null;
    }
}

function chase(state, hero, cooldowns, opponent) {
    if ("whip" in cooldowns) {
        // Got to get within range when using Electroshock
        var target = vectorMidpoint(hero.pos, opponent.pos);
        return { spellId: "move", target };
    } else {
        return null;
    }
}

function move(state, hero) {
    var centroid = { x: 0, y: 0 };
    var numOpponents = 0;
    for (var heroId in state.heroes) {
        if (heroId === hero.id) {
            continue; // Ignore self
        }

        var opponent = state.heroes[heroId];
        centroid.x += opponent.pos.x;
        centroid.y += opponent.pos.y;

        ++numOpponents;
    }
    centroid.x /= numOpponents;
    centroid.y /= numOpponents;

    if (!numOpponents) {
        return;
    }

    var offset = vectorNegate(vectorDiff(centroid, center)); // Move to the opposite side of the arena
    var targetDistance = state.radius * 0.33; // Closer to center than edge (for polygonal maps)
    var target = vectorPlus(center, vectorRelengthen(offset, targetDistance));

    var distanceToTarget = vectorDistance(hero.pos, target);
    if (distanceToTarget <= CloseEnoughDistance) {
        // Close enough - don't send any action so the game can sleep while waiting for players
        return null;
    }

    return { spellId: "move", target };
}

function dodge(state, hero, cooldowns) {
    for (var projectileId in state.projectiles) {
        var projectile = state.projectiles[projectileId];
        if (projectile.ownerId === hero.id) {
            // This is my own projectile
            continue;
        }

        if (projectile.spellId === "halo") {
            // Halo is never coming for us, it orbits around its owner
            continue;
        }

        var diff = vectorDiff(hero.pos, projectile.pos);
        var distancePerTimeStep = vectorDot(projectile.velocity, vectorUnit(diff));
        if (distancePerTimeStep <= 0) {
            // Not coming towards us
            continue;
        }

        var timeToCollision = vectorLength(diff) / distancePerTimeStep;
        if (timeToCollision <= 0 || timeToCollision >= 30) {
            // Not coming towards us or too far away
            continue;
        }

        var collisionPoint = vectorPlus(projectile.pos, vectorMultiply(projectile.velocity, timeToCollision));
        var distanceToCollision = vectorDistance(collisionPoint, hero.pos);
        var dodgeRadius = Math.max(DodgeRadius, projectile.radius) + hero.radius;
        if (distanceToCollision > dodgeRadius) {
            // Won't hit us
            continue;
        }

        var deflectAction = deflect(state, hero, cooldowns, projectile);
        if (deflectAction) {
            return deflectAction;
        }

        // Run away from collision point
        var direction = vectorUnit(vectorNegate(vectorDiff(collisionPoint, hero.pos)));
        var step = vectorMultiply(direction, dodgeRadius);
        var target = vectorPlus(hero.pos, step);
        return { spellId: "move", target };
    }
    return null;
}

function vectorDiff(to, from) {
    return { x: to.x - from.x, y: to.y - from.y };
}

function vectorLength(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

function vectorDistance(from, to) {
    return vectorLength(vectorDiff(from, to));
}

function vectorUnit(vec) {
    var length = vectorLength(vec);
    return length === 0 ? vec : vectorMultiply(vec, 1 / length);
}

function vectorPlus(from, offset) {
    return { x: from.x + offset.x, y: from.y + offset.y };
}

function vectorMultiply(vec, multiplier) {
    return { x: vec.x * multiplier, y: vec.y * multiplier };
}

function vectorRelengthen(vec, length) {
    return vectorMultiply(vectorUnit(vec), length);
}

function vectorNegate(vec) {
    return vectorMultiply(vec, -1);
}

function vectorDot(a, b) {
    return (a.x * b.x) + (a.y * b.y);
}

function vectorMidpoint(a, b) {
    var diff = vectorDiff(b, a);
    return vectorPlus(a, vectorMultiply(diff, 0.5));
}

function vectorFromAngle(angle) {
	return { x: Math.cos(angle), y: Math.sin(angle) };
}

// See ai.contracts.ts: Must return a BotContract
return { act };