import * as Redux from 'redux';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as storage from './storage';
import * as engine from '../game/engine';
import * as settings from '../game/settings';

const store = Redux.createStore(reducer, initialState());

function initialState(): s.State {
    const isNewPlayer = true; // !storage.loadName();

    const room: s.RoomState = {
        id: null,
        mod: {},
        settings: settings.DefaultSettings,
    };
    return {
        isNewPlayer,
        playerName: storage.getOrCreatePlayerName(),
        keyBindings: storage.getKeyBindingsOrDefaults(),
        rebindings: storage.getRebindingsOrDefaults(),
        aiCode: null,
        current: {},
        socketId: null,
        server: null,
        room,
        party: null,
        world: engine.initialWorld(room.mod),
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
    } else if (action.type === "updateUserId") {
        return { ...state, userId: action.userId };
    } else if (action.type === "updatePlayerName") {
        return { ...state, playerName: action.playerName };
    } else if (action.type === "updateKeyBindings") {
        return { ...state, keyBindings: action.keyBindings };
    } else if (action.type === "updateUrl") {
        return { ...state, current: action.current };
    } else if (action.type === "updatePage") {
        return {
             ...state,
            current: {
                ...state.current,
                page: action.page,
                profileId: action.profileId,
            },
        };
    } else if (action.type === "joinMatch") {
        return {
            ...state,
            world: action.world,
            items: [],
            current: {
                ...state.current,
                gameId: action.world.ui.myGameId,
                server: state.server,
            },
        };
    } else if (action.type === "leaveMatch") {
        return {
            ...state,
            world: engine.initialWorld(state.room.mod),
            items: [],
            current: {
                ...state.current,
                gameId: null,
                server: null,
            },
        };
    } else if (action.type === "updateNotifications") {
        return { ...state, items: action.items }
    } else if (action.type === "updateRoom") {
        return {
            ...state,
            room: action.room,
        };
    } else if (action.type === "joinParty") {
        if (!(state.party && state.party.id === action.party.id)) {
            return {
                ...state,
                party: action.party,
            };
        } else {
            return state;
        }
    } else if (action.type === "updateParty") {
        if (state.party && state.party.id == action.partyId) {
            const self = action.members.find(m => m.socketId === state.socketId);
            return {
                ...state,
                party: {
                    ...state.party,
                    roomId: action.roomId,
                    members: action.members,
                    ready: self && self.ready,
                    observing: self && self.isObserver,
                    isPrivate: action.isPrivate,
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
    } else if (action.type === "updateAiCode") {
        return { ...state, aiCode: action.aiCode };
    } else if (action.type === "clearNewPlayerFlag") {
        return { ...state, isNewPlayer: false };
    } else if (action.type === "updateHoverSpell") {
        state.world.ui.hoverSpellId = action.hoverSpellId; // World always gets mutated
        return { ...state } // Create new object to trigger redux
    } else if (action.type === "updateRebindings") {
        return { ...state, rebindings: action.rebindings };
    } else if (action.type === "updateServer") {
        return { ...state, server: action.server };
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