import * as m from './messages.model';
import version from '../game/version';

export function calculateSegment(version: string, roomId: string, partyId: string) {
	return `${version}.${roomId}.${partyId}`;
}

export function publicSegment() {
	return calculateSegment(version, m.DefaultRoomId, null);
}
