import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import * as db from './db.model';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as w from '../game/world.model';
import * as settings from '../game/settings';
import { getFirestore } from './dbStorage';
import { getStore } from './serverStore';
import { logger } from './logging';

const CustomRoomPrefix = "c-";

const roomUpdateListeners = new Array<RoomUpdateListener>();

export interface RoomUpdateListener {
    (room: g.Room): void;
}

export function init() {
    updateDefaultModIfNecessary();
}

export function attachRoomUpdateListener(listener: RoomUpdateListener) {
    roomUpdateListeners.push(listener);
}

function sendRoomUpdate(room: g.Room) {
    roomUpdateListeners.forEach(listener => listener(room));
}

export function initRoom(mod: Object, authToken: string): g.Room {
	const store = getStore();

	// Same settings -> same room
	const id = CustomRoomPrefix + crypto.createHash('md5').update(JSON.stringify({mod})).digest('hex');
	let room = store.rooms.get(id);
	if (!room) {
		room = {
			id,
			created: moment(),
			accessed: moment(),
            mod,
            isCustom: true,
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

export async function updateDefaultModIfNecessary() {
    const store = getStore();
    let room = store.rooms.get(m.DefaultRoomId);
    const currentInterval = truncateToUpdateInterval(moment());
    if (!room || truncateToUpdateInterval(room.created) !== currentInterval) {
        const mod = await getOrCreateGlobalMod(`m-${currentInterval}`);
        const room: g.Room = {
            id: m.DefaultRoomId,
            created: moment(),
            accessed: moment(),
            mod,
            isCustom: false,
        };
        store.rooms.set(room.id, room);
        sendRoomUpdate(room);

        logger.info("Updated default room: " + JSON.stringify(room.mod));
    }
}

function truncateToUpdateInterval(moment: moment.Moment): number {
    const interval = m.UpdateModMinutes * 60;
    return Math.floor(moment.unix() / interval) * interval;
}

async function getOrCreateGlobalMod(intervalId: string): Promise<ModTree> {
    const firestore = getFirestore();

    const candidateMod = generateMod();
    const candidateJson = JSON.stringify(candidateMod);

    const json = await firestore.runTransaction(async (t) => {
        const doc = await t.get(firestore.collection(db.Collections.GlobalMod).doc(intervalId));

        let data = doc.data() as db.GlobalMod;
        if (!data) {
            data = { json: candidateJson };
            t.set(doc.ref, data);
        }

        return data.json;
    });
    return JSON.parse(json);
}

function generateMod(): ModTree {
    const SpellsPerKey = 3;

    const initialOptions = settings.DefaultSettings.Choices.Options;
    const newOptions: KeyBindingOptions = {};
    const defaultOptions: KeyBindings = {};

    for (const key in initialOptions) {
        const initialSpells = initialOptions[key];

        // Do this so the spells remain in the same order on screen, and the default is always highest in the list
        const newSpells = _(_.range(0, initialSpells.length)).shuffle().take(SpellsPerKey).sort().map(x => initialSpells[x]).value();

        newOptions[key] = newSpells;
        defaultOptions[key] = newSpells[0];
    }

    return {
        Choices: {
            Options: newOptions,
            Defaults: defaultOptions,
        },
    };
}