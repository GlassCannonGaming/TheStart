// ====================================================================
// Godot 4.x - 1-Pixel Sobel Pencil-Outline Post-Processing Shader
// Attach this shader to a full-screen ColorRect inside a CanvasLayer
// ====================================================================

shader_type canvas_item;

uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_nearest;
uniform float edge_threshold : hint_range(0.01, 1.0) = 0.12;
uniform float outline_strength : hint_range(0.0, 2.0) = 1.0;
uniform vec4 graphite_color : source_color = vec4(0.14, 0.14, 0.17, 1.0);
uniform float paper_grain : hint_range(0.0, 0.2) = 0.05;

// Perceptual luminance calculation
float get_luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// Pseudo-noise for hand-drawn graphite tooth/jitter
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
    vec2 uv = SCREEN_UV;
    vec2 texel = SCREEN_PIXEL_SIZE; // Exact 1-pixel step in screen coordinates

    vec4 center_color = texture(SCREEN_TEXTURE, uv);

    // 3x3 Sobel neighborhood kernel
    float tl = get_luma(texture(SCREEN_TEXTURE, uv + vec2(-texel.x,  texel.y)).rgb);
    float t  = get_luma(texture(SCREEN_TEXTURE, uv + vec2( 0.0,      texel.y)).rgb);
    float tr = get_luma(texture(SCREEN_TEXTURE, uv + vec2( texel.x,  texel.y)).rgb);
    float l  = get_luma(texture(SCREEN_TEXTURE, uv + vec2(-texel.x,  0.0)).rgb);
    float r  = get_luma(texture(SCREEN_TEXTURE, uv + vec2( texel.x,  0.0)).rgb);
    float bl = get_luma(texture(SCREEN_TEXTURE, uv + vec2(-texel.x, -texel.y)).rgb);
    float b  = get_luma(texture(SCREEN_TEXTURE, uv + vec2( 0.0,     -texel.y)).rgb);
    float br = get_luma(texture(SCREEN_TEXTURE, uv + vec2( texel.x, -texel.y)).rgb);

    // Sobel gradient horizontal & vertical
    float gx = -1.0 * tl - 2.0 * l - 1.0 * bl + 1.0 * tr + 2.0 * r + 1.0 * br;
    float gy = -1.0 * tl - 2.0 * t - 1.0 * tr + 1.0 * bl + 2.0 * b + 1.0 * br;

    float edge_mag = sqrt(gx * gx + gy * gy);

    // Graphite pencil grain jitter
    float grain = hash(uv / texel);
    float adaptive_thresh = edge_threshold * (0.88 + 0.24 * grain);

    // Smoothstep edge factor
    float factor = smoothstep(adaptive_thresh, adaptive_thresh + 0.16, edge_mag) * outline_strength;

    // Darken lines with graphite tone
    vec3 out_rgb = mix(center_color.rgb, graphite_color.rgb, factor);

    if (paper_grain > 0.0) {
        vec3 paper_tone = vec3(0.98, 0.96, 0.92);
        out_rgb = mix(out_rgb, out_rgb * paper_tone, paper_grain);
    }

    COLOR = vec4(out_rgb, center_color.a);
}
