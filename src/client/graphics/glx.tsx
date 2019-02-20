import Color from 'color';
import * as pl from 'planck-js';
import * as r from './render.model';
import * as vector from '../../game/vector';

import { Pixel } from '../../game/constants';

const trailFragmentShader = require('./trailFragmentShader.glsl');
const trailVertexShader = require('./trailVertexShader.glsl');

interface GlContext {
	program: WebGLProgram;

	translateUniformLocation: WebGLUniformLocation;
	scaleUniformLocation: WebGLUniformLocation;

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

	gl.viewport(0, 0, rect.width, rect.height);

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
	gl.vertexAttribPointer(context.shapeAttribLocation, 3, gl.FLOAT, false, 0, 0)

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
		yield vertex.feather;
	}
}

function initGl(gl: WebGLRenderingContext): GlContext {
	const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, trailVertexShader);
	gl.compileShader(vertexShader);

	const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, trailFragmentShader);
	gl.compileShader(fragmentShader);

	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	// Setup buffers
	const translateUniformLocation = gl.getUniformLocation(program, "u_translate");
	const scaleUniformLocation = gl.getUniformLocation(program, "u_scale");

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

export function circle(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, minRadius: number, maxRadius: number, color: Color, feather: number = 0) {
	const extent = maxRadius + feather;
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

export function line(ctxStack: r.CanvasCtxStack, from: pl.Vec2, to: pl.Vec2, width: number, color: Color, feather: number = 0) {
	const normal = vector.rotateRight(vector.unit(vector.diff(to, from)));

	const halfWidth = width / 2;
	const extent = halfWidth + feather;

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

export function arc(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, minRadius: number, maxRadius: number, angle1: number, angle2: number, antiClockwise: boolean, color: Color, feather: number = 0) {
    const extent = Math.sqrt(2) * (maxRadius + feather); // sqrt(2) ensures the triangle always fully enclosees the arc

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