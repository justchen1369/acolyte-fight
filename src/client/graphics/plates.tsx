import * as pl from 'planck-js';
import * as r from './render.model';
import * as shaders from './shaders';
import * as vector from '../../game/vector';
import { Float32List } from './list';
import ColTuple from './colorTuple';

const FeatherFactor = 5; // Render up to this radius to ensure the Gaussian blur reaches close to zero
const plateFragmentShader = require('./plateFragmentShader.glsl');
const plateVertexShader = require('./plateVertexShader.glsl');

const vectorZero = vector.zero();
const quad = [
	0 * vector.Tau / 4,
	1 * vector.Tau / 4,
	2 * vector.Tau / 4,
	3 * vector.Tau / 4,
];

export function initData(): r.DrawPlatesData {
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

export function initPlates(gl: WebGLRenderingContext): r.DrawPlates {
	const program = shaders.compileProgram(gl, plateVertexShader, plateFragmentShader);
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

function appendTrail(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, angle: number, radius: number, fill: r.TrailFill) {
    let color: ColTuple = fill.color;
    if (fill.gradient) {
		const gradient = fill.gradient;
		const diff = vector.fromAngle(angle, radius).add(pos).sub(gradient.anchor); // Diff between anchor point and this point
		const offset = diff.length() * Math.cos(vector.angle(diff) - gradient.angle); // Offset when projected onto the gradient axis
		const alpha = (offset - gradient.fromExtent) / Math.max(1e-9, gradient.toExtent - gradient.fromExtent);

        const mix = Math.min(1, Math.max(0, alpha));
        color = gradient.fromColor.clone().mix(gradient.toColor, mix);
    }

    const trails = shaders.getContext(ctxStack.gl).data.trails;
	shaders.appendVec2(trails.attribs.a_pos, pos);
	shaders.appendAngleRadius(trails.attribs.a_rel, angle, radius);
	shaders.appendColTuple(trails.attribs.a_color, color);
	appendCurveShape(trails.attribs.a_fill, fill);
	++trails.numVertices;
}

export function circlePlate(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, fill: r.TrailFill) {
	// sqrt(2) because the shortest point on the edge of the quad has to fully enclose the radius of the circle
	const extent = Math.sqrt(2) * calculateExtent(ctxStack, fill);

	appendTrail(ctxStack, pos, 0 * vector.Tau / 4, extent, fill);
	appendTrail(ctxStack, pos, 1 * vector.Tau / 4, extent, fill);
	appendTrail(ctxStack, pos, 2 * vector.Tau / 4, extent, fill);

	appendTrail(ctxStack, pos, 2 * vector.Tau / 4, extent, fill);
	appendTrail(ctxStack, pos, 3 * vector.Tau / 4, extent, fill);
	appendTrail(ctxStack, pos, 0 * vector.Tau / 4, extent, fill);
}

export function convexPlate(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, points: pl.Vec2[], rotate: number, scale: number, fill: r.TrailFill) {
	const center = vectorZero;

    for (let i = 0; i < points.length; ++i) {
        const a = points[i]; //vector.turnVectorBy(points[i], rotate).mul(scale);
        const b = points[(i + 1) % points.length]; // vector.turnVectorBy(points[(i + 1) % points.length], rotate).mul(scale);
        if ((a.x === center.x && a.y === center.x) || (b.x === center.y && b.y === center.y)) {
            // This will just draw zero-space triangles, so don't bother
            continue;
        }

		appendTrail(ctxStack, pos, 0, 0, fill);
		appendTrail(ctxStack, pos, vector.angle(a) + rotate, a.length() * scale, fill);
		appendTrail(ctxStack, pos, vector.angle(b) + rotate, b.length() * scale, fill);
    }
}

function calculateExtent(ctxStack: r.CanvasCtxStack, fill: r.TrailFill) {
    let extent = fill.maxRadius + ctxStack.subpixel;
    if (fill.feather) {
        extent += fill.feather.sigma * FeatherFactor;
    }
    return extent;
}