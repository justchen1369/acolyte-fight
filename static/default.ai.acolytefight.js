var settings = null;
var center = { x: 0.5, y: 0.5 };
var missRadius = 0.05;

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
            || deflect(state, hero, cooldowns)
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

function deflect(state, hero, cooldowns) {
    if (cooldowns["shield"] === 0) {
        return { spellId: "shield", target: center };
    } else {
        return null;
    }
}

function castSpell(state, hero, opponent, cooldowns) {
    if (opponent.shieldTicksRemaining) {
        return null;
    }

    if (alreadyHasProjectile(state, hero.id)) {
        // Only shoot one thing at a time
        return null;
    }

    for (var spellId in cooldowns) {
        var readyToCast = !cooldowns[spellId];
        var spell = settings.Spells[spellId];

        if (spell
            && !spell.chargeTicks
            && readyToCast
            && (spell.action === "projectile" || spell.action === "spray")) {

            return { spellId, target: jitter(opponent.pos, missRadius) };
        }
    }
    return null;
}

function alreadyHasProjectile(state, heroId) {
    for (var projectileId in state.projectiles) {
        var projectile = state.projectiles[projectileId];
        if (projectile.ownerId === heroId && vectorDistance(projectile.pos, center) <= state.radius) {
            // Projectiles stay alive a long time off the screen, so don't get blocked by those
            return true;
        }
    }
    return false;
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
    // Move to the opposite side of the arena
    var offset = vectorDiff(opponent.pos, center);
    var target = { x: center.x - offset.x, y: center.y - offset.y };

    var distanceToTarget = vectorDistance(hero.pos, target);
    if (distanceToTarget <= 0.001) {
        // Close enough - don't send any action so the game can sleep while waiting for players
        return null;
    }

    return { spellId: "move", target };
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