import pl from 'planck-js';

// Vector utils
export function zero() {
	return pl.Vec2(0, 0);
}

export function diff(to, from) {
	return pl.Vec2(to.x - from.x, to.y - from.y);
}

export function length(vec) {
	return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

export function unit(vec) {
	let len = length(vec);
	return len == 0 ? vec : pl.Vec2(vec.x / len, vec.y / len);
}

export function direction(to, from, length) {
	let d = diff(to, from);
	return multiply(unit(d), length);
}

export function multiply(vec, multiplier) {
	return pl.Vec2(vec.x * multiplier, vec.y * multiplier);
}

export function truncate(vec, maxLength) {
	let len = length(vec);
	if (len > maxLength) {
		return multiply(vec, maxLength / len);
	} else {
		return vec;
	}
}

export function towards(from, to, distance) {
	let d = diff(to, from);
	let step = truncate(d, distance);
	return plus(from, step);
}

export function plus(a, b) {
	return pl.Vec2(a.x + b.x, a.y + b.y);
}

export function distance(a, b) {
	return length(diff(a, b));
}

export function clone(vec) {
	return pl.Vec2(vec.x, vec.y);
}
