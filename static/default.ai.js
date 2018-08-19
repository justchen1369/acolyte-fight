var settings = null;
var center = { x: 0.5, y: 0.5 };

onmessage = function (e) {
    var msg = JSON.parse(e.data);
    if (msg.type === "init") {
        settings = msg.settings;
    } else if (msg.type === "state") {
        var gameId = msg.gameId;
        var heroId = msg.heroId;
        var state = msg.state;
        var cooldowns = msg.cooldowns;
        handleInput(gameId, heroId, state, cooldowns);
    }
}

function handleInput(gameId, heroId, state, cooldowns) {
    var hero = state.heroes[heroId];
    var opponent = findOpponent(state.heroes, heroId);
    if (!opponent) {
        return;
    }
    
    var action = null;
    if (state.started) {
        action =
            recovery(state, hero, cooldowns)
            || deflect(state, hero, cooldowns)
            || castSpell(state, hero, opponent, cooldowns)
            || move(state, opponent);
    } else {
        action = move(state, opponent);
    }

    if (action) {
        postMessage(JSON.stringify({ type: "action", gameId, heroId, action }));
    }
}

function findWorldObject(objects, targetId) {
    for (var i = 0; i < objects.length; ++i) {
        if (objects[i].id === targetId) {
            return objects[i];
        }
    }
    return null;
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
            var distance = vectorLength(vectorDiff(hero.pos, myHero.pos));
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

    for (var spellId in cooldowns) {
        var readyToCast = !cooldowns[spellId];
        var spell = settings.Spells[spellId];

        if (spell
            && !spell.chargeTicks
            && readyToCast
            && (spell.action === "projectile" || spell.action === "spray")) {

            return { spellId, target: opponent.pos };
        }
    }
    return null;
}

function move(state, opponent) {
    // Move to the opposite side of the arena
    var offset = vectorDiff(opponent.pos, center);
    var target = { x: center.x - offset.x, y: center.y - offset.y };

    return { spellId: "move", target };
}

function vectorDiff(to, from) {
    return { x: to.x - from.x, y: to.y - from.y };
}

function vectorLength(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}