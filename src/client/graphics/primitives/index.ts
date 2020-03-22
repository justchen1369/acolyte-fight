import * as pl from 'planck-js';
import * as r from '../render.model';
import * as shaders from '../shaders';
import * as vector from '../../../game/vector';
import { Float32List } from '../list';
import ColTuple from '../colorTuple';

const FeatherFactor = 5; // Render up to this radius to ensure the Gaussian blur reaches close to zero
const fragmentShader = require('./primitive.fragment.glsl');
const vertexShader = require('./primitive.vertex.glsl');

const vectorZero = vector.zero();

export function initData(): r.DrawPrimitivesData {
    return {
        uniforms: {
        },
        attribs: {
            a_pos: new Float32List(),
            a_rel: new Float32List(),
            a_color: new Float32List(),
            a_fill: new Float32List(),
        },
        numVertices: 0,
    };
}

export function clearData(data: r.DrawData) {
	for (const key in data.attribs) {
		data.attribs[key].clear();
	}

	data.numVertices = 0;
}

export function initPrimitives(gl: WebGLRenderingContext): r.DrawPrimitives {
	const program = shaders.compileProgram(gl, vertexShader, fragmentShader);
	return {
		program,
		uniforms: shaders.commonUniforms(gl, program),
		attribs: {
			a_pos: {
				loc: gl.getAttribLocation(program, "a_pos"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 2,
			},
			a_rel: {
				loc: gl.getAttribLocation(program, "a_rel"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 2,
			},
			a_color: {
				loc: gl.getAttribLocation(program, "a_color"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 4,
			},
			a_fill: {
				loc: gl.getAttribLocation(program, "a_fill"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 4,
			},
		},
	};
}

function getSwatches(ctxStack: r.CanvasCtxStack) {
	return shaders.getContext(ctxStack.gl).data.swatches;
}

function getSolids(ctxStack: r.CanvasCtxStack) {
	return shaders.getContext(ctxStack.gl).data.solids;
}

function getTrails(ctxStack: r.CanvasCtxStack) {
	return shaders.getContext(ctxStack.gl).data.trails;
}

function appendCurveShape(data: Float32List, fill: r.TrailFill) {
	data.push(fill.minRadius || 0.0);
	data.push(fill.maxRadius);

	if (fill.feather) {
		data.push(fill.feather.sigma);
		data.push(fill.feather.alpha);
	} else {
		data.push(0);
		data.push(0);
	}
}

function appendTrail(ctxStack: r.CanvasCtxStack, primitives: r.DrawPrimitivesData, pos: pl.Vec2, angle: number, radius: number, fill: r.TrailFill) {
    let color: ColTuple = fill.color;
    if (fill.gradient) {
		const gradient = fill.gradient;
		const diff = vector.fromAngle(angle, radius).add(pos).sub(gradient.anchor); // Diff between anchor point and this point
		const offset = diff.length() * Math.cos(vector.angle(diff) - gradient.angle); // Offset when projected onto the gradient axis
		const alpha = (offset - gradient.fromExtent) / Math.max(1e-9, gradient.toExtent - gradient.fromExtent);

        const mix = Math.min(1, Math.max(0, alpha));
        color = gradient.fromColor.clone().mix(gradient.toColor, mix);
    }

	shaders.appendVec2(primitives.attribs.a_pos, pos);
	shaders.appendAngleRadius(primitives.attribs.a_rel, angle, radius);
	shaders.appendColTuple(primitives.attribs.a_color, color);
	appendCurveShape(primitives.attribs.a_fill, fill);
	++primitives.numVertices;
}

function circle(ctxStack: r.CanvasCtxStack, primitives: r.DrawPrimitivesData, pos: pl.Vec2, fill: r.TrailFill) {
	// sqrt(2) because the shortest point on the edge of the quad has to fully enclose the radius of the circle
	const extent = Math.sqrt(2) * calculateExtent(ctxStack, fill);

	appendTrail(ctxStack, primitives, pos, 0 * vector.Tau / 4, extent, fill);
	appendTrail(ctxStack, primitives, pos, 1 * vector.Tau / 4, extent, fill);
	appendTrail(ctxStack, primitives, pos, 2 * vector.Tau / 4, extent, fill);

	appendTrail(ctxStack, primitives, pos, 2 * vector.Tau / 4, extent, fill);
	appendTrail(ctxStack, primitives, pos, 3 * vector.Tau / 4, extent, fill);
	appendTrail(ctxStack, primitives, pos, 0 * vector.Tau / 4, extent, fill);
}

export function circleSwatch(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, fill: r.TrailFill) {
	circle(ctxStack, getSwatches(ctxStack), pos, fill);
}
export function circleSolid(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, fill: r.TrailFill) {
	circle(ctxStack, getSolids(ctxStack), pos, fill);
}
export function circleTrail(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, fill: r.TrailFill) {
	circle(ctxStack, getTrails(ctxStack), pos, fill);
}

function line(ctxStack: r.CanvasCtxStack, primitives: r.DrawPrimitivesData, from: pl.Vec2, to: pl.Vec2, fromFill: r.TrailFill, toFill: r.TrailFill = fromFill) {
	let extent = calculateExtent(ctxStack, fromFill);
	if (fromFill !== toFill) {
		extent = Math.max(extent, calculateExtent(ctxStack, toFill));
	}

	const down = vector.angleDiff(to, from) - vector.Tau / 4;
	const up = down + vector.Tau / 2;

	appendTrail(ctxStack, primitives, from, up, extent, fromFill);
	appendTrail(ctxStack, primitives, from, down, extent, fromFill);
	appendTrail(ctxStack, primitives, to, up, extent, toFill);

	appendTrail(ctxStack, primitives, to, up, extent, toFill);
	appendTrail(ctxStack, primitives, from, down, extent, fromFill);
	appendTrail(ctxStack, primitives, to, down, extent, toFill);
}

export function lineSwatch(ctxStack: r.CanvasCtxStack, from: pl.Vec2, to: pl.Vec2, fromFill: r.TrailFill, toFill: r.TrailFill = fromFill) {
	line(ctxStack, getSwatches(ctxStack), from, to, fromFill, toFill);
}
export function lineSolid(ctxStack: r.CanvasCtxStack, from: pl.Vec2, to: pl.Vec2, fromFill: r.TrailFill, toFill: r.TrailFill = fromFill) {
	line(ctxStack, getSolids(ctxStack), from, to, fromFill, toFill);
}
export function lineTrail(ctxStack: r.CanvasCtxStack, from: pl.Vec2, to: pl.Vec2, fromFill: r.TrailFill, toFill: r.TrailFill = fromFill) {
	line(ctxStack, getTrails(ctxStack), from, to, fromFill, toFill);
}

function arc(ctxStack: r.CanvasCtxStack, primitives: r.DrawPrimitivesData, pos: pl.Vec2, angle1: number, angle2: number, antiClockwise: boolean, fill: r.TrailFill) {
    const extent = Math.sqrt(2) * calculateExtent(ctxStack, fill); // sqrt(2) ensures the triangle always fully enclosees the arc

	const rels = new Array<pl.Vec2>();

    let currentAngle = angle1;
    for (let i = 0; i < 4; ++i) { // Maximum 4 right angle rotations
		const rel = vector.fromAngle(currentAngle).mul(extent);
		rels.push(rel);

        const direction = (antiClockwise ? -1 : 1);
        const step = direction * Math.PI / 2;

        let nextAngle: number;
        let deltaToTarget = vector.angleDelta(currentAngle, angle2);
        if (deltaToTarget === 0) {
            break;
        } else if (Math.sign(deltaToTarget) === Math.sign(direction) && Math.abs(deltaToTarget) < Math.abs(step)) {
            nextAngle = angle2;
        } else {
            nextAngle = currentAngle + step;
		}

		appendTrail(ctxStack, primitives, pos, 0, 0, fill);
		appendTrail(ctxStack, primitives, pos, currentAngle, extent, fill);
		appendTrail(ctxStack, primitives, pos, nextAngle, extent, fill);

        currentAngle = nextAngle;
    }
}

export function arcSwatch(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, angle1: number, angle2: number, antiClockwise: boolean, fill: r.TrailFill) {
	arc(ctxStack, getSwatches(ctxStack), pos, angle1, angle2, antiClockwise, fill);
}
export function arcSolid(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, angle1: number, angle2: number, antiClockwise: boolean, fill: r.TrailFill) {
	arc(ctxStack, getSolids(ctxStack), pos, angle1, angle2, antiClockwise, fill);
}
export function arcTrail(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, angle1: number, angle2: number, antiClockwise: boolean, fill: r.TrailFill) {
	arc(ctxStack, getTrails(ctxStack), pos, angle1, angle2, antiClockwise, fill);
}

function convex(ctxStack: r.CanvasCtxStack, primitives: r.DrawPrimitivesData, pos: pl.Vec2, points: pl.Vec2[], rotate: number, scale: number, fill: r.TrailFill) {
	const center = vectorZero;

    for (let i = 0; i < points.length; ++i) {
        const a = points[i]; //vector.turnVectorBy(points[i], rotate).mul(scale);
        const b = points[(i + 1) % points.length]; // vector.turnVectorBy(points[(i + 1) % points.length], rotate).mul(scale);
        if ((a.x === center.x && a.y === center.x) || (b.x === center.y && b.y === center.y)) {
            // This will just draw zero-space triangles, so don't bother
            continue;
        }

		appendTrail(ctxStack, primitives, pos, 0, 0, fill);
		appendTrail(ctxStack, primitives, pos, vector.angle(a) + rotate, a.length() * scale, fill);
		appendTrail(ctxStack, primitives, pos, vector.angle(b) + rotate, b.length() * scale, fill);
    }
}

export function convexSwatch(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, points: pl.Vec2[], rotate: number, scale: number, fill: r.TrailFill) {
	convex(ctxStack, getSwatches(ctxStack), pos, points, rotate, scale, fill);
}
export function convexSolid(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, points: pl.Vec2[], rotate: number, scale: number, fill: r.TrailFill) {
	convex(ctxStack, getSolids(ctxStack), pos, points, rotate, scale, fill);
}
export function convexTrail(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, points: pl.Vec2[], rotate: number, scale: number, fill: r.TrailFill) {
	convex(ctxStack, getTrails(ctxStack), pos, points, rotate, scale, fill);
}

function calculateExtent(ctxStack: r.CanvasCtxStack, fill: r.TrailFill) {
    let extent = fill.maxRadius + ctxStack.subpixel;
    if (fill.feather) {
        extent += fill.feather.sigma * FeatherFactor;
    }
    return extent;
}