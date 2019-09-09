import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import uniqid from 'uniqid';
import wu from 'wu';
import * as constants from '../game/constants';
import * as g from './server.model';
import * as m from '../shared/messages.model';
import * as w from '../game/world.model';
import * as games from './games';
import { getStore } from './serverStore';
import { logger } from './logging';

export function onDisconnect(socketId: string): g.Party[] {
    const store = getStore();

	const changedParties = new Array<g.Party>();
	store.parties.forEach(party => {
		if (party.active.has(socketId)) {
			removePartyMember(party, socketId);
			changedParties.push(party);
		}
	});

	return changedParties;
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
    if (newStatus.isObserver !== undefined) {
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
        };
		logger.info(`Party ${party.id} joined by user ${member.name} [${member.authToken}]]`);
	}
	party.active.set(newSettings.socketId, member);
	party.modified = moment();
}

export function updatePartyMemberStatus(party: g.Party, socketId: string, newStatus: Partial<g.PartyMemberStatus>) {
	let member = party.active.get(socketId);
	if (member) {
        if (newStatus.isObserver === false) { // When setting the player to playing, unready them as they need to accept the change
            newStatus.ready = false;
        }

		member = { ...member, ...newStatus };
		party.active.set(socketId, member);
        party.modified = moment();
	}
}

export function isPartyReady(party: g.Party): boolean {
    if (!party.waitForPlayers) {
        // Start private party games immediately
        return wu(party.active.values()).some(p => p.ready && !p.isObserver);
    } else {
        const relevant = wu(party.active.values()).filter(p => !p.isObserver).toArray();
        const leaders = wu(party.active.values()).filter(p => p.isLeader).toArray();
        const room = getStore().rooms.get(party.roomId);
        const required = games.apportionPerGame(relevant.length, room.Matchmaking.MaxPlayers);
        return relevant.length > 0 && relevant.filter(p => p.ready).length >= required && leaders.every(l => l.ready);
    }
}

export function onPartyStarted(party: g.Party, assignments: g.PartyGameAssignment[]) {
    for (const assignment of assignments) {
        const member = assignment.partyMember;
        if (assignment.join && assignment.join.heroId) {
            // Unready after each game
            member.ready = false;
        }
    }
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