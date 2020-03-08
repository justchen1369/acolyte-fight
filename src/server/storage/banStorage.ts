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

function banToDb(ban: s.Ban): db.Ban {
    return {
        ips: ban.ips,
        authTokens: ban.authTokens,
        userIds: ban.userIds,
    };
}

function dbToBan(banId: string, dbBan: db.Ban): s.Ban {
    return {
        banId,
        ...dbBan,
    };
}

export async function loadAllBans(): Promise<s.Ban[]> {
    const firestore = getFirestore();

    const bans = new Array<s.Ban>();
    const querySnapshot = await firestore.collection(Collections.Ban).get();
    for (const doc of querySnapshot.docs) {
        const ban = dbToBan(doc.id, doc.data() as db.Ban);
        bans.push(ban);
    }

    return bans;
}

export async function createOrUpdateBan(ban: s.Ban) {
    const firestore = getFirestore();
    const doc = firestore.collection(Collections.Ban).doc(ban.banId);
    await doc.set(banToDb(ban));
}

export async function deleteBan(banId: string) {
    const firestore = getFirestore();
    const doc = firestore.collection(Collections.Ban).doc(banId);
    await doc.delete();
}