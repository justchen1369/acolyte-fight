import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import { attachToCanvas, attachToSocket, attachNotificationListener, world } from './facade';
import * as Storage from '../game/storage';
import { Choices } from '../game/constants';

import { InfoPanel } from './components/infoPanel';
import { MessagesPanel } from './components/messagesPanel';

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

attachToSocket(socket, playerName, keyBindings);
attachToCanvas(canvas);

const infoPanel = ReactDOM.render(<InfoPanel playerName={playerName} world={world} />, document.getElementById("info-panel")) as InfoPanel;
const messagesPanel = ReactDOM.render(<MessagesPanel world={world} />, document.getElementById("messages-panel")) as MessagesPanel;
attachNotificationListener(notifications => {
    infoPanel.onNotification(notifications);
    messagesPanel.onNotification(notifications);
});