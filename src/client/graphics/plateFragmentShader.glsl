precision highp float;

uniform float u_subpixel;
uniform float u_pixel;
uniform int u_rtx;
uniform int u_tick;

varying vec2 v_draw;
varying vec2 v_rel;
varying vec4 v_color;
varying vec4 v_strokeColor;
varying vec2 v_range;

#define HexColSize 10.0	
#define HexRowSize 7.0	
#define HexTopProportion 0.577	
#define HexHalfProportion (HexTopProportion / 2.0)	
#define Hex1 (0.5 - HexHalfProportion)	

// Vertical hexagons - pointy end at the top
float isHexEdge(vec2 p) {
	float hexRowSize = 2.0 * u_pixel * HexRowSize; // Two quads per hex down so that it tesselates
	float row = mod(p.y, hexRowSize) / (hexRowSize);

	float hexColSize = u_pixel * HexColSize; // One squad per hex across so that it tesselates
	float col = mod(p.x, hexColSize) / (hexColSize);

	float halfCol = 1.0 - 2.0 * abs(col - 0.5); // 0.0 (side col) - 1.0 (middle col)
	float hexRow1 = mix(Hex1 / 2.0, -Hex1 / 2.0, halfCol);
	float hexRow2 = mix((1.0 - Hex1) / 2.0, (1.0 + Hex1) / 2.0, halfCol);

	float rowDist = abs(row - hexRow1); // Check against first
	rowDist = min(rowDist, abs(row - (hexRow1 + 1.0))); // Check against first wrapped
	rowDist = min(rowDist, abs(row - hexRow2)); // Check against second

	float result = 0.0;
	result = max(result, smoothstep(u_subpixel, 0.0, rowDist * hexRowSize));

	float col1Dist = abs(col);
	if (col1Dist * hexColSize <= u_subpixel) {
		if (hexRow1 <= row && row <= hexRow2) {
			result = max(result, smoothstep(u_subpixel, 0.0, col1Dist * hexColSize));
		}
	}
	
	float col2Dist = abs(col - 0.5);
	if (col2Dist * hexColSize <= u_subpixel) {
		if (hexRow2 <= row && row <= (hexRow1 + 1.0)) {
			result = max(result, smoothstep(u_subpixel, 0.0, col2Dist * hexColSize));
		}
	}	

	return result;
}

void main() {
	vec4 color = vec4(v_color);

	vec4 strokeColor = v_strokeColor;
	float strokeRange = v_range[0];
	float fillRange = v_range[1];

	float radius = length(v_rel);

	if (radius > fillRange) {
		float outside = radius - fillRange;

		// Smooth
		float alpha = smoothstep(0.0, u_subpixel, outside);
		color = mix(color, strokeColor, alpha);
	} else {
		float hexEdge = isHexEdge(v_draw);
		color.rgb -= hexEdge * 0.25 * color.rgb;	
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
