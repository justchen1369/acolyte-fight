import * as m from './messages.model';

export function calculateSegment(roomId: string, partyId: string, isPrivate: boolean) {
	const privatePartyId = isPrivate ? partyId : null;
	return `${roomId}.${privatePartyId}`;
}

export function publicSegment() {
	return calculateSegment(m.DefaultRoomId, null, false);
}
