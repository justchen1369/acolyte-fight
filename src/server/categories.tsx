import * as engine from '../game/engine';

export function calculateGameCategory(version: string, roomId: string, partyId: string, isPrivate: boolean, allowBots: boolean) {
	const privatePartyId = isPrivate ? partyId : null;
	return `room=${roomId}/party=${privatePartyId}/allowBots=${allowBots}/version=${version}`;
}

export function publicCategory(allowBots: boolean = false) {
	return calculateGameCategory(engine.version(), null, null, false, allowBots);
}
