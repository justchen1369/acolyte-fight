import Color from 'color';
import * as pl from 'planck-js';
import * as r from './render.model';
import * as textures from './images';
import * as trails from './trails';

export { atlas, image } from './images';
export { circle, line, arc, convex } from './trails';

export function initData(): r.DrawDataLookup {
	return {
		images: textures.initData(),
		trails: trails.initData(),
	};
}

export function renderGl(ctxStack: r.CanvasCtxStack, worldRect: ClientRect, rect: ClientRect) {
	let context: r.GlContext = initGl(ctxStack);
	const gl = context.gl;

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.clearColor(0, 0, 0, 1.0);
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
		u_pixel: [ctxStack.pixel],
		u_rtx: [ctxStack.rtx],
	};

	runProgram(context, context.trails, uniforms, ctxStack.data.trails);
	runProgram(context, context.images, uniforms, ctxStack.data.images);
}

function runProgram(context: r.GlContext, draw: r.Draw, globalUniformData: r.UniformData, data: r.DrawData) {
	if (!data.numVertices) {
		// Nothing to draw
		return;
	}

	const gl = context.gl;
	gl.useProgram(draw.program);

	const localUniformData = data.uniforms;
	for (const uniformName in draw.uniforms) {
		const uniform = draw.uniforms[uniformName];
		setUniform(gl, uniform, localUniformData[uniformName] || globalUniformData[uniformName]);
	}

	for (const attribName in draw.attribs) {
		const attrib = draw.attribs[attribName];
		gl.bindAttribLocation(draw.program, 0, attribName);
		gl.enableVertexAttribArray(attrib.loc);
		gl.bindBuffer(gl.ARRAY_BUFFER, attrib.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.attribs[attribName]), gl.STATIC_DRAW);
		gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, 0, 0);
	}

	for (const textureIndex in draw.textures2D) {
		const texture = draw.textures2D[textureIndex];
		const textureData = data.textures2D[textureIndex];

		if (textureData) {
			gl.bindTexture(gl.TEXTURE_2D, texture.buffer);

			// Set the parameters so we can render any size image.
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texture.wrapS);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texture.wrapT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.minFilter);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.magFilter);

			// Upload the image into the texture.
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data.textures2D[textureIndex]);
		}
	}

	gl.drawArrays(gl.TRIANGLES, 0, data.numVertices);
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
	} else if (uniform.type === gl.INT) {
		if (uniform.size === 1) {
			gl.uniform1iv(uniform.loc, new Int32Array(data));
		} else if (uniform.size === 2) {
			gl.uniform2iv(uniform.loc, new Int32Array(data));
		} else if (uniform.size === 3) {
			gl.uniform3iv(uniform.loc, new Int32Array(data));
		} else if (uniform.size === 4) {
			gl.uniform4iv(uniform.loc, new Int32Array(data));
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
		images: textures.initImages(gl),
		trails: trails.initTrails(gl),
	};
}
