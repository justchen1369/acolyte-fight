import Color from 'color';
import * as pl from 'planck-js';
import * as r from './render.model';
import * as shaders from './shaders';
import * as vector from '../../game/vector';

const FeatherFactor = 5; // Render up to this radius to ensure the Gaussian blur reaches close to zero
const trailFragmentShader = require('./trailFragmentShader.glsl');
const trailVertexShader = require('./trailVertexShader.glsl');

export function initData(): r.DrawTrailsData {
    return {
        uniforms: {
        },
        attribs: {
            a_pos: [],
            a_rel: [],
            a_color: [],
            a_shape: [],
        },
        numVertices: 0,
    };
}

export function initTrails(gl: WebGLRenderingContext): r.DrawTrails {
	const program = shaders.compileProgram(gl, trailVertexShader, trailFragmentShader);
	return {
		program,
		uniforms: {
			u_translate: {
				loc: gl.getUniformLocation(program, "u_translate"),
				type: gl.FLOAT,
				size: 2,
			},
			u_scale: {
				loc: gl.getUniformLocation(program, "u_scale"),
				type: gl.FLOAT,
				size: 2,
			},
			u_pixel: {
				loc: gl.getUniformLocation(program, "u_pixel"),
				type: gl.FLOAT,
				size: 1,
			},
		},
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
			a_shape: {
				loc: gl.getAttribLocation(program, "a_shape"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 4,
			},
		},
	};
}

function appendCurveShape(data: number[], curve: r.CurveShape) {
	data.push(curve.minRadius, curve.maxRadius);

	if (curve.feather) {
		data.push(curve.feather.sigma, curve.feather.alpha);
	} else {
		data.push(0, 0);
	}
}

function appendTrail(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, rel: pl.Vec2, color: Color, curve: r.CurveShape) {
    const trails = ctxStack.data.trails;
	shaders.appendVec2(trails.attribs.a_pos, pos);
	shaders.appendVec2(trails.attribs.a_rel, rel);
	shaders.appendColor(trails.attribs.a_color, color);
	appendCurveShape(trails.attribs.a_shape, curve);
	++trails.numVertices;
}

export function circle(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, minRadius: number, maxRadius: number, color: Color, feather?: r.FeatherConfig) {
	const extent = maxRadius + featherRadius(feather);
	const quad = [
		pl.Vec2(-extent, -extent),
		pl.Vec2(-extent, extent),
		pl.Vec2(extent, extent),
		pl.Vec2(extent, -extent),
	];

	const curve: r.CurveShape = {
		minRadius,
		maxRadius,
		feather,
	};

	appendTrail(ctxStack, pos, quad[0], color, curve);
	appendTrail(ctxStack, pos, quad[1], color, curve);
	appendTrail(ctxStack, pos, quad[2], color, curve);

	appendTrail(ctxStack, pos, quad[2], color, curve);
	appendTrail(ctxStack, pos, quad[3], color, curve);
	appendTrail(ctxStack, pos, quad[0], color, curve);
}

export function line(ctxStack: r.CanvasCtxStack, from: pl.Vec2, to: pl.Vec2, halfWidth: number, color: Color, feather?: r.FeatherConfig) {
	const extent = halfWidth + featherRadius(feather);
	const down = vector.relengthen(vector.rotateRight(vector.diff(to, from)), extent);
	const up = vector.negate(down);

	const curve: r.CurveShape = {
		minRadius: 0,
		maxRadius: halfWidth,
		feather,
	};

	appendTrail(ctxStack, from, up, color, curve);
	appendTrail(ctxStack, from, down, color, curve);
	appendTrail(ctxStack, to, up, color, curve);

	appendTrail(ctxStack, to, up, color, curve);
	appendTrail(ctxStack, from, down, color, curve);
	appendTrail(ctxStack, to, down, color, curve);
}

export function arc(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, minRadius: number, maxRadius: number, angle1: number, angle2: number, antiClockwise: boolean, color: Color, feather?: r.FeatherConfig) {
	const curve: r.CurveShape = {
		minRadius,
		maxRadius,
		feather,
	};

    const extent = Math.sqrt(2) * (maxRadius + featherRadius(feather)); // sqrt(2) ensures the triangle always fully enclosees the arc

	const center = vector.zero();
	const rels = new Array<pl.Vec2>();

    let currentAngle = angle1;
    for (let i = 0; i < 4; ++i) { // Maximum 4 right angle rotations
		const rel = vector.multiply(vector.fromAngle(currentAngle), extent);
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
		appendTrail(ctxStack, pos, center, color, curve);
		appendTrail(ctxStack, pos, rels[i], color, curve);
		appendTrail(ctxStack, pos, rels[i + 1], color, curve);
    }
}

function featherRadius(feather: r.FeatherConfig) {
	return feather ? feather.sigma * FeatherFactor : 0.0;
}