var settings = null;
var center = { x: 0.5, y: 0.5 };

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
    if ("fireball" in cooldowns) {
        action = { spellId: "fireball", target: opponent.pos };
    } else if ("flamestrike" in cooldowns) {
        action = { spellId: "flamestrike", target: opponent.pos };
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

function vectorDiff(to, from) {
    return { x: to.x - from.x, y: to.y - from.y };
}

function vectorLength(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

function vectorDistance(from, to) {
    return vectorLength(vectorDiff(from, to));
}