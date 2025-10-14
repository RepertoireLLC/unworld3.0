export const commonVertexShader = /* glsl */ `
  precision highp float;

  attribute float instanceIntensity;
  attribute float instanceFrequency;
  attribute float instanceCoherence;
  attribute float instanceVariability;
  attribute vec3 instanceColor;
  attribute vec3 instanceOffset;

  uniform float uTime;
  uniform float uGlobalBeat;
  uniform float uGlobalVariance;

  varying float vIntensity;
  varying float vFrequency;
  varying float vCoherence;
  varying float vVariability;
  varying vec3 vColor;
  varying vec2 vUvCoords;
  varying float vBeatMix;

  void main() {
    vec3 pos = position;
    vec2 centered = pos.xz;
    float radial = length(centered);
    float frequencyFactor = max(0.2, instanceFrequency);
    float wave = sin(uTime * frequencyFactor + uGlobalBeat * 6.28318);
    float resonance = mix(wave, cos(uTime * (frequencyFactor + instanceVariability)), clamp(instanceCoherence, 0.0, 1.0));
    float varianceInfluence = uGlobalVariance * (0.5 + instanceVariability);
    float scale = 0.7 + instanceIntensity * 1.1 + resonance * 0.3 + varianceInfluence * 0.25;

    pos.xz = normalize(centered + 0.0001) * radial * scale;
    vec3 transformed = pos + instanceOffset;

    vIntensity = instanceIntensity;
    vFrequency = frequencyFactor;
    vCoherence = instanceCoherence;
    vVariability = instanceVariability;
    vColor = instanceColor;
    vUvCoords = uv;
    vBeatMix = resonance;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;
