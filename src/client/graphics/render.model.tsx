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

	pixel: number;
	data: DrawDataLookup;
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
}

export interface DrawDataLookup {
	trails: DrawTrailsData;
}

export interface DrawData {
	uniforms: UniformData;
	attribs: AttributeData;
	numVertices: number;
}

export interface DrawTrailsData extends DrawData {
	attribs: {
		a_pos: number[];
		a_rel: number[];
		a_color: number[];
		a_fill: number[];
	};
}

export interface UniformData {
	[key: string]: number[];
}

export interface AttributeData {
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
		a_fill: AttribInfo;
	};
}

export interface Gradient {
	from: pl.Vec2;
	fromColor: Color;
	to: pl.Vec2;
	toColor: Color;
}

export interface Fill {
	color?: Color;
	gradient?: Gradient;

	minRadius?: number;
	maxRadius: number;
	feather?: FeatherConfig;
}