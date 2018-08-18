var settings = null;

onmessage = function (e) {
    var msg = e.data;
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
    var hero = findWorldObject(state.heroes, heroId);
    var opponent = findOpponent(state.heroes, heroId);
    if (!opponent) {
        return;
    }
    
    var action = null;
    if (state.started) {
        action =
            recovery(state, hero, cooldowns)
            || castSpell(state, hero, opponent, cooldowns)
            || move(state, opponent);
    } else {
        action = move(state, opponent);
    }

    if (action) {
        postMessage({ type: "action", gameId, heroId, action });
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
    for (var i = 0; i < heroes.length; ++i) {
        if (heroes[i].id !== myHeroId) {
            return heroes[i];
        }
    }
    return null;
}

function recovery(state, hero, cooldowns) {
    var center = { x: 0.5, y: 0.5 };
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

function castSpell(state, hero, opponent, cooldowns) {
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
    var center = { x: 0.5, y: 0.5 };
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