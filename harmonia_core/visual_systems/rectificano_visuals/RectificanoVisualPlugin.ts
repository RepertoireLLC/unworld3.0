import {
  AdditiveBlending,
  Clock,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Object3D,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
} from "three";

import type { EmotionalField, EmotionalNode } from "./types";
import { EmotionalFieldReader, type EmotionalFieldReaderOptions } from "./utils/EmotionalFieldReader";
import { auraFragmentShader } from "./shaders/auraFragment";
import { rippleFragmentShader } from "./shaders/rippleFragment";
import { commonVertexShader } from "./shaders/commonVertex";

export interface RectificanoVisualPluginOptions extends EmotionalFieldReaderOptions {
  readonly scene?: Scene;
  readonly globalScale?: number;
  readonly rippleSpeedMultiplier?: number;
  readonly autoRefreshMs?: number;
}

interface HarmoniaUniforms {
  readonly uTime: { value: number };
  readonly uGlobalBeat: { value: number };
  readonly uGlobalVariance: { value: number };
}

const DEFAULT_SCALE = 1.4;

/**
 * RectificanoVisualPlugin renders Harmonia resonance through ripples and auras.
 * It is self-contained to preserve backward compatibility with existing flows.
 */
export class RectificanoVisualPlugin {
  private readonly reader: EmotionalFieldReader;
  private readonly options: RectificanoVisualPluginOptions;
  private auraMesh: InstancedMesh | null = null;
  private rippleMesh: InstancedMesh | null = null;
  private auraMaterial: ShaderMaterial | null = null;
  private rippleMaterial: ShaderMaterial | null = null;
  private readonly dummy = new Object3D();
  private readonly clock = new Clock();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private nodes: EmotionalNode[] = [];
  private scene: Scene | null;
  private globalPulseBpm = 72;
  private globalVariance = 0.2;

  constructor(options: RectificanoVisualPluginOptions = {}) {
    this.reader = new EmotionalFieldReader(options);
    this.options = options;
    this.scene = options.scene ?? null;
  }

  async initialize(scene?: Scene): Promise<void> {
    this.scene = scene ?? this.scene;
    if (!this.scene) {
      throw new Error("RectificanoVisualPlugin requires a three.js Scene");
    }

    const field = await this.reader.read();
    this.ingestField(field);
    this.buildMeshes();

    if (this.options.autoRefreshMs && this.options.autoRefreshMs > 0) {
      this.refreshTimer = setInterval(() => {
        void this.refresh();
      }, this.options.autoRefreshMs);
    }
  }

  async refresh(): Promise<void> {
    const field = await this.reader.read(true);
    this.ingestField(field);
    this.updateMeshes();
  }

  update(): void {
    if (!this.auraMaterial || !this.rippleMaterial) {
      return;
    }

    const elapsed = this.clock.getElapsedTime();
    const beat = (elapsed * this.globalPulseBpm) / 60;
    const auraUniforms = this.auraMaterial.uniforms as HarmoniaUniforms;
    const rippleUniforms = this.rippleMaterial.uniforms as HarmoniaUniforms;

    auraUniforms.uTime.value = elapsed;
    auraUniforms.uGlobalBeat.value = beat;
    auraUniforms.uGlobalVariance.value = this.globalVariance;

    rippleUniforms.uTime.value = elapsed * (this.options.rippleSpeedMultiplier ?? 1.0);
    rippleUniforms.uGlobalBeat.value = beat;
    rippleUniforms.uGlobalVariance.value = this.globalVariance;
  }

  dispose(): void {
    this.refreshTimer && clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    this.clearMeshes();
  }

  private ingestField(field: EmotionalField): void {
    this.nodes = field.nodes;
    if (field.globalPulse?.bpm) {
      this.globalPulseBpm = field.globalPulse.bpm;
    }
    if (field.globalPulse?.variance !== undefined) {
      this.globalVariance = field.globalPulse.variance;
    }
  }

  private buildMeshes(): void {
    this.clearMeshes();

    const baseGeometry = new PlaneGeometry(1, 1, 32, 32);
    baseGeometry.rotateX(-Math.PI / 2);

    const auraGeometry = baseGeometry.clone();
    this.populateInstancedAttributes(baseGeometry, this.nodes);
    this.populateInstancedAttributes(auraGeometry, this.nodes);

    this.auraMaterial = this.createAuraMaterial();
    this.rippleMaterial = this.createRippleMaterial();

    this.auraMesh = new InstancedMesh(auraGeometry, this.auraMaterial, this.nodes.length);
    this.rippleMesh = new InstancedMesh(baseGeometry, this.rippleMaterial, this.nodes.length);

    this.configureMesh(this.auraMesh, 1.0);
    this.configureMesh(this.rippleMesh, 1.25);

    this.scene?.add(this.auraMesh);
    this.scene?.add(this.rippleMesh);
  }

  private updateMeshes(): void {
    if (!this.auraMesh || !this.rippleMesh) {
      this.buildMeshes();
      return;
    }

    this.populateInstancedAttributes(this.auraMesh.geometry as PlaneGeometry, this.nodes);
    this.populateInstancedAttributes(this.rippleMesh.geometry as PlaneGeometry, this.nodes);

    this.auraMesh.count = this.nodes.length;
    this.rippleMesh.count = this.nodes.length;

    this.configureMesh(this.auraMesh, 1.0);
    this.configureMesh(this.rippleMesh, 1.25);

    if (this.auraMaterial) {
      const auraUniforms = this.auraMaterial.uniforms as HarmoniaUniforms;
      auraUniforms.uGlobalVariance.value = this.globalVariance;
    }
    if (this.rippleMaterial) {
      const rippleUniforms = this.rippleMaterial.uniforms as HarmoniaUniforms;
      rippleUniforms.uGlobalVariance.value = this.globalVariance;
    }
  }

  private configureMesh(mesh: InstancedMesh, scaleMultiplier: number): void {
    const matrix = new Matrix4();
    const baseScale = (this.options.globalScale ?? DEFAULT_SCALE) * scaleMultiplier;

    this.nodes.forEach((node, index) => {
      this.dummy.position.set(...node.coordinates);
      const resonanceScale = baseScale * (0.65 + node.intensity * 0.9);
      this.dummy.scale.setScalar(resonanceScale);
      this.dummy.updateMatrix();
      matrix.copy(this.dummy.matrix);
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = 1;
  }

  private populateInstancedAttributes(geometry: PlaneGeometry, nodes: EmotionalNode[]): void {
    const count = nodes.length;
    const intensity = new Float32Array(count);
    const frequency = new Float32Array(count);
    const coherence = new Float32Array(count);
    const variability = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const offset = new Float32Array(count * 3);

    nodes.forEach((node, index) => {
      intensity[index] = node.intensity;
      frequency[index] = node.frequencyHz / 440;
      coherence[index] = node.coherence;
      variability[index] = node.rhythm.variability;

      const normalizedColor = new Color(node.color);
      normalizedColor.toArray(color, index * 3);

      offset.set(node.coordinates, index * 3);
    });

    geometry.setAttribute("instanceIntensity", new InstancedBufferAttribute(intensity, 1));
    geometry.setAttribute("instanceFrequency", new InstancedBufferAttribute(frequency, 1));
    geometry.setAttribute("instanceCoherence", new InstancedBufferAttribute(coherence, 1));
    geometry.setAttribute("instanceVariability", new InstancedBufferAttribute(variability, 1));
    geometry.setAttribute("instanceColor", new InstancedBufferAttribute(color, 3));
    geometry.setAttribute("instanceOffset", new InstancedBufferAttribute(offset, 3));
  }

  private createAuraMaterial(): ShaderMaterial {
    const uniforms = this.createUniforms();
    return new ShaderMaterial({
      uniforms,
      vertexShader: commonVertexShader,
      fragmentShader: auraFragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
  }

  private createRippleMaterial(): ShaderMaterial {
    const uniforms = this.createUniforms();
    return new ShaderMaterial({
      uniforms,
      vertexShader: commonVertexShader,
      fragmentShader: rippleFragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
  }

  private createUniforms(): HarmoniaUniforms {
    return {
      uTime: { value: 0 },
      uGlobalBeat: { value: 0 },
      uGlobalVariance: { value: this.globalVariance },
    } satisfies HarmoniaUniforms;
  }

  private clearMeshes(): void {
    [this.auraMesh, this.rippleMesh].forEach((mesh) => {
      if (!mesh) return;
      mesh.geometry.dispose();
      (mesh.material as ShaderMaterial).dispose();
      this.scene?.remove(mesh);
    });

    this.auraMesh = null;
    this.rippleMesh = null;
    this.auraMaterial = null;
    this.rippleMaterial = null;
  }
}
