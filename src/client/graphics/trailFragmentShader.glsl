precision mediump float;

uniform float u_pixel;

varying vec2 v_rel;
varying vec4 v_color;
varying vec4 v_shape;

void main() {
	vec4 color = vec4(v_color);

	float minRadius = v_shape.x;
	float maxRadius = v_shape.y;
	float feather = v_shape.z;
	float featherAlpha = v_shape.w;

	float radius = sqrt(dot(v_rel, v_rel));
	float outside = max(
		max(0.0, radius - maxRadius),
		max(0.0, minRadius - radius)
	);

	if (outside > 0.0) {
		float fade = 1.0 - smoothstep(0.0, u_pixel, outside); // Antialias

		if (feather > 0.0) {
			// Gaussian blur
			fade = max(fade, featherAlpha * exp(-(outside * outside) / (2.0 * feather * feather)));
		}

		color.w *= fade;
	}

	gl_FragColor = color;
}