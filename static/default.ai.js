onmessage = function (e) {
    var msg = e.data;
    if (msg.type === "world") {
        var gameId = msg.gameId;
        var heroId = msg.heroId;
        var state = msg.state;
        var cooldowns = msg.cooldowns;
        handleInput(gameId, heroId, state, cooldowns);
    }
}

function handleInput(gameId, heroId, state, cooldowns) {
    postMessage({
        type: "action",
        gameId,
        heroId,
        action: {
            type: "move",
            target: { x: 0.5, y: 0.5 },
        }
    });
}