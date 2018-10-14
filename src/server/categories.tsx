export function calculateGameCategory(roomId: string, privatePartyId: string, allowBots: boolean) {
	return `room=${roomId}/party=${privatePartyId}/allowBots=${allowBots}`;
}

export function publicCategory(allowBots: boolean = false) {
	return calculateGameCategory(null, null, allowBots);
}
