import Color from 'color';
import * as pl from 'planck-js';
import * as r from './render.model';

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

export function appendVec2(data: number[], vec: pl.Vec2) {
	data.push(vec.x, vec.y);
}

export function appendColor(data: number[], color: Color) {
	data.push(color.red() / 255, color.green() / 255, color.blue() / 255, color.alpha());
}