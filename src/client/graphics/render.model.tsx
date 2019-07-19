import * as pl from 'planck-js';
import { Float32List } from './list';
import ColTuple from './colorTuple';

export namespace GraphicsLevel {
	export const Ultimate = 4;
	export const High = 3;
	export const Normal = 2;
	export const Low = 1;
	export const Minimum = 0;
}

export interface CanvasStack {
	gl: HTMLCanvasElement;
	ui: HTMLCanvasElement;
	atlas: HTMLCanvasElement;
}

export interface CanvasCtxStack {
	sounds: AudioElement[];

	atlas: CanvasRenderingContext2D;
    gl: WebGLRenderingContext;
	ui: CanvasRenderingContext2D;
	rtx: number;

	pixel: number;
	subpixel: number;
}

export interface RenderOptions {
	targetingIndicator: boolean;
	cameraFollow: boolean;
	wheelOnRight: boolean;
	mute: boolean;
	keysToSpells: Map<string, string>;
	rebindings: KeyBindings;
	rtx: number;
	retinaMultiplier: number;
}

export interface AudioElement {
    id: string;
    sound: string;
	pos?: pl.Vec2;
	intensity?: number;
}

export interface GlContext {
	gl: WebGLRenderingContext;
	images: DrawImages;
	trails: DrawTrails;
	data: DrawDataLookup;
}

export interface Draw {
	program: WebGLProgram;
	uniforms: { [key: string]: UniformInfo };
	attribs: { [key: string]: AttribInfo };
	textures2D: Texture2DInfo[];
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

export interface Texture2DInfo {
	buffer: WebGLTexture;

	wrapS: number;
	wrapT: number;
	minFilter: number;
	magFilter: number;
}

export interface DrawDataLookup {
	images: DrawImagesData;
	trails: DrawTrailsData;
	[program: string]: DrawData;
}

export interface DrawData {
	uniforms: UniformData;
	attribs: AttributeData;
	textures2D: ImageData[]; // null means keep the same texture as last frame
	numVertices: number;
}

export interface DrawImagesData extends DrawData {
	attribs: {
		a_pos: Float32List;
		a_texCoord: Float32List;
	};
	textures2D: ImageData[];
}

export interface DrawTrailsData extends DrawData {
	attribs: {
		a_pos: Float32List;
		a_rel: Float32List;
		a_color: Float32List;
		a_fill: Float32List;
	};
}

export interface UniformData {
	[key: string]: number[];
}

export interface AttributeData {
	[key: string]: Float32List;
}

export interface Texture2DData {
	[key: string]: ImageData;
}

export interface FeatherConfig {
	sigma: number;
	alpha: number;
}

export interface DrawImages extends Draw {
	uniforms: {
		u_scale: UniformInfo;
		u_translate: UniformInfo;
		u_pixel: UniformInfo;
		u_rtx: UniformInfo;
	};
	attribs: {
		a_pos: AttribInfo;
		a_texCoord: AttribInfo;
	};
	textures2D: Texture2DInfo[];
}

export interface DrawTrails extends Draw {
	uniforms: {
		u_scale: UniformInfo;
		u_translate: UniformInfo;
		u_pixel: UniformInfo;
		u_rtx: UniformInfo;
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
	fromColor: ColTuple;
	to: pl.Vec2;
	toColor: ColTuple;
}

export interface Fill {
	color?: ColTuple;
	gradient?: Gradient;

	minRadius?: number;
	maxRadius: number;
	feather?: FeatherConfig;
}

export interface AtlasState {
	instructions: AtlasInstruction[];
	coords: Map<string, ClientRect>;
	height: number;
	width: number;
}

export type AtlasInstruction =
	AtlasTextInstruction
	| AtlasIconInstruction

export interface AtlasInstructionBase {
	id: string;
	type: string;
	height: number;
	width: number;
}

export interface AtlasTextInstruction extends AtlasInstructionBase {
	type: "text";
	text: string;
	color: string;
	font: string;
}

export interface AtlasIconInstruction extends AtlasInstructionBase {
	type: "icon";
	icon: string;
	color: string;
}
