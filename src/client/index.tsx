import _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import queryString from 'query-string';

import { connectToServer, joinNewGame, attachToCanvas, attachToSocket, attachNotificationListener, CanvasStack } from './facade';
import { getStore, applyNotificationsToStore } from './storeProvider';
import * as Storage from '../ui/storage';
import { Choices } from '../game/constants';

import { InfoPanel } from './infoPanel';
import { MessagesPanel } from './messagesPanel';

const socket = socketLib();

const playerName = getOrCreatePlayerName();

function getOrCreatePlayerName(): string {
    let name = Storage.loadName();
    if (!name) {
        name = "Enigma" + (Math.random() * 10000).toFixed(0);
        Storage.saveName(name);
    }
    return name;
}

let joinedInitialGame = false;
let observeGameId: string = null;
let room: string = null;
let server: string = null;
if (window.location.search) {
    const params = queryString.parse(window.location.search);
    if (params["g"]) {
        observeGameId = params["g"];
    }
    if (params["room"]) {
        room = params["room"];
    }
    if (params["server"]) {
        server = params["server"];
    }
}

attachToSocket(socket, () => {
    if (!joinedInitialGame) {
        joinedInitialGame = true;
        connectToServer(server).then(() => {
            joinNewGame(playerName, retrieveKeyBindings(), room, observeGameId);
            observeGameId = null;
        }).catch(error => {
            console.error(error)
            socket.disconnect();
        });
    }
});
attachToCanvas({
    background: document.getElementById("background") as HTMLCanvasElement,
    glows: document.getElementById("glows") as HTMLCanvasElement,
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    ui: document.getElementById("ui") as HTMLCanvasElement,
} as CanvasStack);
attachNotificationListener(notifications => {
    applyNotificationsToStore(notifications);
    rerender();
});

rerender();

function onNewGameClicked() {
    if (getStore().disconnected) {
        // New server? Reload the client, just in case the version has changed.
        window.location.reload();
    } else {
        joinNewGame(playerName, retrieveKeyBindings(), room);

        let params = [];
        if (room) {
            params.push("room=" + room);
        }
        if (server) {
            params.push("server=" + server);
        }
        window.history.pushState(null, null, "?" + params.join("&"));
    }
}

function rerender() {
    ReactDOM.render(
        <InfoPanel
            playerName={playerName}
            store={getStore()} />,
        document.getElementById("info-panel"));
    ReactDOM.render(
        <MessagesPanel
            store={getStore()}
            newGameCallback={onNewGameClicked} />,
            document.getElementById("messages-panel"));
}

function retrieveKeyBindings() {
    return Storage.loadKeyBindingConfig() || Choices.Defaults;
}