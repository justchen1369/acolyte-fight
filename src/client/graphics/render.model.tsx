import Color from 'color';
import * as pl from 'planck-js';

export interface CanvasStack {
	background: HTMLCanvasElement;
	glows: HTMLCanvasElement;
	canvas: HTMLCanvasElement;
	gl: HTMLCanvasElement;
	ui: HTMLCanvasElement;
	cursor: HTMLCanvasElement;
}

export interface CanvasCtxStack {
	background: CanvasRenderingContext2D;
	glows: CanvasRenderingContext2D;
	canvas: CanvasRenderingContext2D;
    gl: WebGLRenderingContext;
	ui: CanvasRenderingContext2D;
	rtx: boolean;
}

export interface RenderOptions {
	targetingIndicator: boolean;
	wheelOnRight: boolean;
	mute: boolean;
	keysToSpells: Map<string, string>;
	rebindings: KeyBindings;
	rtx: boolean;
}

export interface GlContext {
	gl: WebGLRenderingContext;
	trails: DrawTrails;
}

export interface Draw {
	program: WebGLProgram;
	uniforms: { [key: string]: UniformInfo };
	attribs: { [key: string]: AttribInfo };
	numVertices: number;
}

export interface UniformInfo {
	loc: WebGLUniformLocation;
	size: number; // e.g. 2
	type: number; // e.g. gl.FLOAT
}

export interface AttribInfo {
	loc: number;
	buffer: WebGLBuffer;
	size: number; // e.g. vec2 -> 2
	type: number; // e.g. gl.FLOAT

	data: number[];
}

export interface UniformData {
	[key: string]: number[];
}

export interface FeatherConfig {
	sigma: number;
	alpha: number;
}

export interface DrawTrails extends Draw {
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

export interface CurveShape {
	minRadius: number;
	maxRadius: number;
	feather?: FeatherConfig;
}