import * as pl from 'planck-js';
import * as r from './render.model';
import * as shaders from './shaders';
import * as vector from '../../game/vector';
import { Float32List } from './list';
import ColTuple from './colorTuple';

const FeatherFactor = 5; // Render up to this radius to ensure the Gaussian blur reaches close to zero
const trailFragmentShader = require('./trailFragmentShader.glsl');
const trailVertexShader = require('./trailVertexShader.glsl');

export function initData(): r.DrawTrailsData {
    return {
        uniforms: {
        },
        attribs: {
            a_pos: new Float32List(),
            a_rel: new Float32List(),
            a_color: new Float32List(),
            a_fill: new Float32List(),
        },
        textures2D: [],
        numVertices: 0,
    };
}

export function clearData(data: r.DrawData) {
	data.uniforms = {};

	for (const key in data.attribs) {
		data.attribs[key].clear();
	}

	data.textures2D = [];
	data.numVertices = 0;
}

export function initTrails(gl: WebGLRenderingContext): r.DrawTrails {
	const program = shaders.compileProgram(gl, trailVertexShader, trailFragmentShader);
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
        textures2D: [],
	};
}

function appendCurveShape(data: Float32List, fill: r.Fill) {
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

function appendTrail(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, rel: pl.Vec2, fill: r.Fill) {
    let color: ColTuple = fill.color;
    if (fill.gradient) {
        const point = pos.clone().add(rel);
        const diff = vector.diff(point, fill.gradient.from);
        const axis = vector.diff(fill.gradient.to, fill.gradient.from);
        let range = axis.length();
        if (range === 0.0) {
            range = 1e-9;
        }
        const mix = Math.min(1, Math.max(0, vector.dot(diff, axis) / range / range));
        color = fill.gradient.fromColor.clone().mix(fill.gradient.toColor, mix);
    }

    const trails = shaders.getContext(ctxStack.gl).data.trails;
	shaders.appendVec2(trails.attribs.a_pos, pos);
	shaders.appendVec2(trails.attribs.a_rel, rel);
	shaders.appendColTuple(trails.attribs.a_color, color);
	appendCurveShape(trails.attribs.a_fill, fill);
	++trails.numVertices;
}

export function circle(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, fill: r.Fill) {
	const extent = calculateExtent(ctxStack, fill);
	const quad = [
		pl.Vec2(-extent, -extent),
		pl.Vec2(-extent, extent),
		pl.Vec2(extent, extent),
		pl.Vec2(extent, -extent),
	];

	appendTrail(ctxStack, pos, quad[0], fill);
	appendTrail(ctxStack, pos, quad[1], fill);
	appendTrail(ctxStack, pos, quad[2], fill);

	appendTrail(ctxStack, pos, quad[2], fill);
	appendTrail(ctxStack, pos, quad[3], fill);
	appendTrail(ctxStack, pos, quad[0], fill);
}

export function line(ctxStack: r.CanvasCtxStack, from: pl.Vec2, to: pl.Vec2, fill: r.Fill) {
	const extent = calculateExtent(ctxStack, fill);
	const down = vector.relengthen(vector.rotateLeft(vector.diff(to, from)), extent);
	const up = vector.negate(down);

	appendTrail(ctxStack, from, up, fill);
	appendTrail(ctxStack, from, down, fill);
	appendTrail(ctxStack, to, up, fill);

	appendTrail(ctxStack, to, up, fill);
	appendTrail(ctxStack, from, down, fill);
	appendTrail(ctxStack, to, down, fill);
}

export function arc(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, angle1: number, angle2: number, antiClockwise: boolean, fill: r.Fill) {
    const extent = Math.sqrt(2) * calculateExtent(ctxStack, fill); // sqrt(2) ensures the triangle always fully enclosees the arc

	const center = vector.zero();
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

        currentAngle = nextAngle;
    }

    for (let i = 0; i < rels.length - 1; ++i) {
		appendTrail(ctxStack, pos, center, fill);
		appendTrail(ctxStack, pos, rels[i], fill);
		appendTrail(ctxStack, pos, rels[i + 1], fill);
    }
}

export function convex(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, points: pl.Vec2[], rotate: number, scale: number, fill: r.Fill) {
	const center = vector.zero();

    for (let i = 0; i < points.length; ++i) {
        const a = vector.turnVectorBy(points[i], rotate).mul(scale);
        const b = vector.turnVectorBy(points[(i + 1) % points.length], rotate).mul(scale);
        if ((a.x === center.x && a.y === center.x) || (b.x === center.y && b.y === center.y)) {
            // This will just draw zero-space triangles, so don't bother
            continue;
        }

		appendTrail(ctxStack, pos, center, fill);
		appendTrail(ctxStack, pos, a, fill);
		appendTrail(ctxStack, pos, b, fill);
    }
}

function calculateExtent(ctxStack: r.CanvasCtxStack, fill: r.Fill) {
    let extent = fill.maxRadius + ctxStack.subpixel;
    if (fill.feather) {
        extent += fill.feather.sigma * FeatherFactor;
    }
    return extent;
}