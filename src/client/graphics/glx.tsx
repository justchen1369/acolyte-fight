import Color from 'color';
import * as pl from 'planck-js';
import * as r from './render.model';
import * as vector from '../../game/vector';

import { Pixel } from '../../game/constants';

const FeatherFactor = 5; // Render up to this radius to ensure the Gaussian blur reaches close to zero
const trailFragmentShader = require('./trailFragmentShader.glsl');
const trailVertexShader = require('./trailVertexShader.glsl');

export interface FeatherConfig {
	sigma: number;
	alpha: number;
}

interface GlContext {
	gl: WebGLRenderingContext;
	trails: DrawTrails;
}

interface Draw {
	program: WebGLProgram;
	uniforms: { [key: string]: UniformInfo };
	attribs: { [key: string]: AttribInfo };
	numVertices: number;
}

interface DrawTrails extends Draw {
	uniforms: {
		u_scale: UniformInfo;
		u_translate: UniformInfo;
		u_pixel: UniformInfo;
	};
	attribs: {
		a_pos: AttribInfo;
		a_rel: AttribInfo;
		a_color: AttribInfo;
		a_shape: AttribInfo;
	};
}

interface UniformInfo {
	loc: WebGLUniformLocation;
	size: number; // e.g. 2
	type: number; // e.g. gl.FLOAT
}

interface AttribInfo {
	loc: number;
	buffer: WebGLBuffer;
	size: number; // e.g. vec2 -> 2
	type: number; // e.g. gl.FLOAT

	data: number[];
}

interface UniformData {
	[key: string]: number[];
}

interface CurveShape {
	minRadius: number;
	maxRadius: number;
	feather?: FeatherConfig;
}

export function renderGl(ctxStack: r.CanvasCtxStack, worldRect: ClientRect, rect: ClientRect) {
	let context: GlContext = initGl(ctxStack);
	const gl = context.gl;

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	const uniforms: UniformData = {
		u_scale: [
			2 * (worldRect.width / Math.max(1, rect.width)),
			2 * (worldRect.height / Math.max(1, rect.height)),
		],
		u_translate: [
			2 * (worldRect.left / Math.max(1, rect.width)) - 1,
			2 * (worldRect.top / Math.max(1, rect.height)) - 1,
		],
		u_pixel: [1 / Math.max(1, Math.min(worldRect.width, worldRect.height))],
	};

	runProgram(gl, context.trails, uniforms);
}

function runProgram(gl: WebGLRenderingContext, draw: Draw, uniformData: UniformData) {
	if (!draw.numVertices) {
		// Nothing to draw
		return;
	}

	gl.useProgram(draw.program);
	for (const uniformName in draw.uniforms) {
		const uniform = draw.uniforms[uniformName];
		setUniform(gl, uniform, uniformData[uniformName]);
	}
	for (const attribName in draw.attribs) {
		const attrib = draw.attribs[attribName];
		gl.enableVertexAttribArray(attrib.loc);
		gl.bindBuffer(gl.ARRAY_BUFFER, attrib.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attrib.data), gl.STATIC_DRAW);
		gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, 0, 0);

		attrib.data = [];
	}
	gl.drawArrays(gl.TRIANGLES, 0, draw.numVertices);
	draw.numVertices = 0;
}

function setUniform(gl: WebGLRenderingContext, uniform: UniformInfo, data: number[]) {
	if (uniform.type === gl.FLOAT) {
		if (uniform.size === 1) {
			gl.uniform1fv(uniform.loc, new Float32Array(data));
		} else if (uniform.size === 2) {
			gl.uniform2fv(uniform.loc, new Float32Array(data));
		} else if (uniform.size === 3) {
			gl.uniform3fv(uniform.loc, new Float32Array(data));
		} else if (uniform.size === 4) {
			gl.uniform4fv(uniform.loc, new Float32Array(data));
		} else {
			throw `Unable to handle uniform of type ${uniform.type} and size ${uniform.size}`;
		}
	} else {
		throw `Unable to handle uniform of type ${uniform.type} and size ${uniform.size}`;
	}
}

export function initGl(ctxStack: r.CanvasCtxStack): GlContext {
	const gl = ctxStack.gl;
	if (!gl) {
		throw "WebGL unavailable";
	}

	let context: GlContext = (gl as any).context;
	if (!context) {
		context = initContext(gl);
		(gl as any).context = context;
	}
	return context;
}

function initContext(gl: WebGLRenderingContext): GlContext {
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	return {
		gl,
		trails: initTrails(gl),
	};
}

function initTrails(gl: WebGLRenderingContext): DrawTrails {
	const program = compileProgram(gl, trailVertexShader, trailFragmentShader);
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
				data: [],
			},
			a_rel: {
				loc: gl.getAttribLocation(program, "a_rel"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 2,
				data: [],
			},
			a_color: {
				loc: gl.getAttribLocation(program, "a_color"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 4,
				data: [],
			},
			a_shape: {
				loc: gl.getAttribLocation(program, "a_shape"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 4,
				data: [],
			},
		},
		numVertices: 0,
	};
}

function compileProgram(gl: WebGLRenderingContext, vertexShaderCode: string, fragmentShaderCode: string) {
	const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
	const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	return program;

}

function compileShader(gl: WebGLRenderingContext, type: number, code: string) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, code);
	gl.compileShader(shader);

	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (success) {
		return shader;
	}

	const error = gl.getShaderInfoLog(shader);
	console.error("Error compiling shader", type, code, error);
	gl.deleteShader(shader);

	throw "Error compiling shader";
}

function appendVec2(data: number[], vec: pl.Vec2) {
	data.push(vec.x, vec.y);
}

function appendColor(data: number[], color: Color) {
	data.push(color.red() / 255, color.green() / 255, color.blue() / 255, color.alpha());
}

function appendCurveShape(data: number[], curve: CurveShape) {
	data.push(curve.minRadius, curve.maxRadius);

	if (curve.feather) {
		data.push(curve.feather.sigma, curve.feather.alpha);
	} else {
		data.push(0, 0);
	}
}

function appendTrail(trails: DrawTrails, pos: pl.Vec2, rel: pl.Vec2, color: Color, curve: CurveShape) {
	appendVec2(trails.attribs.a_pos.data, vector.plus(pos, rel));
	appendVec2(trails.attribs.a_rel.data, rel);
	appendColor(trails.attribs.a_color.data, color);
	appendCurveShape(trails.attribs.a_shape.data, curve);
	++trails.numVertices;
}

export function circle(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, minRadius: number, maxRadius: number, color: Color, feather?: FeatherConfig) {
	const context = initGl(ctxStack);

	const extent = maxRadius + featherRadius(feather);
	const quad = [
		pl.Vec2(-extent, -extent),
		pl.Vec2(-extent, extent),
		pl.Vec2(extent, extent),
		pl.Vec2(extent, -extent),
	];

	const curve: CurveShape = {
		minRadius,
		maxRadius,
		feather,
	};

	const trails = context.trails;

	appendTrail(trails, pos, quad[0], color, curve);
	appendTrail(trails, pos, quad[1], color, curve);
	appendTrail(trails, pos, quad[2], color, curve);

	appendTrail(trails, pos, quad[2], color, curve);
	appendTrail(trails, pos, quad[3], color, curve);
	appendTrail(trails, pos, quad[0], color, curve);
}

export function line(ctxStack: r.CanvasCtxStack, from: pl.Vec2, to: pl.Vec2, halfWidth: number, color: Color, feather?: FeatherConfig) {
	const context = initGl(ctxStack);

	const extent = halfWidth + featherRadius(feather);
	const down = vector.relengthen(vector.rotateRight(vector.diff(to, from)), extent);
	const up = vector.negate(down);

	const curve: CurveShape = {
		minRadius: 0,
		maxRadius: halfWidth,
		feather,
	};

	const trails = context.trails;

	appendTrail(trails, from, up, color, curve);
	appendTrail(trails, from, down, color, curve);
	appendTrail(trails, to, up, color, curve);

	appendTrail(trails, to, up, color, curve);
	appendTrail(trails, from, down, color, curve);
	appendTrail(trails, to, down, color, curve);
}

export function arc(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, minRadius: number, maxRadius: number, angle1: number, angle2: number, antiClockwise: boolean, color: Color, feather?: FeatherConfig) {
	const context = initGl(ctxStack);

	const curve: CurveShape = {
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

	const trails = context.trails;
    for (let i = 0; i < rels.length - 1; ++i) {
		appendTrail(trails, pos, center, color, curve);
		appendTrail(trails, pos, rels[i], color, curve);
		appendTrail(trails, pos, rels[i + 1], color, curve);
    }
}

function featherRadius(feather: FeatherConfig) {
	return feather ? feather.sigma * FeatherFactor : 0.0;
}