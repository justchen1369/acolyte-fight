import Color from 'color';
import * as pl from 'planck-js';
import * as r from './render.model';

export interface CommonUniforms {
	u_translate: r.UniformInfo;
	u_scale: r.UniformInfo;
	u_pixel: r.UniformInfo;
	u_rtx: r.UniformInfo;
}

export function compileProgram(gl: WebGLRenderingContext, vertexShaderCode: string, fragmentShaderCode: string) {
	const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
	const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	return program;
}

export function compileShader(gl: WebGLRenderingContext, type: number, code: string) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, code);
	gl.compileShader(shader);

	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (success) {
		return shader;
	}

	const error = gl.getShaderInfoLog(shader);
	console.error("Error compiling shader", type, code, error);
	gl.deleteShader(shader);

	throw "Error compiling shader";
}

export function commonUniforms(gl: WebGLRenderingContext, program: WebGLProgram): CommonUniforms {
	return {
		u_translate: {
			loc: gl.getUniformLocation(program, "u_translate"),
			type: gl.FLOAT,
			size: 2,
		},
		u_scale: {
			loc: gl.getUniformLocation(program, "u_scale"),
			type: gl.FLOAT,
			size: 2,
		},
		u_pixel: {
			loc: gl.getUniformLocation(program, "u_pixel"),
			type: gl.FLOAT,
			size: 1,
		},
		u_rtx: {
			loc: gl.getUniformLocation(program, "u_rtx"),
			type: gl.INT,
			size: 1,
		},
	};
}

export function appendVec2(data: number[], vec: pl.Vec2) {
	data.push(vec.x, vec.y);
}

export function appendColor(data: number[], color: Color) {
	data.push(color.red() / 255, color.green() / 255, color.blue() / 255, color.alpha());
}