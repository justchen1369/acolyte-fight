import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';
import * as notifications from './notifications';
import * as url from '../url';

notifications.attachNotificationListener(onNotification);

export function changePage(newPage: string) {
    const store = StoreProvider.getState();
    if (!store.socketId) {
        const newTarget: s.PathElements = { ...store.current, page: newPage };
        window.location.href = url.getPath(newTarget);
    } else {
        StoreProvider.dispatch({ type: "updatePage", page: newPage });
    }
}

function updateUrl() {
    const store = StoreProvider.getState();
    const current = store.current;

    StoreProvider.dispatch({
        type: "updateUrl",
        current: {
            ...current,
            gameId: store.world.ui.myGameId,
            party: store.party ? store.party.id : null,
        },
    });

    const path = url.getPath(current);
    window.history.replaceState(null, null, path);
}

function onNotification(notifs: w.Notification[]) {
    let urlUpdated = false;
    notifs.forEach(n => {
        if (n.type === "new" || n.type === "quit" || n.type === "disconnected" || n.type === "joinParty" || n.type === "leaveParty") {
            urlUpdated = true;
        }
    });
    if (urlUpdated) {
        updateUrl();
    }

}