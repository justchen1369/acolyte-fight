precision highp float;

uniform vec2 u_scale;
uniform vec2 u_translate;

attribute vec2 a_pos;
attribute vec4 a_mask;
attribute vec2 a_rel;
attribute vec2 a_texCoord;

varying vec4 v_mask;
varying vec2 v_texCoord;

const vec2 flipVertical = vec2(1, -1);

void main() {
	gl_Position = vec4(flipVertical * ((a_pos + a_rel) * u_scale + u_translate), 0, 1);
    v_mask = a_mask;
    v_texCoord = a_texCoord;
}