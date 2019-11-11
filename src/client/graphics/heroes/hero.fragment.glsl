precision highp float;

uniform int u_rtx;
uniform sampler2D u_texture;

varying vec4 v_mask;
varying vec2 v_texCoord;

void main() {
   vec4 color = texture2D(u_texture, v_texCoord);
   if (color.w == 0.0) {
      discard;
   }
   color *= v_mask;

   gl_FragColor = color;
}