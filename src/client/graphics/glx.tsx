import * as pl from 'planck-js';
import * as r from './render.model';
import * as heroes from './heroes';
import * as images from './images';
import * as plates from './plates';
import * as textures from './textures';
import * as trails from './trails';
import ColTuple from './colorTuple';

export { hero } from './heroes';
export { image } from './images';
export { uploadTexture } from './textures';
export { circleTrail, lineTrail, arcTrail, convexTrail } from './trails';
export { circlePlate, convexPlate } from './plates';

export function renderGl(ctxStack: r.CanvasCtxStack, worldRect: ClientRect, rect: ClientRect, background: ColTuple) {
	let context: r.GlContext = initGl(ctxStack);
	const gl = context.gl;

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.clearColor(background.r, background.g, background.b, background.a);
	gl.clear(gl.COLOR_BUFFER_BIT);

	sendTextures(context, context.textures, context.textureData);

	const uniforms: r.UniformData = {
		u_scale: [
			2 * (worldRect.width / Math.max(1, rect.width)),
			2 * (worldRect.height / Math.max(1, rect.height)),
		],
		u_translate: [
			2 * (worldRect.left / Math.max(1, rect.width)) - 1,
			2 * (worldRect.top / Math.max(1, rect.height)) - 1,
		],
		u_subpixel: [ctxStack.subpixel],
		u_pixel: [ctxStack.pixel],
		u_rtx: [ctxStack.rtx],
		u_tick: [ctxStack.tick],
	};

	runProgram(context, context.plates, uniforms, context.data.plates);
	runProgram(context, context.heroes, uniforms, context.data.heroes);
	runProgram(context, context.trails, uniforms, context.data.trails);
	runProgram(context, context.images, uniforms, context.data.images);
}

function sendTextures(context: r.GlContext, draw: r.UploadTextures, data: r.UploadTexturesData) {
	const gl = context.gl;

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
		const buffer = data.attribs[attribName].asArray();

		gl.bindAttribLocation(draw.program, 0, attribName);
		gl.enableVertexAttribArray(attrib.loc);
		gl.bindBuffer(gl.ARRAY_BUFFER, attrib.buffer);

		if (attrib.allocated && buffer.length <= attrib.allocated) {
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, buffer);
		} else {
			gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
			attrib.allocated = buffer.length;
		}

		gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, 0, 0);
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

		textures: textures.initTextures(gl),
		textureData: textures.initData(),

		heroes: heroes.initHeroes(gl),
		images: images.initImages(gl),
		trails: trails.initTrails(gl),
		plates: plates.initPlates(gl),
		data: {
			heroes: heroes.initData(),
			images: images.initData(),
			trails: trails.initData(),
			plates: plates.initData(),
		},
	};
}

export function clearGl(ctxStack: r.CanvasCtxStack) {
	const context = initGl(ctxStack);
	textures.clearData(context.textureData);
	heroes.clearData(context.data.heroes);
	images.clearData(context.data.images);
	trails.clearData(context.data.trails);
	plates.clearData(context.data.plates);
}