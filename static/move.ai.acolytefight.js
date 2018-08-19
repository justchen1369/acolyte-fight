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
    if (!hero) {
        // We're dead, nothing to do
        return;
    }

    var action = { spellId: "move", target: center };

    if (action) {
        postMessage(JSON.stringify({ type: "action", action }));
    }
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