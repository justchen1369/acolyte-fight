precision mediump float;

uniform float u_pixel;

varying vec2 v_rel;
varying vec4 v_color;
varying vec3 v_shape;

void main() {
	vec4 color = vec4(v_color);

	float minRadius = v_shape.x;
	float maxRadius = v_shape.y;
	float feather = v_shape.z;

	float radius = sqrt(dot(v_rel, v_rel));
	float outside = max(
		max(0.0, radius - maxRadius),
		max(0.0, minRadius - radius)
	);

	// Antialias
	color.w *= 1.0 - smoothstep(0.0, u_pixel, outside);

	gl_FragColor = color;
}