import * as db from './db.model';
import * as s from './server.model';
import uniqid from 'uniqid';
import { firestore } from './dbStorage';

export function generateUserId() {
    return uniqid("u-");
}

export async function getUserIdFromAccessKey(accessKey: string): Promise<string> {
    if (!accessKey) {
        return null;
    }

    const record = await firestore.collection('accessKey').doc(accessKey).get()
    const data = record.data() as db.AccessKeyUserData;
    return data ? data.userId : null;
}

export async function getUserById(userId: string): Promise<s.UserSettings> {
    if (!userId) {
        return null;
    }

    const record = await firestore.collection('userSettings').doc(userId).get();
    const data = record.data() as db.UserSettingsData;
    if (data) {
        const user: s.UserSettings = {
            userId: record.id,
            name: data.name,
            buttons: data.buttons,
            rebindings: data.rebindings,
        };
        return user;
    } else {
        return null;
    }
}

export async function createOrUpdateUser(user: s.UserSettings): Promise<void> {
    const data: db.UserSettingsData = {
        name: user.name,
        buttons: user.buttons,
        rebindings: user.rebindings,
    };
    await firestore.collection('userSettings').doc(user.userId).set(data);
}

export async function associateAccessKey(accessKey: string, userId: string): Promise<void> {
    const data: db.AccessKeyUserData = { userId };
    await firestore.collection('accessKey').doc(accessKey).set(data);
}

export async function disassociateAccessKey(accessKey: string): Promise<void> {
    await firestore.collection('accessKey').doc(accessKey).delete();
}