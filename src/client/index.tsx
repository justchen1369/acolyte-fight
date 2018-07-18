import _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import queryString from 'query-string';

import { connectToServer, joinNewGame, attachToSocket, attachNotificationListener, setMobile, CanvasStack } from './facade';
import { getStore, applyNotificationsToStore } from './storeProvider';
import * as Storage from '../ui/storage';
import { Choices } from '../game/constants';

import { GamePanel } from './gamePanel';

const socket = socketLib();

let playerName = getOrCreatePlayerName();

function getOrCreatePlayerName(): string {
    let name = Storage.loadName();
    if (!name) {
        name = "Acolyte" + (Math.random() * 10000).toFixed(0);
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

setMobile(window.navigator.userAgent.toLowerCase().indexOf("mobi") !== -1);

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
        playerName = getOrCreatePlayerName(); // Reload name
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
        <GamePanel
            playerName={playerName}
            store={getStore()}
            newGameCallback={() => onNewGameClicked()} />,
        document.getElementById("root"));
}

function retrieveKeyBindings() {
    return Storage.loadKeyBindingConfig() || Choices.Defaults;
}