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

	vertices: Vertex[];
}

export interface RenderOptions {
	targetingIndicator: boolean;
	wheelOnRight: boolean;
	mute: boolean;
	keysToSpells: Map<string, string>;
	rebindings: KeyBindings;
	rtx: boolean;
}

export interface Vertex {
	pos: pl.Vec2;
	rel: pl.Vec2;
	color: Color;
	minRadius: number;
	maxRadius: number;
	feather: FeatherConfig;
}

export interface FeatherConfig {
	sigma: number;
	alpha: number;
}