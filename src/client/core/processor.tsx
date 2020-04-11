import pl from 'planck-js';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';

export function initialWorld(data: m.HeroMsg) {
	let world = engine.initialWorld(data.mod);
	connectToWorld(world, data);
	return world;
}

export function connectToWorld(world: w.World, data: m.HeroMsg) {
	world.ui.myRoomId = data.room;
	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;
	world.ui.myPartyId = data.partyId;
	world.ui.myUserHash = data.userHash;
	world.ui.controlKeyXX = data.controlKey;
	world.ui.reconnectKey = data.reconnectKey;
	world.ui.universeId = data.universeId;
	world.ui.live = data.live;
	world.ui.locked = data.locked;
	world.ui.autoJoin = data.autoJoin;
}

export function isStartGameTick(tickData: m.TickMsg) {
	return tickData.c && tickData.c.some(x => x.type === m.ActionType.CloseGame && x.waitPeriod <= 0);
}

export function applyTick(tickData: m.TickMsg, world: w.World) {
	applyTickActions(tickData, world);
    engine.tick(world);
}

function applyTickActions(tickData: m.TickMsg, world: w.World) {
	if (tickData.u !== world.ui.universeId) {
		return;
	}

	if (tickData.c) {
		world.controlMessages.push(...tickData.c);
	}

	if (tickData.a) {
		world.actionMessages.push(...tickData.a);
	}

	if (tickData.s) {
		const heroLookup = new Map<number, w.ObjectSnapshot>();
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