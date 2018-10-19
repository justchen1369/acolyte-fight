import _ from 'lodash';
import * as Firestore from '@google-cloud/firestore';
import * as db from './db.model';
import * as s from './server.model';
import uniqid from 'uniqid';
import { firestore } from './dbStorage';
import { Collections } from './db.model';

export const DiscordPrefix = "discord.";

export function generateUserId() {
    return uniqid("u-");
}

function dbToUser(userId: string, data: db.User): s.User {
    return {
        userId,
        loggedIn: dbUserLoggedIn(data),
        settings: data.settings && {
            name: data.settings.name,
            buttons: data.settings.buttons,
            rebindings: data.settings.rebindings,
        }
    };
}

export function dbUserLoggedIn(data: db.User) {
    if (data.loggedIn === undefined) {
        return data.accessKeys && data.accessKeys.some(key => key.startsWith(DiscordPrefix));
    } else {
        return data.loggedIn;
    }
}

export async function getUserIdFromAccessKey(accessKey: string): Promise<string> {
    if (!accessKey) {
        return null;
    }

    const querySnapshot = await firestore.collection(Collections.User).where('accessKeys', 'array-contains', accessKey).limit(1).get()
    for (const doc of querySnapshot.docs) {
        return doc.id;
    }
    return null;
}

export async function getUserByAccessKey(accessKey: string): Promise<s.User> {
    if (!accessKey) {
        return null;
    }

    const querySnapshot = await firestore.collection(Collections.User).where('accessKeys', 'array-contains', accessKey).limit(1).get()
    for (const doc of querySnapshot.docs) {
        const data = doc.data() as db.User;
        if (data.loggedIn === undefined) { // Migrate logged-in flag when user reconnects
            const loggedIn = dbUserLoggedIn(data);
            doc.ref.update({ loggedIn: loggedIn });
            data.loggedIn = loggedIn;
        }
        return dbToUser(doc.id, data);
    }
    return null;
}

export async function getUserById(userId: string): Promise<s.User> {
    if (!userId) {
        return null;
    }

    const doc = await firestore.collection(Collections.User).doc(userId).get();
    return doc.exists ? dbToUser(doc.id, doc.data() as db.User) : null;
}

export async function createUser(user: s.User, ...accessKeys: string[]): Promise<void> {
    const data: db.User = {
        loggedIn: user.loggedIn,
        accessKeys,
        settings: {
            name: user.settings.name,
            buttons: user.settings.buttons,
            rebindings: user.settings.rebindings,
        },
        ratings: null,
    };
    await firestore.collection(Collections.User).doc(user.userId).set(data);
}

export async function updateUser(user: Partial<s.User>): Promise<void> {
    const data: Partial<db.User> = _.omitBy({
        loggedIn: user.loggedIn,
        settings: user.settings && {
            name: user.settings.name,
            buttons: user.settings.buttons,
            rebindings: user.settings.rebindings,
        }
    }, _.isUndefined);
    await firestore.collection(Collections.User).doc(user.userId).update(data);
}

export async function upgradeUser(userId: string, name: string, discordAccessKey: string): Promise<void> {
    const data: Partial<db.User> = {
        loggedIn: true,
        accessKeys: Firestore.FieldValue.arrayUnion(discordAccessKey) as any,
        settings: {
            name,
        } as db.UserSettings, // Cast to ignore undefined fields which we're not changing
    };
    await firestore.collection(Collections.User).doc(userId).update(data);
}

export async function associateAccessKey(accessKey: string, userId: string): Promise<void> {
    await firestore.collection(Collections.User).doc(userId).update('accessKeys', Firestore.FieldValue.arrayUnion(accessKey));
}

export async function disassociateAccessKey(accessKey: string): Promise<void> {
    const querySnapshot = await firestore.collection(Collections.User).where('accessKeys', 'array-contains', accessKey).get();
    for (const doc of querySnapshot.docs) {
        await doc.ref.update('accessKeys', Firestore.FieldValue.arrayRemove(accessKey));
    }
}