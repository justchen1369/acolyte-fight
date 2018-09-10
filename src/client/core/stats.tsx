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
    if (gameStats) {
        return storage.saveGameStats(gameStats);
    } else {
        return Promise.resolve();
    }
}

function gameStatsFromWorld(world: w.World, server: string): d.GameStats {
    if (!(world.ui.myGameId && world.ui.myHeroId)) {
        return null;
    }

    let numHumans = 0;
    let numAI = 0;

    const players: d.PlayerStatsLookup = {};
    world.scores.forEach((score, heroId) => {
        const player = world.players.get(heroId);
        if (player) {
            if (player.userHash) {
                ++numHumans;
                players[player.userHash] = playerStatsFromScore(player, score);
            } else {
                ++numAI;
            }
        }
    });

    const selfPlayer = world.players.get(world.ui.myHeroId);
    const winningPlayer = world.players.get(world.winner);

    if (numHumans + numAI <= 1) {
        // Don't save if played by self
        return null;
    } else if (!(winningPlayer || !world.objects.get(world.ui.myHeroId))) {
        // Store complete games only - either a winner has been decided, or we are dead
        return null;
    }

    let category: string;
    if (selfPlayer.isBot) {
        category = d.GameCategory.AIvAI;
    } else if (numHumans > 1) {
        category = d.GameCategory.PvP;
    } else {
        category = d.GameCategory.PvAI;
    }

    const stats: d.GameStats = {
        id: world.ui.myGameId,
        category,
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