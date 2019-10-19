import * as pl from 'planck-js';
import * as r from './render.model';
import * as shaders from './shaders';
import * as vector from '../../game/vector';
import { Float32List } from './list';
import ColTuple from './colorTuple';

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
            u_color: [0, 0, 0, 0],
            u_strokeColor: [0, 0, 0, 0],
            u_hexSizing: [1, 1],
            u_hexMask: [1],
        },
        attribs: {
            a_draw: new Float32List(),
            a_rel: new Float32List(),
            a_range: new Float32List(),
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
		uniforms: {
            ...shaders.commonUniforms(gl, program),
            u_color: {
                loc: gl.getUniformLocation(program, "u_color"),
                type: gl.FLOAT,
                size: 4,
            },
            u_strokeColor: {
                loc: gl.getUniformLocation(program, "u_strokeColor"),
                type: gl.FLOAT,
                size: 4,
            },
            u_hexSizing: {
                loc: gl.getUniformLocation(program, "u_hexSizing"),
                type: gl.FLOAT,
                size: 2,
            },
            u_hexMask: {
                loc: gl.getUniformLocation(program, "u_hexMask"),
                type: gl.FLOAT,
                size: 1,
            },
        },
		attribs: {
			a_draw: {
				loc: gl.getAttribLocation(program, "a_draw"),
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
			a_range: {
				loc: gl.getAttribLocation(program, "a_range"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 2,
			},
		},
        textures2D: [],
	};
}

export function circlePlate(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, fill: r.PlateFill) {
	// sqrt(2) because the shortest point on the edge of the quad has to fully enclose the radius of the circle
    const extent = Math.sqrt(2) * calculateExtent(ctxStack, fill.radius);

    const circular = true;
	appendPoint(ctxStack, pos, 0 * vector.Tau / 4, circular, extent, fill);
	appendPoint(ctxStack, pos, 1 * vector.Tau / 4, circular, extent, fill);
	appendPoint(ctxStack, pos, 2 * vector.Tau / 4, circular, extent, fill);

	appendPoint(ctxStack, pos, 2 * vector.Tau / 4, circular, extent, fill);
	appendPoint(ctxStack, pos, 3 * vector.Tau / 4, circular, extent, fill);
	appendPoint(ctxStack, pos, 0 * vector.Tau / 4, circular, extent, fill);

    applyFill(ctxStack, fill);
}

function applyFill(ctxStack: r.CanvasCtxStack, fill: r.PlateFill) {
    const plates = shaders.getContext(ctxStack.gl).data.plates;

    plates.uniforms.u_color = [...fill.color.tuple];
    plates.uniforms.u_strokeColor = [...fill.strokeColor.tuple];

    plates.uniforms.u_hexSizing = [fill.hex.widthPixels, fill.hex.heightPixels];
    plates.uniforms.u_hexMask = [fill.hex.mask];
}

function appendPoint(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, angle: number, circular: boolean, extent: number, fill: r.PlateFill) {
    const plates = shaders.getContext(ctxStack.gl).data.plates;

    const drawPos = vector.fromAngle(angle, extent).add(pos);

    shaders.appendVec2(plates.attribs.a_draw, drawPos);

    const relAngle = circular ? angle : 0;
    shaders.appendAngleRadius(plates.attribs.a_rel, relAngle, extent); // Draw polygons with same shader

    appendRanges(plates.attribs.a_range, fill);

	++plates.numVertices;
}


export function convexPlate(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, points: pl.Vec2[], rotate: number, scale: number, fill: r.PlateFill) {
	const center = vectorZero;

    const circular = false;
    for (let i = 0; i < points.length; ++i) {
        const a = points[i]; //vector.turnVectorBy(points[i], rotate).mul(scale);
        const b = points[(i + 1) % points.length]; // vector.turnVectorBy(points[(i + 1) % points.length], rotate).mul(scale);
        if ((a.x === center.x && a.y === center.x) || (b.x === center.y && b.y === center.y)) {
            // This will just draw zero-space triangles, so don't bother
            continue;
        }

		appendPoint(ctxStack, pos, 0, circular, 0, fill);
		appendPoint(ctxStack, pos, vector.angle(a) + rotate, circular, a.length() * scale, fill);
		appendPoint(ctxStack, pos, vector.angle(b) + rotate, circular, b.length() * scale, fill);
    }

    applyFill(ctxStack, fill);
}

function calculateExtent(ctxStack: r.CanvasCtxStack, radius: number) {
    let extent = radius + ctxStack.subpixel;
    return extent;
}

function appendRanges(data: Float32List, fill: r.PlateFill) {
    const strokeRange = fill.radius;
    const fillRange = Math.max(0, fill.radius - fill.stroke);

	data.push(strokeRange);
	data.push(fillRange);
}