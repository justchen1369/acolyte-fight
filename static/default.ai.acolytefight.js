var settings = null;

var center = { x: 0.5, y: 0.5 };
var missRadius = 0.05;
var dodgeMinRadius = 0.03;
var reactionTimeMilliseconds = 200;
var delayMilliseconds = 2000;
var delayJitterMilliseconds = 500;
var AllianceSelf = 0x01;
var AllianceAlly = 0x02;
var AllianceEnemy = 0x04;

var spellReactionTimeMilliseconds = { // Slow down the reaction time on certain spells
    shield: 500,
    icewall: 500,
    teleport: 500,
    thrust: 500
};

var nextSpell = 0;

onmessage = function (e) {
    var msg = JSON.parse(e.data);
    if (msg.type === "init") {
        settings = msg.settings;
    } else if (msg.type === "state") {
        var state = msg.state;
        var heroId = msg.heroId;
        var cooldowns = msg.cooldowns;
        handleInput(state, heroId, cooldowns);
    }
}

function handleInput(state, heroId, cooldowns) {
    var hero = state.heroes[heroId];
    var strongest = findStrongest(state.heroes, heroId, AllianceEnemy);
    var closest = findClosest(state.heroes, heroId, AllianceEnemy);
    if (!(hero && strongest && closest)) {
        // Either we're dead, or everyone else is, nothing to do
        return;
    }
    
    var action = null;
    if (state.started) {
        action =
            recovery(state, hero, cooldowns)
            || dodge(state, hero, cooldowns)
            || castSpell(state, hero, strongest, cooldowns)
            || focus(hero, strongest)
            || chase(state, hero, cooldowns, strongest)
            || move(state, hero, closest);
    } else {
        action = move(state, hero, closest);
    }

    if (action) {
        setTimeout(function() {
            postMessage(JSON.stringify({ type: "action", action }));
        }, spellReactionTimeMilliseconds[action.spellId] || reactionTimeMilliseconds);
    }
}

function findClosest(heroes, myHeroId, allianceFlags) {
    var myHero = heroes[myHeroId];
    if (!myHero) {
        return null;
    }

    var closest = null;
    var closestDistance = Infinity;
    for (var heroId in heroes) {
        var hero = heroes[heroId];
        if (hero.alliance & allianceFlags) {
            var distance = vectorDistance(hero.pos, myHero.pos);
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = hero;
            }
        }
    }
    return closest;
}

function findStrongest(heroes, myHeroId, allianceFlags) {
    var myHero = heroes[myHeroId];
    if (!myHero) {
        return null;
    }

    var choice = null;
    var mostHealth = 0;
    for (var heroId in heroes) {
        var hero = heroes[heroId];
        if (hero.alliance & allianceFlags) {
            if (hero.health > mostHealth) {
                mostHealth = hero.health;
                choice = hero;
            }
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
}

function deflect(state, hero, cooldowns, projectile) {
    var target = vectorMidpoint(hero.pos, projectile.pos);
    var spellId = null;
    if (cooldowns["shield"] === 0) {
        spellId = "shield";
    } else if (cooldowns["icewall"] === 0) {
        spellid = "icewall";
    } else if (cooldowns["saber"] === 0) {
        spellId = "saber";
    } else if (cooldowns["dualSaber"] === 0) {
        spellId = "dualSaber";
    } else if (cooldowns["meteor"] === 0) {
        spellId = "meteor";
    } else if (cooldowns["meteorite"] === 0) {
        spellId = "meteorite";
    } else {
        spellId = null;
    }

    if (spellId) {
        return { spellId, target };
    } else {
        return null;
    }
}

function castSpell(state, hero, opponent, cooldowns) {
    if (Date.now() < nextSpell && !hero.linkedToId) {
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
        nextSpell = Date.now() + delayMilliseconds + Math.floor((Math.random() < 0.5 ? -1 : 1) * Math.random() * delayJitterMilliseconds);
        return { spellId, target: jitter(opponent.pos, missRadius) };
    } else {
        return null;
    }
}

function validAttack(state, hero, opponent, spell) {
    var opponentShielded = !!opponent.shieldTicksRemaining;

    var distance = vectorDistance(hero.pos, opponent.pos);
    if (spell.action === "projectile" || spell.action === "spray" || spell.action === "retractor" || spell.action === "focus") {
        if (spell.projectile.swapWith) { // Swap doesn't work as an attack
            return false;
        }
        if (opponentShielded && !spell.projectile.detonate) { // Detonate spells can penetrate shields, nothing else can
            return false;
        }

        var range = spell.projectile.speed * spell.projectile.maxTicks / state.ticksPerSecond + opponent.radius;
        return distance <= range;
    } else if (spell.action === "scourge") {
        var range = spell.radius + opponent.radius;
        return distance <= range;
    } else {
        return false;
    }
}

function jitter(target, missRadius) {
    var radius = Math.random() * missRadius;
    var angle = Math.random() * 2 * Math.PI;
    return {
        x: target.x + radius * Math.cos(angle),
        y: target.y + radius * Math.sin(angle),
    };
}

function focus(hero, opponent) { // When charging a spell (e.g. Acolyte Beam) - ensure we are focusing the enemy, otherwise we will miss
    if (hero.casting) {
        if (hero.casting.spellId === "saber") {
            // Don't focus the lightsaber, just swish it around
            return { spellId: "retarget", target: vectorPlus(hero.pos, vectorRotateRight(hero.heading)) };
        } else {
            return { spellId: "retarget", target: opponent.pos };
        }
    } else {
        return null;
    }
}

function chase(state, hero, cooldowns, opponent) {
    var numHalos = 0;
    for (var projectileId in state.projectiles) {
        var projectile = state.projectiles[projectileId];
        if (projectile.ownerId === hero.id && projectile.spellId === "halo") {
            ++numHalos;
        }
    }

    if (numHalos >= 2 || cooldowns["whip"] === 0) {
        var target = vectorMidpoint(hero.pos, opponent.pos);
        return { spellId: "move", target };
    } else {
        return null;
    }
}

function move(state, hero, opponent) {
    var offset = vectorNegate(vectorDiff(opponent.pos, center)); // Move to the opposite side of the arena
    var targetDistance = state.radius * 0.33; // Closer to center than edge (for polygonal maps)
    var target = vectorPlus(center, vectorRelengthen(offset, targetDistance));

    var distanceToTarget = vectorDistance(hero.pos, target);
    if (distanceToTarget <= 0.001) {
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
        if (distanceToCollision > Math.max(dodgeMinRadius, projectile.radius) + hero.radius) {
            // Won't hit us
        }

        var deflectAction = deflect(state, hero, cooldowns, projectile);
        if (deflectAction) {
            return deflectAction;
        }

        // Run away from collision point
        var direction = vectorUnit(vectorNegate(vectorDiff(collisionPoint, hero.pos)));
        var step = vectorMultiply(direction, projectile.radius + hero.radius);
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

function vectorRotateRight(vec) {
	return { x: vec.y, y: -vec.x };
}