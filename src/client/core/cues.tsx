import * as audio from './audio';
import * as StoreProvider from '../storeProvider';
import { Sounds } from '../../game/sounds';

export function play(sound: string) {
    const state = StoreProvider.getState();
    if (!state.options.mute) {
        audio.playUnattached(sound, Sounds);
    }
}