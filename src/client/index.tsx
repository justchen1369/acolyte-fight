import socketLib from 'socket.io-client';
import { attachToCanvas, attachToSocket } from './facade';
import { StorageKeys } from '../game/storage.model';

const socket = socketLib();
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const playerName = retrievePlayerName();

attachToSocket(socket, playerName);
attachToCanvas(canvas);

function retrievePlayerName() {
    let name = window.localStorage.getItem(StorageKeys.Name);
    if (!name) {
        name = "Enigma" + (Math.random() * 10000).toFixed(0);
        window.localStorage.setItem(StorageKeys.Name, name);
    }
    return name;
}