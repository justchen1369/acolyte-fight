precision highp float;

uniform vec2 u_scale;
uniform vec2 u_translate;

attribute vec2 a_pos;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

vec2 flipVertical = vec2(1, -1);

void main() {
	gl_Position = vec4(flipVertical * (a_pos * u_scale + u_translate), 0, 1);
    v_texCoord = a_texCoord;
}