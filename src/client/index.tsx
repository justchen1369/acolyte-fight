import _ from 'lodash';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import * as m from '../game/messages.model';
import * as s from './store.model';
import * as w from '../game/world.model';

import * as config from './config';
import * as cloud from './core/cloud';
import * as matches from './core/matches';
import * as pages from './core/pages';
import * as parties from './core/parties';
import * as rankings from './core/rankings';
import * as sockets from './core/sockets';
import * as stats from './core/stats';
import * as storage from './storage';
import * as StoreProvider from './storeProvider';
import * as url from './url';
import * as userAgent from './core/userAgent';

import Root from './ui/root';

let alreadyConnected = false;

export function initialize() {
    StoreProvider.init();
    stats.init();
    cloud.init();
    rankings.init();

    start();
    render();

    window.onpopstate = (ev) => {
        const elems: s.PathElements = ev.state;
        if (elems) {
            pages.go(elems);
        }
    }

    cloud.downloadSettings().then(userId => rankings.retrieveUserStatsAsync(userId));
    storage.cleanupGameStats();
}

function start() {
    const current = url.parseLocation(window.location);

    // Remove the party ID from the URL so that people can't stream snipe their way into the party
    if (current.party || current.server) {
        StoreProvider.dispatch({ type: "updateUrl", current: { ...current, party: null, server: null } });
    }

    sockets.connect(config.getBaseUrl(), config.getAuthToken(), (socket) => {
        sockets.connectToServer(current.server)
            .then(() => parties.joinPartyAsync(current.party))
            .then(() => {
                if (!alreadyConnected) {
                    alreadyConnected = true; // Only allow the first connection - reconnect might be due to a server update so need to restart

                    if (current.hash === "#join") {
                        // Return to the home page when we exit
                        StoreProvider.dispatch({ type: "updatePage", page: "" });
                        matches.joinNewGame(current.gameId);
                    } else if (current.hash === "#watch") {
                        // Return to the home page when we exit
                        StoreProvider.dispatch({ type: "updatePage", page: "" });
                        matches.watchLiveGame();
                    } else {
                        pages.go(current);
                    }
                }
            }).catch(error => {
                console.error(error)
                socket.disconnect();
                StoreProvider.dispatch({ type: "disconnected" });

                if (current.party || current.server) {
                    // Failed to join party/server, try without server
                    window.location.href = url.getPath({ ...current, party: null, server: null, hash: null });
                }
            });
    });
}

function render() {
    ReactDOM.render(
        <Provider store={StoreProvider.getStore()}>
            <Root />
        </Provider>,
        document.getElementById("root"));
}

(window as any).acolyteInitialize = initialize;