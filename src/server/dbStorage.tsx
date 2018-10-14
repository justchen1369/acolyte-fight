import * as Firestore from '@google-cloud/firestore';
import * as db from './db.model';
import * as s from './server.model';

export const firestore = new Firestore.Firestore({
    timestampsInSnapshots: true,
});

export function init() {
}

export function stream(query: Firestore.Query, func: (doc: Firestore.DocumentSnapshot) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        query.stream().on('data', func).on('end', () => {
            resolve();
        });
    });
}