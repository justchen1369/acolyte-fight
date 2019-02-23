precision mediump float;

uniform float u_pixel;

varying vec2 v_rel;
varying vec4 v_color;
varying vec4 v_fill;

void main() {
	vec4 color = vec4(v_color);

	float minRadius = v_fill.x;
	float maxRadius = v_fill.y;
	float feather = v_fill.z;
	float featherAlpha = v_fill.w;

	float radius = length(v_rel);
	float outside = max(
		max(0.0, radius - maxRadius),
		max(0.0, minRadius - radius)
	);

	if (outside > 0.0) {
		// Antialias
		float fade = 1.0 - smoothstep(0.0, u_pixel, outside);

		if (feather > 0.0) {
			// Gaussian blur
			fade = max(fade, featherAlpha * exp(-(outside * outside) / (2.0 * feather * feather)));
		}

		color.w *= fade;
	}

	gl_FragColor = color;
}