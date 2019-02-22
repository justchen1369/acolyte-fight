import Color from 'color';
import * as pl from 'planck-js';
import * as r from './render.model';
import * as vector from '../../game/vector';

import { Pixel } from '../../game/constants';

const FeatherFactor = 5; // Render up to this radius to ensure the Gaussian blur reaches close to zero
const trailFragmentShader = require('./trailFragmentShader.glsl');
const trailVertexShader = require('./trailVertexShader.glsl');

interface GlContext {
	program: WebGLProgram;

	translateUniformLocation: WebGLUniformLocation;
    scaleUniformLocation: WebGLUniformLocation;
    
    pixelUniformLocation: WebGLUniformLocation;

	posAttribLocation: number;
	posBuffer: WebGLBuffer;

	relAttribLocation: number;
	relBuffer: WebGLBuffer;

	colorAttribLocation: number;
	colorBuffer: WebGLBuffer;

	shapeAttribLocation: number;
	shapeBuffer: WebGLBuffer;
}

export function renderGl(gl: WebGLRenderingContext, vertices: r.Vertex[], worldRect: ClientRect, rect: ClientRect) {
	let context: GlContext = (gl as any).context;
	if (!context) {
		context = initGl(gl);
		(gl as any).context = context;
	}

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.useProgram(context.program);

	// World rect
	gl.uniform2fv(context.scaleUniformLocation, new Float32Array([
		2 * (worldRect.width / Math.max(1, rect.width)),
		2 * (worldRect.height / Math.max(1, rect.height)),
	]));
	gl.uniform2fv(context.translateUniformLocation, new Float32Array([
		2 * (worldRect.left / Math.max(1, rect.width)) - 1,
		2 * (worldRect.top / Math.max(1, rect.height)) - 1,
	]));
	gl.uniform1fv(context.pixelUniformLocation, new Float32Array([1 / Math.max(1, Math.min(worldRect.width, worldRect.height))]));

	// Position
	gl.enableVertexAttribArray(context.posAttribLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, context.posBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions(vertices)), gl.STATIC_DRAW);
	gl.vertexAttribPointer(context.posAttribLocation, 2, gl.FLOAT, false, 0, 0)

	// Rel
	gl.enableVertexAttribArray(context.relAttribLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, context.relBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexRels(vertices)), gl.STATIC_DRAW);
	gl.vertexAttribPointer(context.relAttribLocation, 2, gl.FLOAT, false, 0, 0)

	// Color
	gl.enableVertexAttribArray(context.colorAttribLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, context.colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors(vertices)), gl.STATIC_DRAW);
	gl.vertexAttribPointer(context.colorAttribLocation, 4, gl.FLOAT, false, 0, 0)

	// Shape
	gl.enableVertexAttribArray(context.shapeAttribLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, context.shapeBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexShapes(vertices)), gl.STATIC_DRAW);
	gl.vertexAttribPointer(context.shapeAttribLocation, 4, gl.FLOAT, false, 0, 0)

    if (vertices.length > 0) {
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length);
    }
}

function* vertexPositions(vertices: r.Vertex[]) {
	for (const vertex of vertices) {
		yield vertex.pos.x;
		yield vertex.pos.y;
	}
}

function* vertexRels(vertices: r.Vertex[]) {
	for (const vertex of vertices) {
		yield vertex.rel.x;
		yield vertex.rel.y;
	}
}

function* vertexColors(vertices: r.Vertex[]) {
	for (const vertex of vertices) {
		yield vertex.color.red() / 255;
		yield vertex.color.green() / 255;
		yield vertex.color.blue() / 255;
		yield vertex.color.alpha();
	}
}

function* vertexShapes(vertices: r.Vertex[]) {
	for (const vertex of vertices) {
		yield vertex.minRadius;
		yield vertex.maxRadius;

		if (vertex.feather) {
			yield vertex.feather.sigma;
			yield vertex.feather.alpha;
		} else {
			yield 0.0;
			yield 0.0;
		}
	}
}

function initGl(gl: WebGLRenderingContext): GlContext {
	const program = compileProgram(gl, trailVertexShader, trailFragmentShader);

	// Setup buffers
	const translateUniformLocation = gl.getUniformLocation(program, "u_translate");
	const scaleUniformLocation = gl.getUniformLocation(program, "u_scale");
	const pixelUniformLocation = gl.getUniformLocation(program, "u_pixel");

	const posAttribLocation = gl.getAttribLocation(program, "a_pos");
	const posBuffer = gl.createBuffer();

	const relAttribLocation = gl.getAttribLocation(program, "a_rel");
	const relBuffer = gl.createBuffer();

	const colorAttribLocation = gl.getAttribLocation(program, "a_color");
	const colorBuffer = gl.createBuffer();

	const shapeAttribLocation = gl.getAttribLocation(program, "a_shape");
	const shapeBuffer = gl.createBuffer();

	// Enable settings
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	return {
		program,
		translateUniformLocation,
        scaleUniformLocation,
        pixelUniformLocation,
		posAttribLocation,
		posBuffer,
		relAttribLocation,
		relBuffer,
		colorAttribLocation,
		colorBuffer,
		shapeAttribLocation,
		shapeBuffer,
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

export function circle(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, minRadius: number, maxRadius: number, color: Color, feather?: r.FeatherConfig) {
	const extent = maxRadius + featherRadius(feather);
	const topLeft: r.Vertex = {
		pos: pl.Vec2(pos.x - extent, pos.y - extent),
		rel: pl.Vec2(-extent, -extent),
		color,
		minRadius,
		maxRadius,
		feather,
	};
	const topRight: r.Vertex = {
		pos: pl.Vec2(pos.x + extent, pos.y - extent),
		rel: pl.Vec2(extent, -extent),
		color,
		minRadius,
		maxRadius,
		feather,
	};
	const bottomLeft: r.Vertex = {
		pos: pl.Vec2(pos.x - extent, pos.y + extent),
		rel: pl.Vec2(-extent, extent),
		color,
		minRadius,
		maxRadius,
		feather,
	};
	const bottomRight: r.Vertex = {
		pos: pl.Vec2(pos.x + extent, pos.y + extent),
		rel: pl.Vec2(extent, extent),
		color,
		minRadius,
		maxRadius,
		feather,
	};

	ctxStack.vertices.push(topLeft);
	ctxStack.vertices.push(bottomLeft);
	ctxStack.vertices.push(topRight);

	ctxStack.vertices.push(topRight);
	ctxStack.vertices.push(bottomLeft);
	ctxStack.vertices.push(bottomRight);
}

export function line(ctxStack: r.CanvasCtxStack, from: pl.Vec2, to: pl.Vec2, halfWidth: number, color: Color, feather?: r.FeatherConfig) {
	const normal = vector.rotateRight(vector.unit(vector.diff(to, from)));

	const extent = halfWidth + featherRadius(feather);

	const from1: r.Vertex = {
		pos: pl.Vec2(from.x - extent * normal.x, from.y - extent * normal.y),
		rel: pl.Vec2(-extent, 0),
		color,
		minRadius: 0,
		maxRadius: halfWidth,
		feather,
	};
	const from2: r.Vertex = {
		pos: pl.Vec2(from.x + extent * normal.x, from.y + extent * normal.y),
		rel: pl.Vec2(extent, 0),
		color,
		minRadius: 0,
		maxRadius: halfWidth,
		feather,
	};
	const to1: r.Vertex = {
		pos: pl.Vec2(to.x - extent * normal.x, to.y - extent * normal.y),
		rel: pl.Vec2(-extent, 0),
		color,
		minRadius: 0,
		maxRadius: halfWidth,
		feather,
	};
	const to2: r.Vertex = {
		pos: pl.Vec2(to.x + extent * normal.x, to.y + extent * normal.y),
		rel: pl.Vec2(extent, 0),
		color,
		minRadius: 0,
		maxRadius: halfWidth,
		feather,
	};

	ctxStack.vertices.push(to1);
	ctxStack.vertices.push(from1);
	ctxStack.vertices.push(from2);

	ctxStack.vertices.push(to1);
	ctxStack.vertices.push(from2);
	ctxStack.vertices.push(to2);
}

export function arc(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, minRadius: number, maxRadius: number, angle1: number, angle2: number, antiClockwise: boolean, color: Color, feather?: r.FeatherConfig) {
    const extent = Math.sqrt(2) * (maxRadius + featherRadius(feather)); // sqrt(2) ensures the triangle always fully enclosees the arc

	const center: r.Vertex = {
		pos,
		rel: pl.Vec2(0, 0),
		color,
		minRadius,
		maxRadius,
		feather,
    };
    const vertices = new Array<r.Vertex>();

    let currentAngle = angle1;
    for (let i = 0; i < 4; ++i) { // Maximum 4 right angle rotations
        const rel = vector.multiply(vector.fromAngle(currentAngle), extent);
        vertices.push({
            pos: vector.plus(pos, rel),
            rel,
            color,
            minRadius,
            maxRadius,
			feather,
        });

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

    for (let i = 0; i < vertices.length - 1; ++i) {
        ctxStack.vertices.push(center);
        ctxStack.vertices.push(vertices[i]);
        ctxStack.vertices.push(vertices[i + 1]);
    }
}

function featherRadius(feather: r.FeatherConfig) {
	return feather ? feather.sigma * FeatherFactor : 0.0;
}