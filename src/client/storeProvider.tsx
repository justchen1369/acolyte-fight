import * as s from './store.model';
import * as w from '../game/world.model';
import { getCurrentWorld } from './facade';

const store: s.State = {
    socketId: null,
    party: null,
    world: getCurrentWorld(),
    items: [],
};

export function getStore(): s.State {
    return store;
}

export function setConnected(socketId: string) {
    store.socketId = socketId;
}