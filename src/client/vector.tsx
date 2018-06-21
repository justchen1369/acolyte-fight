import pl from 'planck-js';

// Vector utils
export function zero() {
	return pl.Vec2(0, 0);
}

export function diff(to: pl.Vec2, from: pl.Vec2) {
	return pl.Vec2(to.x - from.x, to.y - from.y);
}

export function length(vec: pl.Vec2) {
	return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

export function unit(vec: pl.Vec2) {
	let len = length(vec);
	return len == 0 ? vec : pl.Vec2(vec.x / len, vec.y / len);
}

export function direction(to: pl.Vec2, from: pl.Vec2, length: number) {
	let d = diff(to, from);
	return multiply(unit(d), length);
}

export function multiply(vec: pl.Vec2, multiplier: number) {
	return pl.Vec2(vec.x * multiplier, vec.y * multiplier);
}

export function truncate(vec: pl.Vec2, maxLength: number) {
	let len = length(vec);
	if (len > maxLength) {
		return multiply(vec, maxLength / len);
	} else {
		return vec;
	}
}

export function towards(from: pl.Vec2, to: pl.Vec2, distance: number) {
	let d = diff(to, from);
	let step = truncate(d, distance);
	return plus(from, step);
}

export function plus(a: pl.Vec2, b: pl.Vec2) {
	return pl.Vec2(a.x + b.x, a.y + b.y);
}

export function distance(a: pl.Vec2, b: pl.Vec2) {
	return length(diff(a, b));
}

export function clone(vec: pl.Vec2) {
	return pl.Vec2(vec.x, vec.y);
}

export function angle(vec: pl.Vec2) {
	return Math.atan2(vec.y, vec.x);
}

export function fromAngle(angle: number) {
	return pl.Vec2(Math.cos(angle), Math.sin(angle));
}

export function negate(vec: pl.Vec2) {
	return pl.Vec2(-vec.x, -vec.y);
}

export function rotateRight(vec: pl.Vec2) {
	return pl.Vec2(vec.y, -vec.x);
}

export function dot(a: pl.Vec2, b: pl.Vec2) {
	return a.x * b.x + a.y * b.y;
}