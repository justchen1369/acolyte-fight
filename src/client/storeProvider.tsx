import * as s from './store.model';
import * as w from '../game/world.model';
import * as storage from './storage';
import * as engine from '../game/engine';

const store: s.State = initialState();

function initialState(): s.State {
    const isNewPlayer = !storage.loadName();

    const room: s.RoomState = {
        id: null,
        mod: {},
        allowBots: false,
    };
    return {
        isNewPlayer,
        playerName: storage.getOrCreatePlayerName(),
        keyBindings: storage.getKeyBindingsOrDefaults(),
        current: {},
        socketId: null,
        preferredColors: new Map<string, string>(),
        room,
        party: null,
        world: engine.initialWorld(room.mod, room.allowBots),
        items: [],
    };
}

export function getStore(): s.State {
    return store;
}

export function setConnected(socketId: string) {
    store.socketId = socketId;
}

export function setPlayerName(name: string) {
    store.playerName = name;
}

export function setUrl(current: s.PathElements) {
    store.current = current;
}