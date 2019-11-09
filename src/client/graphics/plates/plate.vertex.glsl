precision highp float;

uniform vec2 u_scale;
uniform vec2 u_translate;
uniform float u_pixel;

attribute vec2 a_pos;
attribute vec2 a_rel;
attribute vec2 a_extent;
attribute vec2 a_range;

varying vec2 v_rel;
varying vec2 v_extent;
varying vec2 v_range;

vec2 flipVertical = vec2(1, -1);

void main() {
	gl_Position = vec4(flipVertical * ((a_pos + a_rel) * u_scale + u_translate), 0, 1);
	v_rel = a_rel;
	v_extent = a_extent;
	v_range = a_range;
}