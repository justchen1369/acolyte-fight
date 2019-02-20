uniform vec2 u_scale;
uniform vec2 u_translate;

attribute vec2 a_pos;
attribute vec2 a_rel;
attribute vec4 a_color;
attribute vec3 a_shape;

varying vec2 v_rel;
varying vec4 v_color;
varying vec3 v_shape;

vec2 flipVertical = vec2(1, -1);

void main() {
	gl_Position = vec4(flipVertical * (a_pos * u_scale + u_translate), 0, 1);
	v_rel = a_rel;
	v_color = a_color;
	v_shape = a_shape;
}