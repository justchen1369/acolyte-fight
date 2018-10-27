export function calculateGameCategory(roomId: string, partyId: string, isPrivate: boolean, allowBots: boolean) {
	const privatePartyId = isPrivate ? partyId : null;
	return `room=${roomId}/party=${privatePartyId}/allowBots=${allowBots}`;
}

export function publicCategory(allowBots: boolean = false) {
	return calculateGameCategory(null, null, false, allowBots);
}
