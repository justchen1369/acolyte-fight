precision mediump float;

uniform vec2 u_scale;
uniform vec2 u_translate;
uniform float u_pixel;

attribute vec2 a_pos;
attribute vec2 a_rel;
attribute vec4 a_color;
attribute vec4 a_fill;

varying vec2 v_rel;
varying vec4 v_color;
varying vec4 v_fill;

vec2 flipVertical = vec2(1, -1);

void main() {
	gl_Position = vec4(flipVertical * ((a_pos + a_rel) * u_scale + u_translate), 0, 1);
	v_rel = a_rel;
	v_fill = a_fill;
	v_color = a_color;
}