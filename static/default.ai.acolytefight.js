var settings = null;
var center = { x: 0.5, y: 0.5 };
var missRadius = 0.05;
var delayMilliseconds = 2000;

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
    var opponent = findOpponent(state.heroes, heroId);
    if (!hero || !opponent) {
        // Either we're dead, or everyone else is, nothing to do
        return;
    }
    
    var action = null;
    if (state.started) {
        action =
            recovery(state, hero, cooldowns)
            || dodge(state, hero, cooldowns)
            || castSpell(state, hero, opponent, cooldowns)
            || move(state, hero, opponent);
    } else {
        action = move(state, hero, opponent);
    }

    if (action) {
        postMessage(JSON.stringify({ type: "action", action }));
    }
}

function findOpponent(heroes, myHeroId) {
    var myHero = heroes[myHeroId];
    if (!myHero) {
        return null;
    }

    var closest = null;
    var closestDistance = Infinity;
    for (var heroId in heroes) {
        var hero = heroes[heroId];
        if (hero.id !== myHeroId) {
            var distance = vectorDistance(hero.pos, myHero.pos);
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = hero;
            }
        }
    }
    return closest;
}

function recovery(state, hero, cooldowns) {
    var offset = vectorDiff(hero.pos, center);
    var length = vectorLength(offset);
    if (length < state.radius || state.radius <= 0) {
        // No need to recover
        return null;
    }

    var spellId = null;
    if (cooldowns["teleport"] === 0) {
        spellId = "teleport";
    } else if (cooldowns["thrust"] === 0) {
        spellId = "thrust";
    }

    if (spellId) {
        return { spellId, target: center };
    }
}

function deflect(state, hero, cooldowns, projectile) {
    if (cooldowns["shield"] === 0) {
        return { spellId: "shield", target: center };
    } else if (cooldowns["icewall"] === 0) {
        var target = vectorMidpoint(hero.pos, projectile.pos);
        return { spellId: "icewall", target };
    } else {
        return null;
    }
}

function castSpell(state, hero, opponent, cooldowns) {
    if (Date.now() < nextSpell) {
        return null;
    } else if (opponent.shieldTicksRemaining) {
        return null;
    }

    var candidates = [];
    for (var spellId in cooldowns) {
        var readyToCast = !cooldowns[spellId];
        var spell = settings.Spells[spellId];

        if (spell
            && readyToCast
            && (spell.action === "projectile" || spell.action === "spray")) {

            candidates.push(spellId);
        }
    }

    if (candidates.length > 0) {
        var spellId = candidates[Math.floor(Math.random() * candidates.length)];
        nextSpell = Date.now() + delayMilliseconds;
        return { spellId, target: jitter(opponent.pos, missRadius) };
    } else {
        return null;
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

function move(state, hero, opponent) {
    var offset = vectorNegate(vectorDiff(opponent.pos, center)); // Move to the opposite side of the arena
    var targetDistance = state.radius / 2; // Halfway between the center and the edge
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

        var diff = vectorDiff(hero.pos, projectile.pos);
        var distancePerTimeStep = vectorDot(projectile.velocity, vectorUnit(diff));
        if (distancePerTimeStep <= 0) {
            // Not coming towards us
            continue;
        }

        var timeToCollision = vectorLength(diff) / distancePerTimeStep;
        if (timeToCollision <= 0) {
            // Not coming towards us
            continue;
        }

        var collisionPoint = vectorPlus(projectile.pos, vectorMultiply(projectile.velocity, timeToCollision));
        var distanceToCollision = vectorDistance(collisionPoint, hero.pos);
        if (distanceToCollision > projectile.radius + hero.radius) {
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