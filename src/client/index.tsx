import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import queryString from 'query-string';

import { attachToCanvas, attachToSocket, attachNotificationListener, world } from './facade';
import * as Storage from '../ui/storage';
import { Choices } from '../game/constants';

import { InfoPanel } from './infoPanel';
import { MessagesPanel } from './messagesPanel';

const socket = socketLib();
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

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

let observeGameId = null;
if (window.location.search) {
    const params = queryString.parse(window.location.search);
    if (params["g"]) {
        observeGameId = params["g"];
    }
}

attachToSocket(socket, playerName, keyBindings, observeGameId);
attachToCanvas(canvas);

const infoPanel = ReactDOM.render(<InfoPanel playerName={playerName} world={world} />, document.getElementById("info-panel")) as InfoPanel;
const messagesPanel = ReactDOM.render(<MessagesPanel world={world} />, document.getElementById("messages-panel")) as MessagesPanel;
attachNotificationListener(notifications => {
    infoPanel.onNotification(notifications);
    messagesPanel.onNotification(notifications);
});