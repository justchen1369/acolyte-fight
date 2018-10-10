import * as Firestore from '@google-cloud/firestore';
import * as db from './db.model';
import * as s from './server.model';

export const firestore = new Firestore.Firestore({
    timestampsInSnapshots: true,
});

export function init() {
}