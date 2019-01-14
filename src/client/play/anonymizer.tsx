import * as w from '../../game/world.model';

export function anonymize(player: w.Player, world: w.World) {
    if (!player) {
        return false;
    }

    if (world.winner) { // Show all results after game over
        return false;
    }

    if (!world.ui.myHeroId) { // Show everything to observers
        return false;
    }

    if (player.dead) { // No harm in revealing a dead player
        return false;
    }

    if (player.heroId === world.ui.myHeroId) { // Always reveal self
        return false;
    }

    const selfPlayer = world.players.get(world.ui.myHeroId);
    if (selfPlayer && selfPlayer.dead) {
        return false; // Dead players see all
    }

    return true;
}