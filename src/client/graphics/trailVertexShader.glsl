precision mediump float;

uniform vec2 u_scale;
uniform vec2 u_translate;
uniform float u_pixel;

attribute vec2 a_pos;
attribute vec2 a_rel;
attribute vec4 a_color;
attribute vec4 a_shape;

varying vec2 v_rel;
varying vec4 v_color;
varying vec4 v_shape;

vec2 flipVertical = vec2(1, -1);

void main() {
	gl_Position = vec4(flipVertical * (a_pos * u_scale + u_translate), 0, 1);
	v_rel = a_rel;

	float minRadius = a_shape.x;
	float maxRadius = max(minRadius, a_shape.y - u_pixel / 2.0); // for anti-aliasing
	float feather = a_shape.z;
	float featherAlpha = a_shape.w;
	v_shape = vec4(minRadius, maxRadius, feather, featherAlpha);

	vec4 color = a_color;
	v_color = color;
}