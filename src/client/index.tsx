import _ from 'lodash';
import socketLib from 'socket.io-client';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import * as s from './store.model';
import * as w from '../game/world.model';

import * as matches from './core/matches';
import * as notifications from './core/notifications';
import * as parties from './core/parties';
import * as sockets from './core/sockets';
import * as StoreProvider from './storeProvider';
import * as url from './url';

import { getState } from './storeProvider';
import * as Storage from './storage';

import Root from './ui/root';

const socket = socketLib();

let alreadyConnected = false;

notifications.attachNotificationListener((notifs) => onNotification(notifs));
initialize();
rerender();

function initialize() {
    const current = url.parseLocation(window.location);
    StoreProvider.dispatch({ type: "updateUrl", current });

    sockets.attachToSocket(socket, () => {
        sockets.connectToServer(current.server)
            .then(() => parties.joinParty(current.party))
            .then(() => {
                if (!alreadyConnected) {
                    alreadyConnected = true; // Only allow the first connection - reconnect might be due to a server update so need to restart
                    StoreProvider.dispatch({ type: "updateSocket", socketId: socket.id });

                    if (current.gameId || current.page === "join") {
                        if (current.page === "join") {
                            // Return to the home page when we exit
                            StoreProvider.dispatch({ type: "updatePage", page: "" });
                        }
                        matches.joinNewGame(current.gameId);
                    } else {
                        rerender(); // Room settings might have changed the page
                    }
                }
            }).catch(error => {
                console.error(error)
                socket.disconnect();
                StoreProvider.dispatch({ type: "updateSocket", socketId: null });

                if (current.party || current.server) {
                    // Failed to join party/server, try without server
                    window.location.href = url.getPath({ ...current, party: null, server: null });
                }
            });
    });
}

function onNotification(notifs: w.Notification[]) {
    rerender();
}

function rerender() {
    ReactDOM.render(
        <Provider store={StoreProvider.getStore()}>
            <Root />
        </Provider>,
        document.getElementById("root"));
}