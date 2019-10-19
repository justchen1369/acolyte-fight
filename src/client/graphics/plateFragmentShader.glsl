precision highp float;

uniform float u_pixel;
uniform int u_rtx;
uniform int u_tick;

varying vec2 v_rel;
varying vec4 v_color;
varying vec4 v_strokeColor;
varying vec2 v_range;

void main() {
	vec4 color = vec4(v_color);

	vec4 strokeColor = v_strokeColor;
	float strokeRange = v_range[0];
	float fillRange = v_range[1];

	float radius = length(v_rel);

	if (radius > fillRange) {
		float outside = radius - fillRange;

		// Smooth
		float alpha = smoothstep(0.0, u_pixel, outside);
		color = mix(color, strokeColor, alpha);
	}

	if (radius > strokeRange) {
		float outside = radius - strokeRange;

		// Antialias
		float fade = 1.0 - smoothstep(0.0, u_pixel, outside);
		color.w *= fade;

		if (fade == 0.0) {
			discard;
		}
	}

	gl_FragColor = color;
}
