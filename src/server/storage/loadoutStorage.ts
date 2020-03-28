import _ from 'lodash';
import wu from 'wu';
import * as db from './db.model';
import * as dbStorage from './dbStorage';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as s from '../server.model';
import { Collections, Singleton } from './db.model';
import { getFirestore } from './dbStorage';
import { logger } from '../status/logging';

export function loadoutToDb(loadout: m.Loadout): db.Loadout {
    if (!loadout) {
        return null;
    }

    return {
        name: loadout.name || null,
        buttons: loadout.buttons,
    };
}

export function dbToLoadout(dbLoadout: db.Loadout): m.Loadout {
    if (!dbLoadout) {
        return null;
    }

    return {
        name: dbLoadout.name || null,
        buttons: dbLoadout.buttons,
    };
}

export async function getLoadouts(userId: string): Promise<m.Loadout[]> {
    const firestore = getFirestore();

    const docSnapshot = await firestore.collection(Collections.Loadouts).doc(userId).get();

    const dbLoadouts = docSnapshot.data() as db.Loadouts;
    if (dbLoadouts && dbLoadouts.loadouts) {
        return dbLoadouts.loadouts.map(dbToLoadout);
    } else {
        return [];
    }
}

export async function setLoadouts(userId: string, loadouts: m.Loadout[]): Promise<void> {
    const firestore = getFirestore();

    const dbLoadouts: db.Loadouts = {
        loadouts: loadouts.map(loadoutToDb),
    };

    const doc = firestore.collection(Collections.Loadouts).doc(userId);
    doc.set(dbLoadouts);
}