/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export const PENCIL_OUTLINE_SHADER_PATH = 'src/shaders/PencilOutline.shader';

/**
 * Pure 3x3 Sobel convolution evaluator (used for deterministic unit tests and CPU validation)
 * Takes a 3x3 array of luminance values [tl, t, tr, l, c, r, bl, b, br] and returns { gx, gy, magnitude }.
 */
export function evaluateSobel3x3(kernel3x3: [
  number, number, number,
  number, number, number,
  number, number, number
]): { gx: number; gy: number; magnitude: number } {
  const [tl, t, tr, l, , r, bl, b, br] = kernel3x3;
  const gx = -1 * tl - 2 * l - 1 * bl + 1 * tr + 2 * r + 1 * br;
  const gy = -1 * tl - 2 * t - 1 * tr + 1 * bl + 2 * b + 1 * br;
  const magnitude = Math.hypot(gx, gy);
  return { gx, gy, magnitude };
}

/**
 * 1-Pixel Sobel Pencil-Outline Shader for Three.js / Viewport3D Overlay
 * Mirrors `src/shaders/PencilOutline.shader` (Godot 4 `canvas_item` screen-space Sobel filter)
 * by convolving a 3x3 1-pixel neighborhood across both luminance and RGB channels to draw
 * crisp 1-pixel graphite outlines around all objects in the 3D scene.
 */
export const SobelPencilShader = {
  name: 'PencilOutlineShader',
  shaderPath: PENCIL_OUTLINE_SHADER_PATH,
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    resolution: {
      value: new THREE.Vector2(
        typeof window !== 'undefined' ? window.innerWidth : 1280,
        typeof window !== 'undefined' ? window.innerHeight : 720
      ),
    },
    outlineThickness: { value: 1.0 },
    outlineStrength: { value: 0.82 },
    edgeThreshold: { value: 0.28 },
    graphiteTone: { value: new THREE.Color(0x2a2c33) },
    paperTint: { value: 0.04 },
    enabled: { value: true },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float outlineThickness;
    uniform float outlineStrength;
    uniform float edgeThreshold;
    uniform vec3 graphiteTone;
    uniform float paperTint;
    uniform bool enabled;
    varying vec2 vUv;

    // Perceptual Rec.601 luminance calculation
    float getLuma(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    // High-frequency pseudo-noise for authentic graphite pencil tooth/grain
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 centerColor = texture2D(tDiffuse, vUv);
      if (!enabled) {
        gl_FragColor = centerColor;
        return;
      }

      // Exact 1-pixel offset in normalized UV space (matches SCREEN_PIXEL_SIZE * outline_thickness)
      vec2 texel = (1.0 / max(resolution, vec2(1.0))) * outlineThickness;

      // 3x3 neighborhood RGB sampling around the center pixel
      vec3 cTl = texture2D(tDiffuse, vUv + vec2(-texel.x,  texel.y)).rgb;
      vec3 cT  = texture2D(tDiffuse, vUv + vec2( 0.0,      texel.y)).rgb;
      vec3 cTr = texture2D(tDiffuse, vUv + vec2( texel.x,  texel.y)).rgb;
      vec3 cL  = texture2D(tDiffuse, vUv + vec2(-texel.x,  0.0)).rgb;
      vec3 cR  = texture2D(tDiffuse, vUv + vec2( texel.x,  0.0)).rgb;
      vec3 cBl = texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y)).rgb;
      vec3 cB  = texture2D(tDiffuse, vUv + vec2( 0.0,     -texel.y)).rgb;
      vec3 cBr = texture2D(tDiffuse, vUv + vec2( texel.x, -texel.y)).rgb;

      float tl = getLuma(cTl);
      float t  = getLuma(cT);
      float tr = getLuma(cTr);
      float l  = getLuma(cL);
      float r  = getLuma(cR);
      float bl = getLuma(cBl);
      float b  = getLuma(cB);
      float br = getLuma(cBr);

      // Sobel kernel convolution (Luminance)
      // Gx = [-1 0 1, -2 0 2, -1 0 1]
      // Gy = [-1 -2 -1, 0 0 0, 1 2 1]
      float Gx = -1.0 * tl - 2.0 * l - 1.0 * bl + 1.0 * tr + 2.0 * r + 1.0 * br;
      float Gy = -1.0 * tl - 2.0 * t - 1.0 * tr + 1.0 * bl + 2.0 * b + 1.0 * br;
      float lumaEdge = sqrt(Gx * Gx + Gy * Gy);

      // Chromatic Sobel differential so iso-luminant adjacent objects receive crisp 1-pixel graphite outlines
      vec3 gxRgb = -1.0 * cTl - 2.0 * cL - 1.0 * cBl + 1.0 * cTr + 2.0 * cR + 1.0 * cBr;
      vec3 gyRgb = -1.0 * cTl - 2.0 * cT - 1.0 * cTr + 1.0 * cBl + 2.0 * cB + 1.0 * cBr;
      float chromaEdge = max(
        max(length(vec2(gxRgb.r, gyRgb.r)), length(vec2(gxRgb.g, gyRgb.g))),
        length(vec2(gxRgb.b, gyRgb.b))
      );

      float edgeMagnitude = max(lumaEdge, chromaEdge * 0.45);

      // Subtle pencil grain variation along 1-pixel edges
      float grain = hash(floor(vUv * resolution));
      float adaptiveThreshold = edgeThreshold * (0.90 + 0.20 * grain);

      // Smooth edge factor (1.0 = sharp 1px pencil line, 0.0 = clean surface)
      float edgeFactor = clamp(
        smoothstep(adaptiveThreshold, adaptiveThreshold + 0.30, edgeMagnitude) * outlineStrength,
        0.0,
        1.0
      );

      // Darken with pencil graphite color where edge is detected
      vec3 finalRgb = mix(centerColor.rgb, graphiteTone, edgeFactor);

      // Warm paper sketch grain overlay
      if (paperTint > 0.0) {
        vec3 paperTone = vec3(0.98, 0.96, 0.92) * (0.985 + 0.03 * grain);
        finalRgb = mix(finalRgb, finalRgb * paperTone, paperTint);
      }

      gl_FragColor = vec4(finalRgb, centerColor.a);
    }
  `,
};
