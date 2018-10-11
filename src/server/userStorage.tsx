import * as Firestore from '@google-cloud/firestore';
import * as db from './db.model';
import * as s from './server.model';
import uniqid from 'uniqid';
import { firestore } from './dbStorage';
import { Collections } from './db.model';

export function generateUserId() {
    return uniqid("u-");
}

function dbToUserSettings(userId: string, data: db.UserSettings): s.UserSettings {
    return {
        userId,
        name: data.name,
        buttons: data.buttons,
        rebindings: data.rebindings,
    };
}

export async function getUserIdFromAccessKey(accessKey: string): Promise<string> {
    if (!accessKey) {
        return null;
    }

    const querySnapshot = await firestore.collection(Collections.UserSettings).where('accessKeys', 'array-contains', accessKey).limit(1).get()
    for (const doc of querySnapshot.docs) {
        return doc.id;
    }
    return null;
}

export async function getUserByAccessKey(accessKey: string): Promise<s.UserSettings> {
    if (!accessKey) {
        return null;
    }

    const querySnapshot = await firestore.collection(Collections.UserSettings).where('accessKeys', 'array-contains', accessKey).limit(1).get()
    for (const doc of querySnapshot.docs) {
        return dbToUserSettings(doc.id, doc.data() as db.UserSettings);
    }
    return null;
}

export async function getUserById(userId: string): Promise<s.UserSettings> {
    if (!userId) {
        return null;
    }

    const doc = await firestore.collection(Collections.UserSettings).doc(userId).get();
    return doc.exists ? dbToUserSettings(doc.id, doc.data() as db.UserSettings) : null;
}

export async function createUser(user: s.UserSettings, ...accessKeys: string[]): Promise<void> {
    const data: db.UserSettings = {
        accessKeys,
        name: user.name,
        buttons: user.buttons,
        rebindings: user.rebindings,
    };
    await firestore.collection(Collections.UserSettings).doc(user.userId).set(data);
}

export async function updateUser(user: s.UserSettings): Promise<void> {
    const data: Partial<db.UserSettings> = {
        name: user.name,
        buttons: user.buttons,
        rebindings: user.rebindings,
    };
    await firestore.collection(Collections.UserSettings).doc(user.userId).update(data);
}

export async function associateAccessKey(accessKey: string, userId: string): Promise<void> {
    console.log(accessKey);
    await firestore.collection(Collections.UserSettings).doc(userId).update('accessKeys', Firestore.FieldValue.arrayUnion(accessKey));
}

export async function disassociateAccessKey(accessKey: string): Promise<void> {
    const querySnapshot = await firestore.collection(Collections.UserSettings).where('accessKeys', 'array-contains', accessKey).get();
    for (const doc of querySnapshot.docs) {
        await doc.ref.update('accessKeys', Firestore.FieldValue.arrayRemove(accessKey));
    }
}