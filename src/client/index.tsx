import _ from 'lodash';
import socketLib from 'socket.io-client';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import * as s from './store.model';
import * as w from '../game/world.model';

import * as matches from './core/matches';
import * as notifications from './core/notifications';
import * as parties from './core/parties';
import * as sockets from './core/sockets';
import * as StoreProvider from './storeProvider';
import * as url from './core/url';

import { getStore, setConnected, setUrl } from './storeProvider';
import { applyNotificationsToStore } from './core/notifications';
import * as Storage from './core/storage';
import { DefaultSettings } from '../game/settings';

import { Root } from './ui/root';

const socket = socketLib();

let isNewPlayer = !Storage.loadName();
let playerName = getOrCreatePlayerName();

function getOrCreatePlayerName(): string {
    let name = Storage.loadName();
    if (!name) {
        name = "Acolyte" + (Math.random() * 10000).toFixed(0);
        Storage.saveName(name);
    }
    return name;
}

let alreadyConnected = false;

notifications.attachNotificationListener((notifs) => onNotification(notifs));

setUrl(url.parseLocation(window.location));

initialize();

function initialize() {
    const current = getStore().current;

    sockets.attachToSocket(socket, () => {
        sockets.connectToServer(current.server)
            .then(() => parties.joinParty(current.party, getOrCreatePlayerName()))
            .then(() => {
                if (!alreadyConnected) {
                    alreadyConnected = true; // Only allow the first connection - reconnect might be due to a server update so need to restart
                    setConnected(socket.id);

                    if (current.gameId || current.page === "join") {
                        if (current.page === "join") {
                            // Return to the home page when we exit
                            current.page = "";
                        }
                        matches.joinNewGame(playerName, retrieveKeyBindings(), current.party, current.gameId);
                    } else {
                        rerender(); // Room settings might have changed the page
                    }
                }
            }).catch(error => {
                console.error(error)
                socket.disconnect();
                setConnected(null);

                if (current.party || current.server) {
                    // Failed to join party/server, try without server
                    current.party = null;
                    current.server = null;
                    updateUrl();
                }
            });
    });
}

rerender();

function onNotification(notifs: w.Notification[]) {
    const store = getStore();

    applyNotificationsToStore(notifs);
    rerender();

    let urlUpdated = false;
    notifs.forEach(n => {
        if (n.type === "new" || n.type === "quit" || n.type === "disconnected" || n.type === "joinParty" || n.type === "leaveParty") {
            urlUpdated = true;
            if (n.type === "joinParty") {
                store.current.server = n.server;
            }
        } else if (n.type === "startParty") {
            onStartParty(n.partyId);
        }
    });
    if (urlUpdated) {
        updateUrl();
    }

}

function onNewGameClicked() {
    const current = getStore().current;
    if (!getStore().socketId) {
        // New server? Reload the client, just in case the version has changed.
        current.page = "join";
        updateUrl();
        window.location.reload();
    } else {
        playerName = getOrCreatePlayerName(); // Reload name
        matches.joinNewGame(playerName, retrieveKeyBindings(), current.party);
        updateUrl();
    }
}

function onWatchGameClicked(gameId: string) {
    const current = getStore().current;
    if (!getStore().socketId) {
        // New server? Reload the client, just in case the version has changed.
        current.gameId = gameId;
        current.page = null;
        updateUrl();
        window.location.reload();
    } else {
        playerName = getOrCreatePlayerName(); // Reload name
        matches.joinNewGame(playerName, retrieveKeyBindings(), current.party, gameId);
        updateUrl();
    }
}

function onExitGameClicked() {
    matches.leaveCurrentGame();
}

function onCreatePartyClicked() {
    const party = getStore().party;
    if (!party) {
        const roomId: string = null;
        parties.createParty(roomId, getOrCreatePlayerName());
    }
}

function onLeavePartyClicked(partyId: string) {
    const party = getStore().party;
    if (party && party.id === partyId) {
        parties.leaveParty(party.id);
    }
}

function onPartyReadyClicked(partyId: string, ready: boolean) {
    parties.updateParty(partyId, getOrCreatePlayerName(), ready);
}

function onStartParty(partyId: string) {
    const party = getStore().party;
    if (party && party.id === partyId) {
        parties.updateParty(partyId, getOrCreatePlayerName(), false);
        setTimeout(() => onNewGameClicked(), 1);
    }
}

function changePage(newPage: string) {
    const current = getStore().current;
    if (!getStore().socketId) {
        const newTarget: s.PathElements = Object.assign({}, current, { page: newPage });
        window.location.href = url.getPath(newTarget);
    } else {
        current.page = newPage;
        updateUrl();
        rerender();
    }
}

function updateUrl() {
    const store = getStore();
    const current = store.current;

    current.gameId = store.world.ui.myGameId;
    current.party = store.party ? store.party.id : null;

    const path = url.getPath(current);
    window.history.replaceState(null, null, path);
}

function rerender() {
    const store = getStore();
    ReactDOM.render(
        <Root
            current={store.current}
            connected={!!store.socketId}
            isNewPlayer={isNewPlayer}
            playerName={playerName}
            party={store.party}
            world={store.world}
            items={store.items}
            changePage={newPage => changePage(newPage)}
            playVsAiCallback={() => matches.addBotToCurrentGame()}
            newGameCallback={() => onNewGameClicked()}
            watchGameCallback={(gameId) => onWatchGameClicked(gameId)}
            exitGameCallback={() => onExitGameClicked()}
            createPartyCallback={() => onCreatePartyClicked()}
            leavePartyCallback={(partyId) => onLeavePartyClicked(partyId)}
            partyReadyCallback={(partyId, ready) => onPartyReadyClicked(partyId, ready)}
        />,
        document.getElementById("root"));
}

function retrieveKeyBindings() {
    return Storage.loadKeyBindingConfig() || DefaultSettings.Choices.Defaults;
}