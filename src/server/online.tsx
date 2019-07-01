import _ from 'lodash';
import moment from 'moment';
import * as constants from '../game/constants';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as Firestore from '@google-cloud/firestore';
import * as db from './db.model';
import * as dbStorage from './dbStorage';
import * as mirroring from './mirroring';
import { getFirestore } from './dbStorage';
import { logger } from './logging';
import { getStore } from './serverStore';

const OnlineExpirySeconds = 20 * 60;
const TextExpirySeconds = 2 * 60;

let emitOnline: OnlineChangeListener = (diff) => {};

export interface OnlineChangeListener {
	(diff: m.OnlineMsg): void;
}

export async function init() {
	await loadScoreboard();
}

export function attachOnlineEmitter(_emit: OnlineChangeListener) {
	emitOnline = _emit;
}

export function getOnlinePlayers(segment: string): m.OnlineMsg {
	const scoreboard = getStore().scoreboards.get(segment);
	const all = new Array<m.OnlinePlayerMsg>();
	const texts = new Array<m.TextMsg>();
    if (scoreboard) {
		scoreboard.online.forEach(player => {
			all.push(onlineToMsg(player, scoreboard.scores.get(player.userHash)));
		});
		scoreboard.messages.forEach(message => {
			texts.push(message.msg);
		});
	}
	return { segment, all, texts };
}

function getOrCreateScoreboard(segment: string): g.Scoreboard {
	const store = getStore();
	let scoreboard = store.scoreboards.get(segment);
	if (!scoreboard) {
		scoreboard = { segment, online: new Map(), scores: new Map(), messages: [] };
		store.scoreboards.set(segment, scoreboard);
	}
	return scoreboard;
}

export function receiveTextMessage(segment: string, userHash: string, name: string, text: string) {
	if (text.length > constants.MaxTextMessageLength || text.indexOf("\n") !== -1) {
		logger.info("text message received from [" + userHash + "] was invalid");
		return;
	}

	const store = getStore();
	const scoreboard = store.scoreboards.get(segment);
	if (!scoreboard) {
		return;
	}

	const timestamp = Date.now();
	const msg: m.TextMsg = {
		userHash,
		name,
		text,
	};
	scoreboard.messages.push({ timestamp, msg });

	emitOnline({
		segment,
		texts: [msg],
	});

	logger.info(`${name} says: ${text}`);
}

export function updateOnlinePlayers(running: g.Game[]) {
	const store = getStore();

	const gamesBySegment = _.groupBy(running, game => game.segment);
	for (const segment in gamesBySegment) {
		updateOnlineSegment(segment, gamesBySegment[segment]);
	}

	const emptySegments = _.difference([...store.scoreboards.keys()], Object.keys(gamesBySegment)); 
	for (const segment of emptySegments) {
		updateOnlineSegment(segment, []);
	}
}

function updateOnlineSegment(segment: string, games: g.Game[]) {
	const scoreboard = getOrCreateScoreboard(segment);

	const left = new Set<string>(scoreboard.online.keys());
	const joined = new Array<g.OnlinePlayer>();
	games.forEach(game => {
		if (game.locked) {
			return; // Private game - doesn't count
		}

		game.active.forEach(player => {
			left.delete(player.userHash);
				
			const joining: g.OnlinePlayer = {
				userHash: player.userHash,
				userId: player.userId,
				name: player.name,
			};

			const existing = scoreboard.online.get(player.userHash);
			if (!_.isEqual(existing, joining)) {
				scoreboard.online.set(joining.userHash, joining);
				joined.push(joining);
			}
		});
	});

	left.forEach(userHash => {
		const leaving = scoreboard.online.get(userHash);
		if (leaving) {
			scoreboard.online.delete(userHash);
		}
	});

	if (left.size > 0 || joined.length > 0) {
		emitOnline({
			segment,
			joined: joined.map(player => onlineToMsg(player, scoreboard.scores.get(player.userHash))),
			left: [...left],
		});
	}
}

function onlineToMsg(player: g.OnlinePlayer, score: g.PlayerScore): m.OnlinePlayerMsg {
	return {
		userId: player.userId,
		userHash: player.userHash,
		name: player.name,
		wins: score ? score.wins : 0,
		damage: score ? score.damage : 0,
		outlasts: score ? score.outlasts : 0,
		kills: score ? score.kills : 0,
		games: score ? score.games : 0,
	};
}

async function loadScoreboard(): Promise<void> {
    const firestore = getFirestore();

	const start = Date.now();
    const query = getLeaderboardCollection(firestore)

    await dbStorage.stream(query, doc => {
		const entry = doc.data() as db.PlayerScore;
		initScore(entry);
	});

	const elapsed = Date.now() - start;
	logger.info(`Loaded scoreboard in ${elapsed} ms`);
}

function initScore(entry: db.PlayerScore) {
	const scoreboard = getOrCreateScoreboard(entry.segment);
	scoreboard.scores.set(entry.userHash, dbToScore(entry));
}

export async function incrementStats(segment: string, gameStats: m.GameStatsMsg) {
	const scoreboard = getOrCreateScoreboard(segment);

	const humanPlayers = gameStats.players.filter(player => !!player.userHash);
	if (humanPlayers.length < 2) {
		// Only count games with at least 2 human players
		return;
	}

	const updated = new Array<g.PlayerScore>();
	const winners = new Set<string>(gameStats.winners);
    for (const player of humanPlayers) {
        if (!player.userHash) {
            continue;
        }

		const isWinner = winners.has(player.userHash);
		const score = incrementPlayer(scoreboard, player, isWinner);

        updated.push(score);
	}
	
	sendUpdate(scoreboard, updated);
	await writeUpdate(scoreboard, updated);
}

function incrementPlayer(scoreboard: g.Scoreboard, player: m.PlayerStatsMsg, winner: boolean) {
	const now = moment().unix();

	let score = scoreboard.scores.get(player.userHash);
	if (!score) {
		score = {
			userHash: player.userHash,
			userId: player.userId,
			name: player.name,
			outlasts: 0,
			wins: 0,
			kills: 0,
			damage: 0,
			games: 0,
			expiry: now + OnlineExpirySeconds,
		};
		scoreboard.scores.set(player.userHash, score);
	}

	score.name = player.name;
	score.userId = player.userId;
	
	score.outlasts += player.outlasts;
	score.kills += player.kills;
	score.damage += player.damage;

	++score.games;
	if (winner) {
		++score.wins;
	}

	score.expiry = now + OnlineExpirySeconds;

	return score;
}

function sendUpdate(scoreboard: g.Scoreboard, updated: g.PlayerScore[]) {
	const changed = new Array<m.OnlinePlayerMsg>();
	updated.forEach(score => {
		const player = scoreboard.online.get(score.userHash);
		if (player) {
			changed.push(onlineToMsg(player, score));
		}
	});

	if (changed.length > 0) {
		const msg: m.OnlineMsg = {
			segment: scoreboard.segment,
			changed,
		};
		emitOnline(msg);
	}
}

async function writeUpdate(scoreboard: g.Scoreboard, updated: g.PlayerScore[]) {
	const firestore = getFirestore();
	const collection = getLeaderboardCollection(firestore);

	for (const score of updated) {
		await collection.doc(scoreToDbKey(scoreboard.segment, score)).set(scoreToDb(scoreboard.segment, score));
	}
}

function scoreToDbKey(segment: string, score: g.PlayerScore): string {
	return `${segment}.${score.userHash}`;
}

function scoreToDb(segment: string, score: g.PlayerScore): db.PlayerScore {
	return {
		segment,
        userHash: score.userHash || null,
        name: score.name,
        userId: score.userId || null,
        wins: score.wins,
        kills: score.kills,
        damage: score.damage,
        outlasts: score.outlasts,
        games: score.games,
        expiry: score.expiry,
	};
}

function dbToScore(data: db.PlayerScore): g.PlayerScore {
	return {
        userHash: data.userHash || null,
        name: data.name,
        userId: data.userId || null,
        wins: data.wins,
        kills: data.kills,
        damage: data.damage,
        outlasts: data.outlasts,
        games: data.games,
        expiry: data.expiry,
	};
}

export async function cleanupScoreboards() {
	const store = getStore();
	for (const scoreboard of store.scoreboards.values()) {
		await cleanupScoreboard(scoreboard);
		expireMessages(scoreboard);
	}

	store.scoreboards.forEach(scoreboard => {
		if (scoreboard.online.size === 0 && scoreboard.scores.size === 0) {
			store.scoreboards.delete(scoreboard.segment);
		}
	});
}

export async function cleanupScoreboard(scoreboard: g.Scoreboard) {
	const firestore = getFirestore();
	const collection = getLeaderboardCollection(firestore);
	const now = moment().unix();
	for (const score of scoreboard.scores.values()) {
		if (now >= score.expiry) {
			scoreboard.scores.delete(score.userHash);
			await collection.doc(scoreToDbKey(scoreboard.segment, score)).delete();
		}
	}
}

export function expireMessages(scoreboard: g.Scoreboard) {
	const cutoff = Date.now() - TextExpirySeconds * 1000;
	scoreboard.messages = _.dropWhile(scoreboard.messages, t => t.timestamp < cutoff);
}

function getLeaderboardCollection(firestore: Firestore.Firestore) {
    const location = mirroring.getLocation();
    return getFirestore()
        .collection(db.Collections.Scoreboard)
        .doc(location.region || "global")
        .collection(db.Collections.ScoreboardEntries)
}