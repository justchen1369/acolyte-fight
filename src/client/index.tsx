import _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import queryString from 'query-string';

import * as url from './url';

import { connectToServer, joinRoom, joinNewGame, addBotToCurrentGame, leaveCurrentGame, attachToSocket, attachNotificationListener, CanvasStack } from './facade';
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
        .then(() => joinRoom(current.room))
        .then(() => {
            if (!alreadyConnected) {
                alreadyConnected = true; // Only allow the first connection - reconnect might be due to a server update so need to restart
                setConnected(true);

                if (current.gameId || current.page === "join") {
                    if (current.page === "join") {
                        // Return to the home page when we exit
                        current.page = "";
                    }
                    joinNewGame(playerName, retrieveKeyBindings(), current.room, current.gameId);
                } else {
                    rerender(); // Room settings might have changed the page
                }
            }
        }).catch(error => {
            console.error(error)
            socket.disconnect();
            setConnected(false);

            if (current.room || current.server) {
                // Failed to join room/server, try without server
                current.room = null;
                current.server = null;
                updateUrl();
            }
        });
});
attachNotificationListener(notifications => {
    applyNotificationsToStore(notifications);
    rerender();

    if (_.some(notifications, n => n.type === "new" || n.type === "quit" || n.type === "disconnected")) {
        updateUrl();
    }
});

rerender();

function onNewGameClicked() {
    if (!getStore().connected) {
        // New server? Reload the client, just in case the version has changed.
        current.page = "join";
        updateUrl();
        window.location.reload();
    } else {
        playerName = getOrCreatePlayerName(); // Reload name
        joinNewGame(playerName, retrieveKeyBindings(), current.room);
        updateUrl();
    }
}

function onExitGameClicked() {
    leaveCurrentGame();
}

function changePage(newPage: string) {
    if (!getStore().connected) {
        const newTarget: url.PathElements = Object.assign({}, current, { page: newPage });
        window.location.href = url.getPath(newTarget);
    } else {
        current.page = newPage;
        updateUrl();
        rerender();
    }
}

function updateUrl() {
    current.gameId = getStore().world.ui.myGameId;
    const path = url.getPath(current);
    window.history.replaceState(null, null, path);
}

function rerender() {
    const store = getStore();
    ReactDOM.render(
        <Root
            current={current}
            connected={store.connected}
            isNewPlayer={isNewPlayer}
            playerName={playerName}
            world={store.world}
            items={store.items}
            changePage={newPage => changePage(newPage)}
            playVsAiCallback={() => addBotToCurrentGame()}
            newGameCallback={() => onNewGameClicked()}
            exitGameCallback={() => onExitGameClicked()}
        />,
        document.getElementById("root"));
}

function retrieveKeyBindings() {
    return Storage.loadKeyBindingConfig() || DefaultSettings.Choices.Defaults;
}