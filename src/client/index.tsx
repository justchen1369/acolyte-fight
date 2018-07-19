import _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import queryString from 'query-string';

import { connectToServer, joinNewGame, leaveCurrentGame, attachToSocket, attachNotificationListener, setMobile, CanvasStack } from './facade';
import { getStore, applyNotificationsToStore, setConnected } from './storeProvider';
import * as Storage from '../client/storage';
import { Choices, World } from '../game/constants';

import { Root } from './root';

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

let observeGameId: string = null;
let room: string = null;
let server: string = null;
let page: string = null;
if (window.location.search) {
    const params = queryString.parse(window.location.search);
    if (params["g"]) {
        observeGameId = params["g"];
    }
    if (params["p"]) {
        page = params["p"];
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
    connectToServer(server).then(() => {
        setConnected();
        if (observeGameId) {
            onWatchGameClicked(observeGameId);
            observeGameId = null;
        }
    }).catch(error => {
        console.error(error)
        socket.disconnect();
    });
});
attachNotificationListener(notifications => {
    applyNotificationsToStore(notifications);
    rerender();

    if (_.some(notifications, n => n.type === "new" || n.type === "quit")) {
        updateUrl();
    }
});

rerender();

function onNewGameClicked() {
    if (!getStore().connected) {
        // New server? Reload the client, just in case the version has changed.
        window.location.reload();
    } else {
        playerName = getOrCreatePlayerName(); // Reload name
        joinNewGame(playerName, retrieveKeyBindings(), room);
        updateUrl();
    }
}

function onExitGameClicked() {
    leaveCurrentGame();
}

function onWatchGameClicked(gameId: string) {
    joinNewGame(playerName, retrieveKeyBindings(), room, gameId);
}

function changePage(newPage: string) {
    page = newPage;
    updateUrl();
    rerender();
}

function updateUrl() {
    const gameId = getStore().world.ui.myGameId;
    let params = [];
    if (gameId) {
        params.push("g=" + gameId);
    } else if (page) {
        params.push("p=" + page);
    }

    if (room) {
        params.push("room=" + room);
    }
    if (server) {
        params.push("server=" + server);
    }
    window.history.pushState(null, null, "?" + params.join("&"));
}

function rerender() {
    const store = getStore();
    ReactDOM.render(
        <Root
            page={page}
            room={room}
            playerName={playerName}
            world={store.world}
            items={store.items}
            changePage={newPage => changePage(newPage)}
            newGameCallback={() => onNewGameClicked()}
            exitGameCallback={() => onExitGameClicked()}
            watchGameCallback={(gameId) => onWatchGameClicked(gameId)}
        />,
        document.getElementById("root"));
}

function retrieveKeyBindings() {
    return Storage.loadKeyBindingConfig() || Choices.Defaults;
}