import Immutable from 'immutable';
import * as Redux from 'redux';
import * as d from './stats.model';
import * as m from '../shared/messages.model';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as storage from './storage';
import * as engine from '../game/engine';
import * as settings from '../game/settings';

let store: Redux.Store<s.State> = null;

export function init() {
    store = Redux.createStore(reducer, initialState());
}

function initialState(): s.State {
    const isNewPlayer = !storage.loadName();

    const room: s.RoomState = {
        id: m.DefaultRoomId,
        mod: {},
        settings: settings.DefaultSettings,
    };
    return {
        customizing: false,
        seen: 0,
        loggedIn: false,
        showingHelp: true,
        isNewPlayer,
        playerName: storage.getOrCreatePlayerName(),
        keyBindings: storage.getKeyBindingsOrDefaults(),
        rebindings: storage.getRebindingsOrDefaults(isNewPlayer ? initialRebindingsNew() : initialRebindingsOld()),
        options: storage.getOptionsOrDefaults(),
        modErrors: {},
        current: { page: "", profileId: null },
        socketId: null,
        server: null,
        region: null,
        room,
        party: null,
        world: engine.initialWorld(room.mod),
        items: [],
        silenced: new Set<string>(),
        profile: null,
        leagues: null,
        allGameStats: new Map<string, d.GameStats>(),
        hasReplayLookup: new Map<string, string>(),
        online: Immutable.Map(),
        onlineSegment: null,
    };
}

function initialRebindingsOld(): KeyBindings {
    return {
        [w.SpecialKeys.DoubleTap]: "a",
    };
}

function initialRebindingsNew(): KeyBindings {
    return {
        [w.SpecialKeys.Hover]: w.Actions.Move,
        [w.SpecialKeys.LeftClick]: "q",
        [w.SpecialKeys.RightClick]: "a",
        [w.SpecialKeys.SingleTap]: "q",
        [w.SpecialKeys.DoubleTap]: "a",
    };
}


function reducer(state: s.State, action: s.Action): s.State {
    if (action.type === "serverPreparingToShutdown") {
	    return {
            ...state,
            socketId: null,
            server: null, // Don't reconnect to existing server since it's shutting down
        };
    } else if (action.type === "disconnected") {
	    return {
            ...state,
            socketId: null,
            party: null,
            world: {
                ...state.world,
                activePlayers: state.world.activePlayers.clear(),
            },
        };
    } else if (action.type === "updateAds") {
        return { ...state, ads: action.ads };
    } else if (action.type === "seen") {
        return { ...state, seen: action.seen };
    } else if (action.type === "updateUserId") {
        let newState: s.State = { ...state, userId: action.userId, loggedIn: action.loggedIn, profile: null };
        if (action.loggedIn) {
            newState.isNewPlayer = false;
        }
        return newState;
    } else if (action.type === "logout") {
        return {
            ...state,
            userId: null,
            loggedIn: false,
            profile: null,
        };
    } else if (action.type === "updatePlayerName") {
        return { ...state, playerName: action.playerName };
    } else if (action.type === "updateKeyBindings") {
        return { ...state, keyBindings: action.keyBindings };
    } else if (action.type === "customizing") {
        return { ...state, customizing: action.customizing };
    } else if (action.type === "updateOptions") {
        return {
            ...state,
            options: {
                ...state.options,
                ...action.options,
            },
        };
    } else if (action.type === "updateUrl") {
        return { ...state, current: action.current };
    } else if (action.type === "updateHash") {
        return {
            ...state,
            current: {
                ...state.current,
                hash: action.hash,
            },
        };
    } else if (action.type === "updatePage") {
        return {
             ...state,
            current: {
                ...state.current,
                page: action.page,
                profileId: action.profileId,
            },
        };
    } else if (action.type === "online") {
        let online = state.online;
        if (action.all) {
            online = online.clear();
        }

        online = online.withMutations(collection => {
            if (action.left) {
                action.left.forEach(userHash => {
                    collection.delete(userHash);
                });
            }
            if (action.joined) {
                action.joined.forEach(player => {
                    collection.set(player.userHash, player);
                });
            }
        });

        return { ...state, online }
    } else if (action.type === "onlineSegment") {
        return { ...state, onlineSegment: action.segment, online: Immutable.Map() };
    } else if (action.type === "joinMatch") {
        return {
            ...state,
            world: action.world,
            items: state.items.filter(x => x.notification.type === "text"), // Keep all text messages, discard all else
            current: {
                ...state.current,
                gameId: action.world.ui.myGameId,
            },
        };
    } else if (action.type === "leaveMatch") {
        return {
            ...state,
            world: engine.initialWorld(state.room.mod),
            current: {
                ...state.current,
                gameId: null,
            },
        };
    } else if (action.type === "updateNotifications") {
        return { ...state, items: action.items }
    } else if (action.type === "updateSilence") {
        const silenced = new Set<string>(state.silenced);
        if (action.add) {
            action.add.forEach(userHash => silenced.add(userHash));
        }
        if (action.remove) {
            action.remove.forEach(userHash => silenced.delete(userHash));
        }
        return { ...state, silenced };
    } else if (action.type === "updateRoom") {
        return {
            ...state,
            room: action.room,
            codeTree: null, // The mod has changed, make sure the modding window is showing the new mod
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
            return {
                ...state,
                party: {
                    ...state.party,
                    roomId: action.roomId,
                    members: action.members,
                    isPrivate: action.isPrivate,
                    isLocked: action.isLocked,
                    initialObserver: action.initialObserver,
                    waitForPlayers: action.waitForPlayers,
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
    } else if (action.type === "updateShowingHelp") {
        return { ...state, showingHelp: action.showingHelp };
    } else if (action.type === "clearNewPlayerFlag") {
        return { ...state, isNewPlayer: false };
    } else if (action.type === "updateToolbar") {
        state.world.ui.toolbar = {
            ...state.world.ui.toolbar,
            ...action.toolbar,
        }; // World always gets mutated
        return { ...state } // Create new object to trigger redux
    } else if (action.type === "updateRebindings") {
        return { ...state, rebindings: action.rebindings };
    } else if (action.type === "updateServer") {
        return { ...state, server: action.server, region: action.region, socketId: action.socketId };
    } else if (action.type === "updateProfile") {
        return { ...state, profile: action.profile };
    } else if (action.type === "updateLeagues") {
        return { ...state, leagues: action.leagues };
    } else if (action.type === "updateGameStats") {
        const allGameStats = new Map<string, d.GameStats>(state.allGameStats);
        for (const gameStats of action.allGameStats) {
            allGameStats.set(gameStats.id, gameStats);
        }
        return { ...state, allGameStats };
    } else if (action.type === "updateHasReplay") {
        const hasReplayLookup = new Map<string, string>(state.hasReplayLookup);
        action.hasReplayLookup.forEach((hasReplay, gameId) => {
            hasReplayLookup.set(gameId, hasReplay);
        });
        return { ...state, hasReplayLookup };
    } else if (action.type === "updateCodeTree") {
        return { ...state, codeTree: action.codeTree, mod: null };
    } else if (action.type === "updateCodeItem") {
        if (state.codeTree[action.sectionKey][action.itemId] !== action.code) {
            return {
                ...state,
                codeTree: {
                    ...state.codeTree,
                    [action.sectionKey]: {
                        ...state.codeTree[action.sectionKey],
                        [action.itemId]: action.code,
                    },
                },
                mod: null,
            };
        } else {
            return state;
        }
    } else if (action.type === "deleteCodeItem") {
        const newSection = { ...state.codeTree[action.sectionKey] };
        delete newSection[action.itemId];

        return {
            ...state,
            codeTree: {
                ...state.codeTree,
                [action.sectionKey]: newSection,
            },
            mod: null,
        };
    } else if (action.type === "updateModTree") {
        return {
            ...state,
            mod: action.mod,
            modErrors: action.modErrors,
            modBuiltFrom: action.modBuiltFrom,
        };
    } else if (action.type === "invalidateModTree") {
        if (state.mod) {
            return {
                ...state,
                mod: null,
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