import * as Redux from 'redux';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as storage from './storage';
import * as engine from '../game/engine';

const store = Redux.createStore(reducer, initialState());

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
        room,
        party: null,
        world: engine.initialWorld(room.mod, room.allowBots),
        items: [],
    };
}

function reducer(state: s.State, action: s.Action): s.State {
    if (action.type === "updateSocket") {
        return { ...state, socketId: action.socketId };
    } else if (action.type === "updatePlayerName") {
        return { ...state, playerName: action.playerName };
    } else if (action.type === "updateUrl") {
        return { ...state, current: action.current };
    } else if (action.type === "updatePage") {
        return {
             ...state,
            current: { ...state.current, page: action.page },
        };
    } else if (action.type === "updateServer") {
        return {
             ...state,
            current: { ...state.current, server: action.server },
        };
    } else if (action.type === "updateWorld") {
        return {
            ...state,
            world: action.world,
            items: [],
        };
    } else if (action.type === "updateNotifications") {
        return { ...state, items: action.items }
    } else {
        console.log(action);
        return state;
    }
}

export function dispatch(action: s.Action) {
    store.dispatch(action);
}

export function getState(): s.State {
    return store.getState();
}

export function getStore() {
    return store;
}