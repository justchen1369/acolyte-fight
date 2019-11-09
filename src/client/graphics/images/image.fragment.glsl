precision highp float;

uniform int u_rtx;
uniform sampler2D u_image;

varying vec2 v_texCoord;

void main() {
   vec4 color = texture2D(u_image, v_texCoord);
   if (color.w == 0.0) {
      discard;
   }
   gl_FragColor = color;
}