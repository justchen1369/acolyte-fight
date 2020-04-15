import * as pl from 'planck-js';
import * as h from './character/character.model';
import { Float32List } from './list';
import ColTuple from '../../game/colorTuple';
import { GraphicsLevel } from '../../game/constants';
import { AudioElement } from '../audio/audio.model';

export { AudioElement } from '../audio/audio.model';
export * from './character/character.model';
export { GraphicsLevel } from '../../game/constants';

export enum Texture {
	Images = 0,
	Text = 1,
}

export namespace Graphics {
    export const Auto = "auto";
    export const Maximum = "maximum";
    export const Ultra = "ultra";
    export const High = "high";
    export const Medium = "medium";
    export const Low = "low";
    export const Minimum = "minimum";
}

export namespace Layer {
	export const Swatch = "swatch";
	export const Swelt = "swelt";
	export const Solid = "solid";
	export const Trail = "trail";
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
        case GraphicsLevel.Minimum: return Graphics.Minimum;
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
        case Graphics.Minimum: return GraphicsLevel.Minimum;
        default: return null;
    }
}

export function reduceGraphics(level: number): number {
    switch (level) {
        case GraphicsLevel.Maximum: return GraphicsLevel.Ultra;
        case GraphicsLevel.Ultra: return GraphicsLevel.High;
        case GraphicsLevel.High: return GraphicsLevel.Medium;
        case GraphicsLevel.Medium: return GraphicsLevel.Low;
        case GraphicsLevel.Low: return GraphicsLevel.Minimum;
        default: return GraphicsLevel.Minimum;
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

	mobile: boolean;

	pixel: number;
	subpixel: number;
	tick: number;
}

export interface RenderOptions {
	targetingIndicator: boolean;
	cameraFollow?: boolean;
	shake?: boolean;
	hideMap?: boolean;
	wheelOnRight?: boolean;
	keysToSpells?: Map<string, string>;
	rebindings: KeyBindings;
	rtx: number;
	retinaMultiplier: number;
	fontSizeMultiplier: number;
	customizingSpells?: boolean;
	mobile?: boolean;
}

export interface GlContext {
	gl: WebGLRenderingContext;

	textures: UploadTextures;
	textureData: UploadTexturesData;

	plates: DrawPlates;
	swatches: DrawPrimitives;
	swelts: DrawPrimitives;
	heroes: DrawHeroes;
	images: DrawImages;
	solids: DrawPrimitives;
	trails: DrawPrimitives;

	data: DrawDataLookup;
}

export interface UploadTextures {
	textures2D: Texture2DInfo[];
}

export interface UploadTexturesData {
	textures2D: ImageData[];
	states2D: AtlasState[];
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
	plates: DrawPlatesData;
	swatches: DrawPrimitivesData;
	swelts: DrawPrimitivesData;
	heroes: DrawHeroesData;
	images: DrawImagesData;
	solids: DrawPrimitivesData;
	trails: DrawPrimitivesData;
	[program: string]: DrawData;
}

export interface DrawData {
	uniforms: UniformData;
	attribs: AttributeData;
	numVertices: number;
}

export interface DrawHeroesData extends DrawData {
	uniforms: {
		u_texture: number[],
	},
	attribs: {
		a_pos: Float32List;
		a_rel: Float32List;
		a_mask: Float32List;
		a_texCoord: Float32List;
	};
}

export interface DrawImagesData extends DrawData {
	uniforms: {
		u_texture: number[],
	},
	attribs: {
		a_pos: Float32List;
		a_texCoord: Float32List;
	};
}

export interface DrawPrimitivesData extends DrawData {
	attribs: {
		a_pos: Float32List;
		a_rel: Float32List;
		a_color: Float32List;
		a_fill: Float32List;
	};
}

export interface DrawPlatesData extends DrawData {
	uniforms: {
		u_color: number[];
		u_strokeColor: number[];
		u_hexColor: number[];
		u_hexSizing: number[];
		u_hexMask: number[];
		u_hexInterval: number[];
	},
	attribs: {
		a_pos: Float32List;
		a_rel: Float32List;
		a_extent: Float32List;
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

export interface DrawHeroes extends Draw {
	uniforms: {
		u_scale: UniformInfo;
		u_translate: UniformInfo;
		u_subpixel: UniformInfo;
		u_pixel: UniformInfo;
		u_rtx: UniformInfo;
		u_tick: UniformInfo;
		u_texture: UniformInfo;
	};
	attribs: {
		a_pos: AttribInfo;
		a_rel: AttribInfo;
		a_mask: AttribInfo;
		a_texCoord: AttribInfo;
	};
}

export interface DrawImages extends Draw {
	uniforms: {
		u_scale: UniformInfo;
		u_translate: UniformInfo;
		u_subpixel: UniformInfo;
		u_pixel: UniformInfo;
		u_rtx: UniformInfo;
		u_tick: UniformInfo;
		u_texture: UniformInfo;
	};
	attribs: {
		a_pos: AttribInfo;
		a_texCoord: AttribInfo;
	};
}

export interface DrawPrimitives extends Draw {
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

		u_color: UniformInfo;
		u_strokeColor: UniformInfo;
		u_hexColor: UniformInfo;

		u_hexSizing: UniformInfo;
		u_hexMask: UniformInfo;
		u_hexInterval: UniformInfo;
	};
	attribs: {
		a_pos: AttribInfo;
		a_rel: AttribInfo;
		a_extent: AttribInfo;
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

	hex: HexConfig;
}

export interface HeroFill {
	color: ColTuple;
	gradient?: HeroGradient;
}

export interface HeroGradient {
	fromColor: ColTuple;
	toColor: ColTuple;
	angle: number;
}

export interface HexConfig {
	color: ColTuple;

	heightPixels: number;
	widthPixels: number;
	mask: number;
	interval: number;
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
	| AtlasHeroInstruction

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

export interface AtlasHeroInstruction extends AtlasInstructionBase {
	type: "hero";
	skin: h.Skin;
	radius: number;

	body?: boolean;
	glyph?: boolean;
	config?: h.CharacterConfig;
}