import * as React from 'react';
import * as ReactDOM from 'react-dom';

import socketLib from 'socket.io-client';
import { attachToCanvas, attachToSocket, attachNotificationListener, world } from './facade';
import { StorageKeys } from '../game/storage.model';

import { InfoPanel } from './components/infoPanel';
import { MessagesPanel } from './components/messagesPanel';

const socket = socketLib();
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const playerName = retrievePlayerName();

attachToSocket(socket, playerName);
attachToCanvas(canvas);

const infoPanel = ReactDOM.render(<InfoPanel playerName={playerName} world={world} />, document.getElementById("info-panel")) as InfoPanel;
const messagesPanel = ReactDOM.render(<MessagesPanel world={world} />, document.getElementById("messages-panel")) as MessagesPanel;
attachNotificationListener(notifications => {
    infoPanel.onNotification(notifications);
    messagesPanel.onNotification(notifications);
});

function retrievePlayerName() {
    let name = window.localStorage.getItem(StorageKeys.Name);
    if (!name) {
        name = "Enigma" + (Math.random() * 10000).toFixed(0);
        window.localStorage.setItem(StorageKeys.Name, name);
    }
    return name;
}