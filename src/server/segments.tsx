import * as engine from '../game/engine';

export function calculateSegment(version: string, roomId: string, partyId: string, isPrivate: boolean, allowBots: boolean) {
	const privatePartyId = isPrivate ? partyId : null;
	return `room=${roomId}/party=${privatePartyId}/allowBots=${allowBots}/version=${version}`;
}

export function publicSegment(allowBots: boolean = false) {
	return calculateSegment(engine.version(), null, null, false, allowBots);
}
