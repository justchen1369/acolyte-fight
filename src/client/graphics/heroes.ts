import * as pl from 'planck-js';
import * as r from './render.model';
import * as shaders from './shaders';
import * as vector from '../../game/vector';
import { Float32List } from './list';
import ColTuple from './colorTuple';

const heroesFragmentShader = require('./heroesFragmentShader.glsl');
const heroesVertexShader = require('./heroesVertexShader.glsl');

export function initData(): r.DrawHeroesData {
    return {
        uniforms: {
        },
        attribs: {
            a_pos: new Float32List(),
            a_rel: new Float32List(),
            a_mask: new Float32List(),
            a_texCoord: new Float32List(),
        },
        numVertices: 0,
    };
}

export function clearData(data: r.DrawData) {
	data.uniforms = {};

	for (const key in data.attribs) {
		data.attribs[key].clear();
	}

	data.numVertices = 0;
}

export function initHeroes(gl: WebGLRenderingContext): r.DrawHeroes {
	const program = shaders.compileProgram(gl, heroesVertexShader, heroesFragmentShader);
	return {
		program,
		uniforms: shaders.commonUniforms(gl, program),
		attribs: {
			a_pos: {
				loc: gl.getAttribLocation(program, "a_pos"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 2,
			},
			a_rel: {
				loc: gl.getAttribLocation(program, "a_rel"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 2,
			},
			a_mask: {
				loc: gl.getAttribLocation(program, "a_mask"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 4,
			},
			a_texCoord: {
				loc: gl.getAttribLocation(program, "a_texCoord"),
				buffer: gl.createBuffer(),
				type: gl.FLOAT,
				size: 2,
			},
		},
	};
}

function appendPoint(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, angle: number, extent: number, mask: ColTuple, texCoord: pl.Vec2) {
    const heroes = shaders.getContext(ctxStack.gl).data.heroes;
	shaders.appendVec2(heroes.attribs.a_pos, pos);
    shaders.appendAngleRadius(heroes.attribs.a_rel, angle, extent);
    shaders.appendColTuple(heroes.attribs.a_mask, mask);
	shaders.appendVec2(heroes.attribs.a_texCoord, texCoord);
	++heroes.numVertices;
}

export function hero(ctxStack: r.CanvasCtxStack, pos: pl.Vec2, angle: number, drawRadius: number, mask: ColTuple, texRect: ClientRect) {
	// sqrt(2) because the shortest point on the edge of the quad has to fully enclose the radius
	const extent = Math.sqrt(2) * drawRadius;

    // Top left triangle
    appendPoint(ctxStack, pos, (vector.Tau * 5 / 8) + angle, extent, mask, pl.Vec2(texRect.left, texRect.top));
    appendPoint(ctxStack, pos, (vector.Tau * 7 / 8) + angle, extent, mask, pl.Vec2(texRect.right, texRect.top));
    appendPoint(ctxStack, pos, (vector.Tau * 3 / 8) + angle, extent, mask, pl.Vec2(texRect.left, texRect.bottom));

    // Bottom right triangle
    appendPoint(ctxStack, pos, (vector.Tau * 3 / 8) + angle, extent, mask, pl.Vec2(texRect.left, texRect.bottom));
    appendPoint(ctxStack, pos, (vector.Tau * 7 / 8) + angle, extent, mask, pl.Vec2(texRect.right, texRect.top));
    appendPoint(ctxStack, pos, (vector.Tau * 1 / 8) + angle, extent, mask, pl.Vec2(texRect.right, texRect.bottom));
}