import pl from 'planck-js';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';

export function initialWorld(data: m.HeroMsg) {
	let world = engine.initialWorld(data.mod);

	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;
	world.ui.myPartyId = data.partyId;
	world.ui.myUserHash = data.userHash;
	world.ui.reconnectKey = data.reconnectKey;
	world.ui.live = data.live;
	world.ui.locked = data.locked;

	return world;
}

export function isStartGameTick(tickData: m.TickMsg) {
	return tickData.c && tickData.c.some(x => x.type === m.ActionType.CloseGame);
}

export function applyTick(tickData: m.TickMsg, world: w.World) {
    applyTickActions(tickData, world);
    engine.tick(world);
}

function applyTickActions(tickData: m.TickMsg, world: w.World) {
	if (tickData.g !== world.ui.myGameId) {
		return;
	}

	if (tickData.c) {
		world.controlMessages.push(...tickData.c);
	}

	if (tickData.a) {
		tickData.a.forEach(actionData => {
			if (actionData.type === m.ActionType.GameAction) {
				world.actions.set(actionData.h, {
					type: actionData.s,
					target: pl.Vec2(actionData.x, actionData.y),
					release: actionData.r,
				});
			} else if (actionData.type === m.ActionType.Spells) {
				world.spellChanges.push(actionData);
			}
		});
	}

	if (tickData.s) {
		const heroLookup = new Map<string, w.ObjectSnapshot>();
		tickData.s.o.forEach(snapshot => {
			heroLookup.set(snapshot.id, {
				health: snapshot.h,
				pos: pl.Vec2(snapshot.x, snapshot.y),
			});
		});
		world.syncs.push({
			tick: tickData.s.t,
			objectLookup: heroLookup,
		});
	}
}