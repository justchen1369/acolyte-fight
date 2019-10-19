precision highp float;

uniform vec2 u_scale;
uniform vec2 u_translate;
uniform float u_pixel;

attribute vec2 a_draw;
attribute vec2 a_rel;
attribute vec4 a_color;
attribute vec4 a_strokeColor;
attribute vec2 a_range;

varying vec2 v_rel;
varying vec4 v_color;
varying vec4 v_strokeColor;
varying vec2 v_range;

vec2 flipVertical = vec2(1, -1);

void main() {
	gl_Position = vec4(flipVertical * (a_draw * u_scale + u_translate), 0, 1);
	v_rel = a_rel;
	v_color = a_color;
	v_strokeColor = a_strokeColor;
	v_range = a_range;
}