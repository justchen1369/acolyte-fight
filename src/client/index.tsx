import _ from 'lodash';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import * as m from '../game/messages.model';
import * as s from './store.model';
import * as w from '../game/world.model';

import * as ai from './core/ai';
import * as audio from './core/audio';
import * as config from './config';
import * as cloud from './core/cloud';
import * as matches from './core/matches';
import * as notifications from './core/notifications';
import * as options from './options';
import * as pages from './core/pages';
import * as parties from './core/parties';
import * as rankings from './core/rankings';
import * as sockets from './core/sockets';
import * as stats from './core/stats';
import * as storage from './storage';
import * as StoreProvider from './storeProvider';
import * as ticker from './core/ticker';
import * as tracker from './core/tracker';
import * as url from './url';
import * as userAgent from './core/userAgent';

import Root from './ui/root';

let alreadyConnected = false;

export async function initialize() {
    StoreProvider.init();
    audio.init();

    await options.init();

    notifications.attachListener(n => options.getProvider().onNotification(n));
    notifications.attachListener(n => cloud.onNotification(n));
    notifications.attachListener(n => stats.onNotification(n));
    notifications.attachListener(n => rankings.onNotification(n));

    sockets.listeners.onGameMsg = stats.onGameMsg;
    sockets.listeners.onHeroMsg = matches.onHeroMsg;
    sockets.listeners.onPartyMsg = parties.onPartyMsg;
    sockets.listeners.onTickMsg = ticker.onTickMsg;

    start();
    render();

    window.onpopstate = (ev) => {
        const elems: s.PathElements = ev.state;
        if (elems) {
            pages.go(elems);
        }
    }

    loginAsync();
    ai.startTimers();

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

async function start() {
    const a = options.getProvider();

    const query = url.parseLocation(window.location);
    console.log("Initial location", query);

    if (query.page === a.source) {
        query.page = ""; // Handle ads being initiated by path name
    }

    let current: s.PathElements = {
        ...query,
        party: null, // Remove the party ID from the URL so that people can't stream snipe their way into the party
        server: null,
        hash: null,
    };
    StoreProvider.dispatch({ type: "updateUrl", current });

    a.loadingProgress(0.9);
    sockets.connect(config.getBaseUrl(), config.getAuthToken(), async (socket) => {
        if (alreadyConnected) {
            return;
        }
        alreadyConnected = true; // Only allow the first connection - reconnect might be due to a server update so need to restart

        await sockets.connectToServer(query.server)
        await parties.joinPartyAsync(query.party)

        try {
            if (query.hash === "#join") {
                // Return to the home page when we exit
                StoreProvider.dispatch({ type: "updatePage", page: "" });
                await matches.joinNewGame(query.gameId);
            } else if (query.hash === "#watch" || query.page === "watch") {
                await matches.watchLiveGame();
            } else {
                pages.go(query);
            }

            a.loadingProgress(1.0);
        } catch(error) {
            console.error(error)
            socket.disconnect();
            StoreProvider.dispatch({ type: "disconnected" });

            if (query.party || query.server) {
                // Failed to join party/server, try without server
                window.location.href = url.getPath({ ...query, party: null, server: null, hash: null });
            }
        }
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