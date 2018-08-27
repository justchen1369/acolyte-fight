import * as m from '../game/messages.model';
import * as facade from './facade';
import * as Storage from './storage';
import * as url from './url';
import { readFileAsync } from './fileUtils';

export function createRoomFromFile(file: File, current: url.PathElements) {
    return readFileAsync(file)
        .then(json => json ? JSON.parse(json) : {})
        .then(mod => createRoomFromMod(mod, current))
}

function createRoomFromMod(mod: Object, current: url.PathElements) {
    return createRoom(mod, false, current);
}

export function createRoom(mod: Object, allowBots: boolean, current: url.PathElements, nextPage: string = "share") {
    console.log("Creating room", mod, allowBots);
    return facade.createRoom(mod, allowBots).then(response => facade.createParty(response.roomId, Storage.getOrCreatePlayerName()))
        .then(msg => {
            const path = url.getPath(Object.assign({}, current, {
                gameId: null,
                page: nextPage,
                party: msg.partyId,
                server: msg.server,
            }));
            window.location.href = path;
        })
}