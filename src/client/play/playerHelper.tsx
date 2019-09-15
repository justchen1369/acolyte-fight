import * as Reselect from 'reselect';
import * as s from '../store.model';
import * as w from '../../game/world.model';

export const calculatePlayerLookup = Reselect.createSelector(
    (state: s.State) => state.world.players,
    (players) => {
        const playerLookup = new Map<string, w.Player>();
        players.valueSeq().forEach(player => {
            if (!player.left && player.userHash) {
                playerLookup.set(player.userHash, player);
            }
        });
        return playerLookup;
    }
);
