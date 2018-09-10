import * as d from '../stats.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as notifications from './notifications';
import * as storage from '../storage';
import * as StoreProvider from '../storeProvider';
import { TicksPerSecond } from '../../game/constants';

export function attachListener() {
    notifications.attachListener(notifs => onNotification(notifs));
}

function onNotification(notifs: w.Notification[]) {
    // Save the world if it has been won
    if (notifs.some(n => n.type === "win")) {
        const store = StoreProvider.getState();
        const world = store.world;
        if (world.winner) {
            save(world, store.server);
        }
    }
}

export function save(world: w.World, server: string): Promise<void> {
    const gameStats = gameStatsFromWorld(world, server);
    if (gameStats && Object.keys(gameStats.players).length > 1) {
        return storage.saveGameStats(gameStats);
    } else {
        return Promise.resolve();
    }
}

function gameStatsFromWorld(world: w.World, server: string): d.GameStats {
    if (!(world.ui.myGameId && world.ui.myHeroId)) {
        return null;
    }

    const players: d.PlayerStatsLookup = {};
    world.scores.forEach((score, heroId) => {
        const player = world.players.get(heroId);
        if (player && player.userHash) {
            players[player.userHash] = playerStatsFromScore(player, score);
        }
    });

    const selfPlayer = world.players.get(world.ui.myHeroId);
    const winningPlayer = world.players.get(world.winner);

    const stats: d.GameStats = {
        id: world.ui.myGameId,
        timestamp: world.ui.createTime.toISOString(),
        players,
        self: selfPlayer.userHash,
        winner: winningPlayer ? winningPlayer.userHash : undefined,
        lengthSeconds: world.winTick >= 0 ? world.winTick / TicksPerSecond : undefined,
        server,
    };
    return stats;
}

function playerStatsFromScore(player: w.Player, score: w.HeroScore): d.PlayerStats {
    return {
        userHash: player.userHash,
        name: player.name,
        kills: score.kills,
        damage: score.damage,
    };
}