import _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import queryString from 'query-string';

import * as facade from './facade';
import * as url from './url';

import { connectToServer, joinNewGame, addBotToCurrentGame, leaveCurrentGame, attachToSocket, attachNotificationListener, CanvasStack } from './facade';
import { getStore, applyNotificationsToStore, setConnected } from './storeProvider';
import * as Storage from '../client/storage';
import { DefaultSettings } from '../game/settings';

import { Root } from './root';

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

let current = url.parseLocation(window.location);

attachToSocket(socket, () => {
    connectToServer(current.server)
        .then(() => facade.joinParty(current.party, getOrCreatePlayerName()))
        .then(() => {
            if (!alreadyConnected) {
                alreadyConnected = true; // Only allow the first connection - reconnect might be due to a server update so need to restart
                setConnected(socket.id);

                if (current.gameId || current.page === "join") {
                    if (current.page === "join") {
                        // Return to the home page when we exit
                        current.page = "";
                    }
                    joinNewGame(playerName, retrieveKeyBindings(), current.party, current.gameId);
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
attachNotificationListener(notifications => {
    applyNotificationsToStore(notifications);
    rerender();

    let urlUpdated = false;
    notifications.forEach(n => {
        if (n.type === "new" || n.type === "quit" || n.type === "disconnected" || n.type === "joinParty" || n.type === "leaveParty") {
            urlUpdated = true;
            if (n.type === "joinParty") {
                current.server = n.server;
            }
        } else if (n.type === "startParty") {
            onStartParty(n.partyId);
        }
    });
    if (urlUpdated) {
        updateUrl();
    }
});

rerender();

function onNewGameClicked() {
    if (!getStore().socketId) {
        // New server? Reload the client, just in case the version has changed.
        current.page = "join";
        updateUrl();
        window.location.reload();
    } else {
        playerName = getOrCreatePlayerName(); // Reload name
        joinNewGame(playerName, retrieveKeyBindings(), current.party);
        updateUrl();
    }
}

function onWatchGameClicked(gameId: string) {
    if (!getStore().socketId) {
        // New server? Reload the client, just in case the version has changed.
        current.gameId = gameId;
        current.page = null;
        updateUrl();
        window.location.reload();
    } else {
        playerName = getOrCreatePlayerName(); // Reload name
        joinNewGame(playerName, retrieveKeyBindings(), current.party, gameId);
        updateUrl();
    }
}

function onExitGameClicked() {
    leaveCurrentGame();
}

function onCreatePartyClicked() {
    const party = getStore().party;
    if (!party) {
        const roomId: string = null;
        facade.createParty(roomId, getOrCreatePlayerName());
    }
}

function onLeavePartyClicked(partyId: string) {
    const party = getStore().party;
    if (party && party.id === partyId) {
        facade.leaveParty(party.id);
    }
}

function onPartyReadyClicked(partyId: string, ready: boolean) {
    facade.updateParty(partyId, getOrCreatePlayerName(), ready);
}

function onStartParty(partyId: string) {
    const party = getStore().party;
    if (party && party.id === partyId) {
        facade.updateParty(partyId, getOrCreatePlayerName(), false);
        setTimeout(() => onNewGameClicked(), 1);
    }
}

function changePage(newPage: string) {
    if (!getStore().socketId) {
        const newTarget: url.PathElements = Object.assign({}, current, { page: newPage });
        window.location.href = url.getPath(newTarget);
    } else {
        current.page = newPage;
        updateUrl();
        rerender();
    }
}

function updateUrl() {
    const store = getStore();

    current.gameId = store.world.ui.myGameId;
    current.party = store.party ? store.party.id : null;

    const path = url.getPath(current);
    window.history.replaceState(null, null, path);
}

function rerender() {
    const store = getStore();
    ReactDOM.render(
        <Root
            current={current}
            connected={!!store.socketId}
            isNewPlayer={isNewPlayer}
            playerName={playerName}
            party={store.party}
            world={store.world}
            items={store.items}
            changePage={newPage => changePage(newPage)}
            playVsAiCallback={() => addBotToCurrentGame()}
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