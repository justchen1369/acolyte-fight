import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import queryString from 'query-string';

import { joinNewGame, attachToCanvas, attachToSocket, attachNotificationListener, getCurrentWorld, CanvasStack } from './facade';
import { getStore, applyNotificationsToStore } from './storeProvider';
import * as Storage from '../ui/storage';
import { Choices } from '../game/constants';

import { InfoPanel } from './infoPanel';
import { MessagesPanel } from './messagesPanel';

import * as s from './store.model';

const socket = socketLib();

const playerName = getOrCreatePlayerName();
const keyBindings = Storage.loadKeyBindingConfig() || Choices.Defaults;

function getOrCreatePlayerName(): string {
    let name = Storage.loadName();
    if (!name) {
        name = "Enigma" + (Math.random() * 10000).toFixed(0);
        Storage.saveName(name);
    }
    return name;
}

let observeGameId: string = null;
if (window.location.search) {
    const params = queryString.parse(window.location.search);
    if (params["g"]) {
        observeGameId = params["g"];
    }
}

attachToSocket(socket, () => {
    joinNewGame(playerName, keyBindings, observeGameId);
    observeGameId = null;
});
attachToCanvas({
    background: document.getElementById("background") as HTMLCanvasElement,
    glows: document.getElementById("glows") as HTMLCanvasElement,
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
} as CanvasStack);
attachNotificationListener(notifications => {
    applyNotificationsToStore(notifications);
    rerender();
});

rerender();

function onNewGameClicked() {
    joinNewGame(playerName, keyBindings);
}

function rerender() {
    ReactDOM.render(<InfoPanel playerName={playerName} store={getStore()} />, document.getElementById("info-panel"));
    ReactDOM.render(<MessagesPanel store={getStore()} newGameCallback={onNewGameClicked} />, document.getElementById("messages-panel"));
}