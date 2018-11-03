import _ from 'lodash';
import moment from 'moment';
import msgpack from 'msgpack-lite';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as notifications from './notifications';
import * as sockets from './sockets';
import * as storage from '../storage';
import * as StoreProvider from '../storeProvider';
import { socket } from './sockets';
import { TicksPerSecond } from '../../game/constants';

let alreadyLoadedGameStats = false;

export function attachListener() {
    notifications.attachListener(notifs => onNotification(notifs));
    sockets.listeners.onGameMsg = onGameMsg;
}

function onNotification(notifs: w.Notification[]) {
    // Save the world if it has been won
    if (notifs.some(n => n.type === "win")) {
        const store = StoreProvider.getState();
        const world = store.world;
        if (world.winner) {
            save(world, store.server)
        }
    }
}

async function onGameMsg(buffer: ArrayBuffer) {
    const gameStatsMsg: m.GameStatsMsg = msgpack.decode(new Uint8Array(buffer));
    console.log("Received final game results", gameStatsMsg);

    const state = StoreProvider.getState();
    const gameStats = messageToGameStats(gameStatsMsg, state.userId);

    // Notify
    const self = gameStats.players[gameStats.self];
    if (self && self.ratingDelta) {
        notifications.notify({
            type: "ratingAdjustment",
            gameId: gameStats.id,
            ratingDelta: self.ratingDelta,
        });
    }

    // Add to replays list
    await storage.saveGameStats(gameStats);
    StoreProvider.dispatch({ type: "updateGameStats", allGameStats: [gameStats] });
}

export async function loadAllGameStats() {
    if (alreadyLoadedGameStats) {
        return;
    }

    alreadyLoadedGameStats = true;
    const allGameStats = await storage.loadAllGameStats();
    StoreProvider.dispatch({ type: "updateGameStats", allGameStats });
}

function gameStatsToMessage(gameStats: d.GameStats): m.GameStatsMsg {
    return {
        gameId: gameStats.id,
        partyId: gameStats.partyId,
        category: gameStats.category,
        unixTimestamp: moment(gameStats.timestamp).unix(),
        winner: gameStats.winner,
        lengthSeconds: gameStats.lengthSeconds,
        players: Object.keys(gameStats.players).map(userHash => playerStatsToMessage(gameStats.players[userHash])),
        server: gameStats.server,
    };
}

function playerStatsToMessage(playerStats: d.PlayerStats): m.PlayerStatsMsg {
    return {
        userId: playerStats.userId,
        userHash: playerStats.userHash,
        name: playerStats.name,
        kills: playerStats.kills,
        damage: playerStats.damage,
        ticks: playerStats.ticks,
        rank: playerStats.rank,
    };
}

export function messageToGameStats(msg: m.GameStatsMsg, userId: string): d.GameStats {
    const players: d.PlayerStatsLookup = {};
    let self: string = null;
    for (const p of msg.players) {
        players[p.userHash] = {
            userId: p.userId,
            userHash: p.userHash,
            name: p.name,
            damage: p.damage,
            kills: p.kills,
            rank: p.rank,
            ticks: p.ticks,
            ratingDelta: p.ratingDelta,
        };

        if (p.userId === userId) {
            self = p.userHash;
        }
    }

    return {
        id: msg.gameId,
        partyId: msg.partyId,
        category: msg.category,
        timestamp: moment.unix(msg.unixTimestamp).toISOString(),
        self,
        winner: msg.winner,
        lengthSeconds: msg.lengthSeconds,
        players,
        server: msg.server,
    };
}

export async function save(world: w.World, server: string): Promise<d.GameStats> {
    const gameStats = gameStatsFromWorld(world, server);
    if (gameStats) {
        if (world.winner) { // Don't confuse server with wrong stats if left early
            socket.emit('score', gameStatsToMessage(gameStats));
        }
        await storage.saveGameStats(gameStats);

        if (!world.ui.saved) { // Game is saved twice, once at win, once at leaving, don't double count it
            world.ui.saved = true;
            await storage.incrementNumGames();
        }

        StoreProvider.dispatch({ type: "updateGameStats", allGameStats: [gameStats] });
    }
    return gameStats;
}

function gameStatsFromWorld(world: w.World, server: string): d.GameStats {
    if (!(world.ui.myGameId && world.ui.myHeroId)) {
        return null;
    }

    let numHumans = 0;
    let numAI = 0;

    let players = new Array<d.PlayerStats>();
    world.scores.forEach((score, heroId) => {
        const player = world.players.get(heroId);
        if (player) {
            if (player.userHash) {
                ++numHumans;
                players.push(playerStatsFromScore(player, score));
            } else {
                ++numAI;
            }
        }
    });
    players = _.orderBy(players, p => p.rank);

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
    if (!selfPlayer.userHash) {
        // The user cleared the cookies and haven't been assigned a new hash - we can't store anything for them as we don't know who they are
        return null;
    } else if (Object.keys(world.mod).length > 0) {
        category = m.GameCategory.Mods;
    } else if (selfPlayer.isBot) {
        category = m.GameCategory.AIvAI;
    } else if (numHumans > 1) {
        category = m.GameCategory.PvP;
    } else {
        category = m.GameCategory.PvAI;
    }

    const stats: d.GameStats = {
        id: world.ui.myGameId,
        partyId: world.ui.myPartyId,
        category,
        timestamp: world.ui.createTime.toISOString(),
        players: _.keyBy(players, p => p.userHash),
        self: selfPlayer.userHash,
        winner: winningPlayer ? winningPlayer.userHash : undefined,
        lengthSeconds: world.winTick >= 0 ? Math.round(world.winTick / TicksPerSecond) : undefined,
        server,
    };
    return stats;
}

function playerStatsFromScore(player: w.Player, score: w.HeroScore): d.PlayerStats {
    return {
        userId: player.userId,
        userHash: player.userHash,
        name: player.name,
        kills: score.kills,
        damage: Math.round(score.damage),
        ticks: score.deathTick,
        rank: score.rank,
    };
}