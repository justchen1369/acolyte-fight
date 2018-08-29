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
    } else if (action.type === "disconnected") {
	    return {
            ...state,
            socketId: null,
            world: {
                ...state.world,
                activePlayers: state.world.activePlayers.clear(),
            },
        };
     } else if (action.type === "updatePlayerName") {
        return { ...state, playerName: action.playerName };
    } else if (action.type === "updateUrl") {
        return { ...state, current: action.current };
    } else if (action.type === "updatePage") {
        return {
             ...state,
            current: { ...state.current, page: action.page },
        };
    } else if (action.type === "joinMatch") {
        return {
            ...state,
            world: action.world,
            items: [],
            current: {
                ...state.current,
                gameId: action.world.ui.myGameId,
            },
        };
    } else if (action.type === "leaveMatch") {
        return {
            ...state,
            world: engine.initialWorld(state.room.mod, state.room.allowBots),
            items: [],
            current: {
                ...state.current,
                gameId: null,
            },
        };
    } else if (action.type === "updateNotifications") {
        return { ...state, items: action.items }
    } else if (action.type === "updateRoom") {
        return {
            ...state,
            room: action.room,
            world: engine.initialWorld(action.room.mod, action.room.allowBots),
        };
    } else if (action.type === "joinParty") {
        if (!(state.party && state.party.id === action.party.id)) {
            return {
                ...state,
                party: action.party,
                current: {
                    ...state.current,
                    party: action.party.id,
                    server: action.server,
                },
            };
        } else {
            return state;
        }
    } else if (action.type === "updateParty") {
        if (state.party && state.party.id == action.partyId) {
            return {
                ...state,
                party: {
                    ...state.party,
                    members: action.members,
                    ready: action.members.some(m => m.socketId === state.socketId && m.ready),
                },
            };
        } else {
            return state;
        }
    } else if (action.type === "leaveParty") {
        if (state.party && state.party.id === action.partyId) {
            return {
                ...state,
                party: null,
                current: {
                    ...state.current,
                    party: null,
                },
            };
        } else {
            return state;
        }
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