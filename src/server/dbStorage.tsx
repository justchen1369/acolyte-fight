import * as Firestore from '@google-cloud/firestore';
import * as db from './db.model';
import * as s from './server.model';
import { logger } from './logging';

const MaxFirestoreAgeHours = 0.25;

let firestore: Firestore.Firestore = null;
let firestoreExpiry: number = 0;

export function getFirestore() {
    if (!firestore || Date.now() >= firestoreExpiry) {
        firestoreExpiry = Date.now() + MaxFirestoreAgeHours * 60 * 60 * 1000;
        recreateFirestore();
    }
    return firestore;
}

function recreateFirestore() {
    logger.info("Recreating firestore...");
    firestore = new Firestore.Firestore({
        timestampsInSnapshots: true,
    });
}

export function init() {
}

export function stream(query: Firestore.Query, func: (doc: Firestore.DocumentSnapshot) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        query.stream().on('data', func).on('end', () => {
            resolve();
        });
    });
}