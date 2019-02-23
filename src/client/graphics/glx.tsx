import Color from 'color';
import * as pl from 'planck-js';
import * as r from './render.model';
import * as trails from './trails';

export { circle, line, arc } from './trails';

export function renderGl(ctxStack: r.CanvasCtxStack, worldRect: ClientRect, rect: ClientRect) {
	let context: r.GlContext = initGl(ctxStack);
	const gl = context.gl;

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	const uniforms: r.UniformData = {
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

function runProgram(gl: WebGLRenderingContext, draw: r.Draw, uniformData: r.UniformData) {
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

function setUniform(gl: WebGLRenderingContext, uniform: r.UniformInfo, data: number[]) {
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

export function initGl(ctxStack: r.CanvasCtxStack): r.GlContext {
	const gl = ctxStack.gl;
	if (!gl) {
		throw "WebGL unavailable";
	}

	let context: r.GlContext = (gl as any).context;
	if (!context) {
		context = initContext(gl);
		(gl as any).context = context;
	}
	return context;
}

function initContext(gl: WebGLRenderingContext): r.GlContext {
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	return {
		gl,
		trails: trails.initTrails(gl),
	};
}
