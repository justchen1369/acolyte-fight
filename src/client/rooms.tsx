import * as m from '../game/messages.model';
import * as url from './url';
import { readFileAsync } from './fileUtils';

export function createRoomFromFile(file: File, current: url.PathElements) {
    return readFileAsync(file)
        .then(json => json ? JSON.parse(json) : {})
        .then(mod => createRoomFromMod(mod, current))
}

export function createRoomFromMod(mod: Object, current: url.PathElements) {
    return createRoom(mod, false, current);
}

export function createRoom(mod: Object, allowBots: boolean, current: url.PathElements, nextPage: string = "share") {
    console.log("Creating room", mod, allowBots);
    return fetch('api/room', {
        credentials: "same-origin",
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ mod, allowBots } as m.CreateRoomRequest),
    }).then(res => res.json()).then((msg: m.CreateRoomResponse) => msg)
    .then(msg => {
        const path = url.getPath(Object.assign({}, current, {
            gameId: null,
            page: nextPage,
            room: msg.roomId,
            server: msg.server,
        }));
        window.location.href = path;
    })
}