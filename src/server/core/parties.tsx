import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import uniqid from 'uniqid';
import wu from 'wu';
import * as constants from '../../game/constants';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as auth from '../auth/auth';
import * as games from './games';
import * as matchmaking from './matchmaking';
import { getStore } from '../serverStore';
import { logger } from '../status/logging';

let emitParty: PartyEmitter = null;

export interface PartyEmitter {
	(party: g.Party): void;
}

export function attachToPartyEmitter(emit: PartyEmitter) {
	emitParty = emit;
}

export function onDisconnect(socketId: string) {
    const store = getStore();

	const changedParties = new Array<g.Party>();
	store.parties.forEach(party => {
		if (party.active.has(socketId)) {
			removePartyMember(party, socketId);
			changedParties.push(party);
		}
	});

	changedParties.forEach(party => {
        emitParty(party);
    });
}

export function initParty(leaderSocketId: string, roomId: string = null): g.Party {
	const partyIndex = getStore().nextPartyId++;
	const party: g.Party = {
		id: "p" + partyIndex + "-" + Math.floor(Math.random() * 1e6).toString(36),
		created: moment(),
		modified: moment(),
		roomId,
		active: new Map<string, g.PartyMember>(),
        waitForPlayers: true,
        isLocked: false,
        initialObserver: false,
	};
	getStore().parties.set(party.id, party);
	return party;
}

export function isAuthorizedToChange(party: g.Party, initiatorId: string, memberId: string, newStatus: Partial<g.PartyMemberStatus>) {
    const initiator = party.active.get(initiatorId);
    const isLeader = initiator && initiator.isLeader;
    const isSelf = initiatorId === memberId;

    if (newStatus.isLeader !== undefined) {
        if (!isLeader) {
            return false;
        }
    }
    if (newStatus.isObserver !== undefined || newStatus.team !== undefined) {
        if (party.isLocked) {
            if (!isLeader) {
                return false;
            }
        } else {
            if (!(isSelf || isLeader)) {
                return false;
            }
        }
    }
    if (newStatus.ready !== undefined) {
        if (!isSelf) {
            return false;
        }
    }

    return true;
}

export function isAuthorizedToAdmin(party: g.Party, initiatorId: string) {
    const initiator = party.active.get(initiatorId);
    return initiator && initiator.isLeader;
}

export function updatePartyStatus(party: g.Party, status: Partial<g.PartyStatus>) {
    Object.assign(party, status);
    logger.info(`Party ${party.id} changed to room=${party.roomId} waitForPlayers=${party.waitForPlayers} isLocked=${party.isLocked} initialObserver=${party.initialObserver}`);
}

export function createOrUpdatePartyMember(party: g.Party, newSettings: g.JoinParameters) {
	let member: g.PartyMember = party.active.get(newSettings.socketId);
	if (member) {
		member = { ...member, ...newSettings };
	} else {
		member = {
            ...newSettings,
            isObserver: party.initialObserver,
            isLeader: false,
            ready: false,
            team: null,
        };
		logger.info(`Party ${party.id} joined by user ${member.name} [${member.authToken}]]`);
	}
	party.active.set(newSettings.socketId, member);
	party.modified = moment();
}

export function updatePartyMemberStatus(party: g.Party, socketId: string, newStatus: Partial<g.PartyMemberStatus>) {
	let member = party.active.get(socketId);
	if (member) {
        if (newStatus.isObserver !== undefined && newStatus.isObserver !== member.isObserver) { // When setting the player to playing, unready them as they need to accept the change
            newStatus.ready = false;
        }

		member = { ...member, ...newStatus };
		party.active.set(socketId, member);
        party.modified = moment();
	}
}

export async function startPartyIfReady(party: g.Party) {
    if (party.waitForPlayers) {
        await startWaitingParty(party);
    } else {
        await startImmediateParty(party);
    }
}

async function startImmediateParty(party: g.Party) {
    const ready = wu(party.active.values()).filter(p => p.ready && !p.isObserver).toArray();

    if (ready.length > 0) {
        const store = getStore();
        const room = store.rooms.get(party.roomId);
        await Promise.all(ready.map(async (member) => {
            const userId = await auth.getUserIdFromAccessKey(auth.enigmaAccessKey(member.authToken));
            const aco = await matchmaking.getRating(userId, member.numGames, m.GameCategory.PvP);
            const game = matchmaking.findNewGame(member.version, room, party.id, { aco, socketId: member.socketId });
            games.joinGame(game, member, userId, aco);
            member.ready = false;

            logger.info(`Game [${game.id}]: player ${member.name} (${member.authToken}) [${member.socketId}] joined, now ${game.active.size} players`);
        }));

        emitParty(party);
    }
}

async function startWaitingParty(party: g.Party) {
    const ready = findReadyPlayers(party);
    if (ready) {
        logger.info(`Party ${party.id} started with ${ready.length} players`);
        await assignPartyToGames(party, ready);
        emitParty(party);
    }
}

function findReadyPlayers(party: g.Party): g.PartyMember[] {
    const relevant = wu(party.active.values()).filter(p => !p.isObserver).toArray();
    if (relevant.length === 0) {
        return null;
    }

    const room = getStore().rooms.get(party.roomId);
    const required = matchmaking.apportionPerGame(relevant.length, room.Matchmaking.MaxPlayers);

    const ready = relevant.filter(p => p.ready);
    if (ready.length < required) {
        return null;
    }

    return ready;
}

export function removePartyMember(party: g.Party, socketId: string) {
	const member = party.active.get(socketId);
	if (!member) {
		return;
	}

	party.active.delete(socketId);
	logger.info(`Party ${party.id} left by user ${member.name} [${member.socketId}]`);

	if (party.active.size > 0) {
        // The party is not finished
	} else {
		// This party is finished, delete it
		const store = getStore();
		store.parties.delete(party.id);
		logger.info(`Party ${party.id} deleted`);
	}
}

async function assignPartyToGames(party: g.Party, ready: g.PartyMember[]) {
	const store = getStore();

	const room = store.rooms.get(party.roomId);
	const remaining = _.shuffle(ready);
	const maxPlayersPerGame = matchmaking.apportionPerGame(remaining.length, room.Matchmaking.MaxPlayers);
	while (remaining.length > 0) {
		const group = new Array<g.PartyMember>();
		for (let i = 0; i < maxPlayersPerGame; ++i) {
			if (remaining.length > 0) {
				const next = remaining.shift();
				group.push(next);
			} else {
				break;
			}
		}

        let game: g.Game = null;
        await Promise.all(group.map(async (member) => {
            const userId = await auth.getUserIdFromAccessKey(auth.enigmaAccessKey(member.authToken));
            const aco = await matchmaking.getRating(userId, member.numGames, m.GameCategory.PvP);

            if (!game) {
                // Need to be able to add a player to the game immediately after it is created, so only create once we are ready to add
                // Assume all party members on same engine version
                game = games.initGame(member.version, room, party.id, m.LockType.AssignedParty);
            }

            games.joinGame(game, member, userId, aco);
            
            // Unready once assigned to a game so they don't immediately get assigned to another
            member.ready = false;
        }));
        matchmaking.forceTeams(game, group);
	}
}
