export const auraFragmentShader = /* glsl */ `
  precision highp float;

  varying float vIntensity;
  varying float vCoherence;
  varying float vVariability;
  varying vec3 vColor;
  varying vec2 vUvCoords;
  varying float vBeatMix;

  uniform float uTime;

  void main() {
    vec2 centered = vUvCoords - 0.5;
    float radius = length(centered) * 2.0;
    float fade = smoothstep(1.35, 0.0, radius);
    float breathing = sin(uTime * (0.6 + vVariability) + vBeatMix * 1.2);
    float coherenceGlow = mix(0.35, 1.0, clamp(vCoherence, 0.0, 1.0));
    float pulse = 0.5 + 0.5 * breathing;
    vec3 auraColor = mix(vColor * 0.55, vColor, pulse * coherenceGlow);
    float alpha = fade * (0.4 + vIntensity * 0.6) * coherenceGlow;

    if (alpha < 0.01) {
      discard;
    }

    gl_FragColor = vec4(auraColor, alpha);
  }
`;
