export const rippleFragmentShader = /* glsl */ `
  precision highp float;

  varying float vIntensity;
  varying float vFrequency;
  varying float vVariability;
  varying vec3 vColor;
  varying vec2 vUvCoords;
  varying float vBeatMix;

  uniform float uTime;
  uniform float uGlobalVariance;

  void main() {
    vec2 centered = vUvCoords - 0.5;
    float radius = length(centered) * 2.0;
    float ringBase = sin((radius + uTime * (0.5 + vVariability)) * (4.0 + vFrequency));
    float harmonic = cos(uTime * (1.0 + vFrequency * 0.5) + radius * 2.5);
    float ripple = smoothstep(0.35, 0.0, abs(ringBase - radius));
    float shimmer = mix(0.2, 1.0, clamp(vIntensity + vBeatMix * 0.5, 0.0, 1.2));
    float variance = 1.0 + uGlobalVariance * 0.8;

    vec3 baseColor = vec3(vColor.r, vColor.g, 1.0) + vec3(0.0001);
    vec3 colorShift = normalize(baseColor) * (0.6 + 0.4 * harmonic * variance);
    vec3 finalColor = mix(colorShift, vColor, 0.55);
    float alpha = ripple * shimmer;

    if (alpha < 0.01) {
      discard;
    }

    gl_FragColor = vec4(finalColor, alpha);
  }
`;
