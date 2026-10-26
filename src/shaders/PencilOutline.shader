shader_type canvas_item;
render_mode unshaded;

// Godot 4 Screen-Space 1-Pixel Sobel Graphite Pencil-Outline Shader
// Attach to a full-rect ColorRect / SubViewportContainer overlay inside Viewport3D.
uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_nearest;

uniform vec4 graphite_color : source_color = vec4(0.165, 0.173, 0.200, 1.0);
uniform float outline_thickness : hint_range(0.5, 2.0) = 1.0;
uniform float outline_strength : hint_range(0.0, 2.0) = 0.82;
uniform float edge_threshold : hint_range(0.01, 0.5) = 0.28;
uniform float paper_tint : hint_range(0.0, 0.25) = 0.04;
uniform bool enabled = true;

// Perceptual Rec.601 luminance
float get_luma(vec3 rgb) {
	return dot(rgb, vec3(0.299, 0.587, 0.114));
}

//Deterministic 2D hash for fine graphite pencil tooth along 1-pixel edges
float pencil_hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
	vec4 center_col = texture(screen_texture, SCREEN_UV);

	if (!enabled) {
		COLOR = center_col;
	} else {
		// Exact 1-pixel step in screen UV coordinates
		vec2 texel = SCREEN_PIXEL_SIZE * outline_thickness;

		// Sample 3x3 neighborhood around SCREEN_UV
		vec3 c_tl = texture(screen_texture, SCREEN_UV + vec2(-texel.x,  texel.y)).rgb;
		vec3 c_t  = texture(screen_texture, SCREEN_UV + vec2( 0.0,      texel.y)).rgb;
		vec3 c_tr = texture(screen_texture, SCREEN_UV + vec2( texel.x,  texel.y)).rgb;
		vec3 c_l  = texture(screen_texture, SCREEN_UV + vec2(-texel.x,  0.0)).rgb;
		vec3 c_r  = texture(screen_texture, SCREEN_UV + vec2( texel.x,  0.0)).rgb;
		vec3 c_bl = texture(screen_texture, SCREEN_UV + vec2(-texel.x, -texel.y)).rgb;
		vec3 c_b  = texture(screen_texture, SCREEN_UV + vec2( 0.0,     -texel.y)).rgb;
		vec3 c_br = texture(screen_texture, SCREEN_UV + vec2( texel.x, -texel.y)).rgb;

		float tl = get_luma(c_tl);
		float t  = get_luma(c_t);
		float tr = get_luma(c_tr);
		float l  = get_luma(c_l);
		float r  = get_luma(c_r);
		float bl = get_luma(c_bl);
		float b  = get_luma(c_b);
		float br = get_luma(c_br);

		// 3x3 Sobel horizontal and vertical gradient kernels
		// Gx = [-1  0  1, -2  0  2, -1  0  1]
		// Gy = [-1 -2 -1,  0  0  0,  1  2  1]
		float gx_luma = -1.0 * tl - 2.0 * l - 1.0 * bl + 1.0 * tr + 2.0 * r + 1.0 * br;
		float gy_luma = -1.0 * tl - 2.0 * t - 1.0 * tr + 1.0 * bl + 2.0 * b + 1.0 * br;
		float luma_edge = sqrt(gx_luma * gx_luma + gy_luma * gy_luma);

		// Chromatic Sobel differential so iso-luminant adjacent objects still receive a 1px outline
		vec3 gx_rgb = -1.0 * c_tl - 2.0 * c_l - 1.0 * c_bl + 1.0 * c_tr + 2.0 * c_r + 1.0 * c_br;
		vec3 gy_rgb = -1.0 * c_tl - 2.0 * c_t - 1.0 * c_tr + 1.0 * c_bl + 2.0 * c_b + 1.0 * c_br;
		float chroma_edge = max(max(length(vec2(gx_rgb.r, gy_rgb.r)), length(vec2(gx_rgb.g, gy_rgb.g))), length(vec2(gx_rgb.b, gy_rgb.b)));

		float edge_magnitude = max(luma_edge, chroma_edge * 0.45);

		// Modulate threshold slightly with pixel-level graphite tooth noise
		vec2 pixel_coord = floor(SCREEN_UV / max(SCREEN_PIXEL_SIZE, vec2(0.00001)));
		float grain = pencil_hash(pixel_coord);
		float adaptive_threshold = edge_threshold * (0.90 + 0.20 * grain);

		float edge_factor = smoothstep(adaptive_threshold, adaptive_threshold + 0.30, edge_magnitude) * outline_strength;
		edge_factor = clamp(edge_factor, 0.0, 1.0);

		vec3 sketched_rgb = mix(center_col.rgb, graphite_color.rgb, edge_factor);

		// Subtle warm sketch-paper tooth across flat surfaces
		if (paper_tint > 0.0) {
			vec3 warm_paper = vec3(0.98, 0.96, 0.92) * (0.985 + 0.03 * grain);
			sketched_rgb = mix(sketched_rgb, sketched_rgb * warm_paper, paper_tint);
		}

		COLOR = vec4(sketched_rgb, center_col.a);
	}
}
