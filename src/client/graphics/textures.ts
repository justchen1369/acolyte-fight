import * as pl from 'planck-js';
import * as r from './render.model';
import * as shaders from './shaders';
import * as vector from '../../game/vector';
import { Float32List } from './list';

export function initData(): r.UploadTexturesData {
    return {
        textures2D: [
            null,
            null,
        ],
        states2D: [
            null,
            null,
        ],
    };
}

export function clearData(data: r.UploadTexturesData) {
    data.textures2D = [null, null];
    // don't clear data.states2D
}

export function initTextures(gl: WebGLRenderingContext): r.UploadTextures {
	return {
        textures2D: [
            { // Images
                buffer: gl.createTexture(),
                wrapS: gl.CLAMP_TO_EDGE,
                wrapT: gl.CLAMP_TO_EDGE,
                minFilter: gl.LINEAR,
                magFilter: gl.LINEAR,
            },
            { // Text
                buffer: gl.createTexture(),
                wrapS: gl.CLAMP_TO_EDGE,
                wrapT: gl.CLAMP_TO_EDGE,
                minFilter: gl.NEAREST,
                magFilter: gl.NEAREST,
            }
        ],
	};
}

export function getState(ctxStack: r.CanvasCtxStack, texture: r.Texture) {
    const textureData = shaders.getContext(ctxStack.gl).textureData;
    return textureData.states2D[texture];
}

export function uploadTexture(ctxStack: r.CanvasCtxStack, image: ImageData, state: r.AtlasState, texture: r.Texture) {
    const textureData = shaders.getContext(ctxStack.gl).textureData;
    textureData.textures2D[texture] = image;
    textureData.states2D[texture] = state;
}