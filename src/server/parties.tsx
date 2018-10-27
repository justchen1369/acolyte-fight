import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import uniqid from 'uniqid';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as w from '../game/world.model';
import { getStore } from './serverStore';
import { logger } from './logging';

export function initParty(leaderSocketId: string, roomId: string = null): g.Party {
	const partyIndex = getStore().nextPartyId++;
	const party: g.Party = {
		id: uniqid("p" + partyIndex + "-"),
		created: moment(),
		modified: moment(),
		roomId,
		active: new Map<string, g.PartyMember>(),
		isPrivate: false,
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
    logger.info(`Party ${party.id} changed to room=${party.roomId} isPrivate=${party.isPrivate} isLocked=${party.isLocked} initialObserver=${party.initialObserver}`);
}

export function createOrUpdatePartyMember(party: g.Party, socketId: string, newSettings: g.PartyMemberSettings) {
	let member: g.PartyMember = party.active.get(socketId);
	if (member) {
		member = { ...member, ...newSettings };
	} else {
		member = {
            socketId,
            ...newSettings,
            isObserver: party.initialObserver,
            isLeader: false,
            ready: false,
        };
		logger.info(`Party ${party.id} joined by user ${member.name} [${member.authToken}]]`);
	}
	party.active.set(socketId, member);
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
    const relevant = [...party.active.values()].filter(p => p.isLeader || !p.isObserver)
    return relevant.length > 0 && relevant.every(p => p.ready);
}

export function removePartyMember(party: g.Party, socketId: string) {
	const member = party.active.get(socketId);
	if (!member) {
		return;
	}

	party.active.delete(socketId);
	logger.info(`Party ${party.id} left by user ${member.name} [${member.socketId}]`);

	if (party.active.size > 0) {
        if (!member.isObserver) {
            // All members become unready when a player leaves
            party.active.forEach(member => {
                if (!member.isObserver) {
                    member.ready = false;
                }
            });
        }
	} else {
		// This party is finished, delete it
		const store = getStore();
		store.parties.delete(party.id);
		logger.info(`Party ${party.id} deleted`);
	}
}