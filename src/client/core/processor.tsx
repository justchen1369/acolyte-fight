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

	return world;

}

export function isStartGameTick(tickData: m.TickMsg) {
	let result = false;
	tickData.actions.forEach(actionData => {
		if (actionData.actionType === m.ActionType.CloseGame) {
			result = true;
		}
	});
	return result;
}

export function applyTick(tickData: m.TickMsg, world: w.World, preferredColors: Map<string, string> = null) {
    applyTickActions(tickData, world, preferredColors);
    engine.tick(world);
}

function applyTickActions(tickData: m.TickMsg, world: w.World, preferredColors: Map<string, string> = null) {
	if (tickData.gameId !== world.ui.myGameId) {
		return;
	}

	tickData.actions.forEach(actionData => {
		if (actionData.gameId !== world.ui.myGameId) {
			// Skip this action
		} else if (actionData.actionType === m.ActionType.GameAction) {
			world.actions.set(actionData.heroId, {
				type: actionData.spellId,
				target: pl.Vec2(actionData.targetX, actionData.targetY),
			});
		} else if (actionData.actionType === m.ActionType.CloseGame) {
			world.occurrences.push({
				type: "closing",
				startTick: actionData.closeTick,
				ticksUntilClose: actionData.waitPeriod,
				numTeams: actionData.numTeams,
			});
		} else if (actionData.actionType === m.ActionType.Join) {
			world.occurrences.push({
				type: "join",
				heroId: actionData.heroId,
				userId: actionData.userId,
				userHash: actionData.userHash,
				partyHash: actionData.partyHash,
				playerName: actionData.playerName || "Acolyte",
				keyBindings: actionData.keyBindings,
				preferredColor: preferredColors && preferredColors.get(actionData.userHash),
				isBot: actionData.isBot,
				isMobile: actionData.isMobile,
			});
		} else if (actionData.actionType === m.ActionType.Bot) {
			world.occurrences.push({
				type: "botting",
				heroId: actionData.heroId,
				keyBindings: actionData.keyBindings,
			});
		} else if (actionData.actionType === m.ActionType.Leave) {
			world.occurrences.push({
				type: "leave",
				heroId: actionData.heroId,
			});
		} else if (actionData.actionType === m.ActionType.Environment) {
			world.occurrences.push({
				type: "environment",
				seed: actionData.seed,
				layoutId: actionData.layoutId,
			});
		} else if (actionData.actionType === m.ActionType.Spells) {
			world.occurrences.push({
				type: "spells",
				heroId: actionData.heroId,
				keyBindings: actionData.keyBindings,
			});
		} else if (actionData.actionType === m.ActionType.Sync) {
			const heroLookup = new Map<string, w.ObjectSnapshot>();
			actionData.heroes.forEach(snapshot => {
				heroLookup.set(snapshot.heroId, {
					health: snapshot.health,
					pos: pl.Vec2(snapshot.posX, snapshot.posY),
				});
			});
			world.occurrences.push({
				type: "sync",
				tick: actionData.tick,
				objectLookup: heroLookup,
			});
		}
	});
}