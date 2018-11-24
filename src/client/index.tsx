import _ from 'lodash';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import * as m from '../game/messages.model';
import * as s from './store.model';
import * as w from '../game/world.model';

import * as audio from './core/audio';
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
import * as tracker from './core/tracker';
import * as url from './url';
import * as userAgent from './core/userAgent';

import Root from './ui/root';

let alreadyConnected = false;

export function initialize() {
    StoreProvider.init();
    stats.init();
    cloud.init();
    rankings.init();
    audio.init();

    start();
    render();

    window.onpopstate = (ev) => {
        const elems: s.PathElements = ev.state;
        if (elems) {
            pages.go(elems);
        }
    }

    loginAsync();
    storage.cleanupGameStats();
}

async function loginAsync() {
    const userId = await cloud.downloadSettings();
    if (userId) {
        tracker.setUserId(userId);
        await parties.updatePartyAsync();
        await rankings.retrieveUserStatsAsync(userId);
    }
}

function start() {
    const query = url.parseLocation(window.location);
    console.log("Initial location", query);

    let current: s.PathElements = {
        ...query,
        party: null, // Remove the party ID from the URL so that people can't stream snipe their way into the party
        server: null,
        hash: null,
    };
    StoreProvider.dispatch({ type: "updateUrl", current });

    sockets.connect(config.getBaseUrl(), config.getAuthToken(), (socket) => {
        sockets.connectToServer(query.server)
            .then(() => parties.joinPartyAsync(query.party))
            .then(() => {
                if (!alreadyConnected) {
                    alreadyConnected = true; // Only allow the first connection - reconnect might be due to a server update so need to restart

                    if (query.hash === "#join") {
                        // Return to the home page when we exit
                        StoreProvider.dispatch({ type: "updatePage", page: "" });
                        matches.joinNewGame(query.gameId);
                    } else if (query.hash === "#watch") {
                        // Return to the home page when we exit
                        StoreProvider.dispatch({ type: "updatePage", page: "" });
                        matches.watchLiveGame();
                    } else {
                        pages.go(query);
                    }
                }
            }).catch(error => {
                console.error(error)
                socket.disconnect();
                StoreProvider.dispatch({ type: "disconnected" });

                if (query.party || query.server) {
                    // Failed to join party/server, try without server
                    window.location.href = url.getPath({ ...query, party: null, server: null, hash: null });
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