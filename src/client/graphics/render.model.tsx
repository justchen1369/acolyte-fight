import * as pl from 'planck-js';
import { Float32List } from './list';
import ColTuple from './colorTuple';
import { AudioElement } from '../audio/audio.model';
export { AudioElement } from '../audio/audio.model';

export namespace GraphicsLevel {
	export const Maximum = 5;
	export const Ultra = 4; // Blooms
	export const High = 3; // Particles
	export const Medium = 2;
	export const Low = 1;
}

export namespace Graphics {
    export const Auto = "auto";
    export const Maximum = "maximum";
    export const Ultra = "ultra";
    export const High = "high";
    export const Medium = "medium";
    export const Low = "low";
}

export function isAutoGraphics(graphics: number) {
	return !graphics;
}

export function formatGraphics(graphics: number): string {
    switch (graphics) {
        case GraphicsLevel.Maximum: return Graphics.Maximum;
        case GraphicsLevel.Ultra: return Graphics.Ultra;
        case GraphicsLevel.High: return Graphics.High;
        case GraphicsLevel.Medium: return Graphics.Medium;
        case GraphicsLevel.Low: return Graphics.Low;
        default: return Graphics.Auto;
    }
}

export function parseGraphics(graphics: string): number {
    switch (graphics) {
        case Graphics.Maximum: return GraphicsLevel.Maximum;
        case Graphics.Ultra: return GraphicsLevel.Ultra;
        case Graphics.High: return GraphicsLevel.High;
        case Graphics.Medium: return GraphicsLevel.Medium;
        case Graphics.Low: return GraphicsLevel.Low;
        default: return null;
    }
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
	tick: number;
}

export interface RenderOptions {
	targetingIndicator: boolean;
	cameraFollow?: boolean;
	hideMap?: boolean;
	wheelOnRight?: boolean;
	keysToSpells?: Map<string, string>;
	rebindings: KeyBindings;
	rtx: number;
	retinaMultiplier: number;
	customizingSpells?: boolean;
}

export interface GlContext {
	gl: WebGLRenderingContext;
	images: DrawImages;
	trails: DrawTrails;
	plates: DrawPlates;
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
	allocated?: number;
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
	plates: DrawPlatesData;
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

export interface DrawPlatesData extends DrawData {
	attribs: {
		a_draw: Float32List;
		a_rel: Float32List;
		a_color: Float32List;
		a_strokeColor: Float32List;
		a_range: Float32List;
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
		u_subpixel: UniformInfo;
		u_pixel: UniformInfo;
		u_rtx: UniformInfo;
		u_tick: UniformInfo;
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
		u_subpixel: UniformInfo;
		u_pixel: UniformInfo;
		u_rtx: UniformInfo;
		u_tick: UniformInfo;
	};
	attribs: {
		a_pos: AttribInfo;
		a_rel: AttribInfo;
		a_color: AttribInfo;
		a_fill: AttribInfo;
	};
}

export interface DrawPlates extends Draw {
	uniforms: {
		u_scale: UniformInfo;
		u_translate: UniformInfo;
		u_subpixel: UniformInfo;
		u_pixel: UniformInfo;
		u_rtx: UniformInfo;
		u_tick: UniformInfo;
	};
	attribs: {
		a_draw: AttribInfo;
		a_rel: AttribInfo;
		a_color: AttribInfo;
		a_strokeColor: AttribInfo;
		a_range: AttribInfo;
	};
}

export interface TrailGradient {
	angle: number;
	anchor: pl.Vec2;
	fromExtent: number;
	fromColor: ColTuple;
	toExtent: number;
	toColor: ColTuple;
}

export interface TrailFill {
	color?: ColTuple;
	gradient?: TrailGradient;

	minRadius?: number;
	maxRadius: number;
	feather?: FeatherConfig;
}

export interface PlateFill {
	radius: number;
	color: ColTuple;

	stroke: number;
	strokeColor: ColTuple;
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
