import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';

const ExpiryMilliseconds = 15000;

let nextNotificationId = 0;
setInterval(notificationCleanup, ExpiryMilliseconds);

export function notify(...newNotifications: w.Notification[]) {
    const store = StoreProvider.getState();

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

    StoreProvider.dispatch({ type: "updateNotifications", items: newItems });
}

function calculateExpiryMilliseconds(notification: w.Notification): number {
    switch (notification.type) {
        case "win": return 1e9;
        case "disconnected": return 1e9;
        default: return ExpiryMilliseconds;
    }
}

function notificationCleanup() {
    const store = StoreProvider.getState();

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
    StoreProvider.dispatch({ type: "updateNotifications", items });
}