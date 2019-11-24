import * as m from './messages.model';
import version from '../game/version';

export function calculateSegment(version: string, roomId: string, partyId: string) {
	return `${version}|${roomId}.${partyId}`;
}

export function publicSegment() {
	return calculateSegment(version, m.DefaultRoomId, null);
}

export function reversionSegment(segment: string, version: string) {
	const suffix = segment.split('|', 2)[1];
	if (suffix) {
		return `${version}|${suffix}`;
	} else {
		return segment;
	}
}