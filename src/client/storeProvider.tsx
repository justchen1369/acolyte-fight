import * as s from './store.model';
import * as w from '../game/world.model';
import { getCurrentWorld } from './facade';

const ExpiryMilliseconds = 15000;

let nextNotificationId = 0;
let store: s.Store = {
    socketId: null,
    party: null,
    world: getCurrentWorld(),
    items: [],
};

setInterval(notificationCleanup, ExpiryMilliseconds);

export function getStore() {
    return store;
}

export function setConnected(socketId: string) {
    store.socketId = socketId;
}

export function applyNotificationsToStore(newNotifications: w.Notification[]) {
    // Detect if entered a new game
    newNotifications.forEach(n => {
        if (n.type === "room" || n.type === "new" || n.type === "quit") {
            store.world = getCurrentWorld();
            store.items = [];
        } else if (n.type === "disconnected") {
            store.socketId = null;
        } else if (n.type === "joinParty") {
            if (!(store.party && store.party.id === n.partyId)) {
                store.party = {
                    id: n.partyId,
                    members: new Array<w.PartyMemberState>(),
                    ready: false,
                };
            }
        } else if (n.type === "updateParty") {
            if (store.party && n.partyId === store.party.id) {
                store.party.members = n.members;
                n.members.forEach(member => {
                    if (member.socketId === store.socketId) {
                        store.party.ready = member.ready;
                    }
                });
            }
        } else if (n.type === "leaveParty") {
            store.party = null;
        }
    });

    // Add notifications to list
    const now = new Date().getTime();
    const newItems = [...store.items];
    newNotifications.forEach(notification => {
        const expiryTime = now + calculateExpiryMilliseconds(notification);
        newItems.push({ 
            key: "item" + (nextNotificationId++),
            notification,
            expiryTime,
         });
    });
    store.items = newItems;
}

function calculateExpiryMilliseconds(notification: w.Notification): number {
    switch (notification.type) {
        case "win": return 1e9;
        case "disconnected": return 1e9;
        default: return ExpiryMilliseconds;
    }
}


function notificationCleanup() {
    if (store.items.length === 0) {
        return;
    }

    const now = new Date().getTime();
    let items = new Array<s.NotificationItem>();
    store.items.forEach(item => {
        if (item.expiryTime > now) {
            items.push(item);
        }
    });
    store.items = items;
}