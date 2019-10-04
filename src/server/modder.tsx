import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import * as db from './storage/db.model';
import * as g from './server.model';
import * as m from '../shared/messages.model';
import * as modder from '../game/modder';
import * as w from '../game/world.model';
import * as settings from '../game/settings';
import { getFirestore } from './storage/dbStorage';
import { getStore } from './serverStore';
import { logger } from './logging';
import { DefaultSettings } from '../game/settings';
import { optional } from './schema';

const CustomRoomPrefix = "c-";

export function init() {
    // Create an initial default room
    const store = getStore();
    const room: g.Room = {
        id: m.DefaultRoomId,
        created: moment(),
        accessed: moment(),
        mod: {},
        isCustom: false,
        Matchmaking: DefaultSettings.Matchmaking,
    };
    store.rooms.set(room.id, room);
}

export function initRoom(mod: ModTree, authToken: string): g.Room {
	const store = getStore();

	// Same settings -> same room
	const id = CustomRoomPrefix + crypto.createHash('md5').update(JSON.stringify({mod})).digest('hex');
	let room = store.rooms.get(id);
	if (!room) {
        let Matchmaking = DefaultSettings.Matchmaking;

        // Apply mod to matchmaker
        const matchmakingMod = mod.Matchmaking as Partial<MatchmakingSettings>;
        if (matchmakingMod
            && optional(matchmakingMod.MaxPlayers, "number")
            && optional(matchmakingMod.RatingPower, "number")
            && optional(matchmakingMod.OddPenalty, "number")
            && optional(matchmakingMod.AllowBotTeams, "boolean")
            && optional(matchmakingMod.BotRating, "number")
            && optional(matchmakingMod.MinBots, "number")
            && optional(matchmakingMod.MaxBots, "number")) {

            Matchmaking = modder.merge(Matchmaking, mod.Matchmaking);
        }

		room = {
			id,
			created: moment(),
			accessed: moment(),
            mod,
            isCustom: true,
            Matchmaking,
		};
		store.rooms.set(room.id, room);

        logger.info(`Room ${room.id} created by user ${authToken} mod ${JSON.stringify(mod).substr(0, 1000)}`);
	} else {
        logger.info(`Room ${room.id} joined by user ${authToken}`);
	}
	return room;
}

export function cleanupOldRooms(maxAgeUnusedHours: number) {
    const store = getStore();

    const now = moment();

    const idsToCleanup = new Array<string>();
    store.rooms.forEach(room => {
        if (!room.isCustom) {
            return;
        }

        const ageInHours = moment(now).diff(room.accessed, 'hours', true);
        if (ageInHours > maxAgeUnusedHours) {
            idsToCleanup.push(room.id);
        }
    });

    if (idsToCleanup.length === 0) {
        return;
    }

    logger.info(`Cleaning up ${idsToCleanup.length} old rooms`); 
    idsToCleanup.forEach(id => {
        store.rooms.delete(id);
    });
}