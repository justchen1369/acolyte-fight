import * as m from './messages.model';

export function calculateSegment(roomId: string, partyId: string) {
	return `${roomId}.${partyId}`;
}

export function publicSegment() {
	return calculateSegment(m.DefaultRoomId, null);
}
