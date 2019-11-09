import * as pl from 'planck-js';
import * as r from './render.model';
import * as shaders from './shaders';
import * as vector from '../../game/vector';
import { Float32List } from './list';

export function initData(): r.UploadTexturesData {
    return {
        textures2D: [
            null,
        ],
    };
}

export function clearData(data: r.UploadTexturesData) {
	data.textures2D = [null];
}

export function initTextures(gl: WebGLRenderingContext): r.UploadTextures {
	return {
        textures2D: [
            {
                buffer: gl.createTexture(),
                wrapS: gl.CLAMP_TO_EDGE,
                wrapT: gl.CLAMP_TO_EDGE,
                minFilter: gl.LINEAR,
                magFilter: gl.LINEAR,
            }
        ],
	};
}

export function uploadTexture(ctxStack: r.CanvasCtxStack, image: ImageData) {
    const textureData = shaders.getContext(ctxStack.gl).textureData;
    textureData.textures2D[0] = image;
}