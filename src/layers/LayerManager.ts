import {
  Color,
  ColorRepresentation,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';

export const CORE_SPHERE_RADIUS = 3;

export interface LayerConfig {
  id: string;
  label?: string;
  color?: ColorRepresentation;
  opacity?: number;
  visible?: boolean;
  nodeScale?: number;
  maxUsers?: number;
}

export interface LayerInstance {
  id: string;
  group: Group;
  visible: boolean;
  opacity: number;
  nodeScale: number;
  color: Color;
  material: MeshBasicMaterial;
  instancedMesh: InstancedMesh | null;
  maxUsers?: number;
}

export interface LayerUserNode {
  direction: Vector3;
  radiusOffset?: number;
  color?: ColorRepresentation;
  opacity?: number;
  visible?: boolean;
  scale?: number;
}

interface LayerManagerOptions {
  radius?: number;
  defaultNodeScale?: number;
}

export class LayerManager {
  private readonly layers = new Map<string, LayerInstance>();
  private readonly root: Group;
  private readonly nodeGeometry: SphereGeometry;
  private readonly tempObject = new Object3D();
  private readonly radius: number;
  private readonly defaultNodeScale: number;

  constructor(root: Group, options: LayerManagerOptions = {}) {
    this.root = root;
    this.radius = options.radius ?? CORE_SPHERE_RADIUS;
    this.defaultNodeScale = options.defaultNodeScale ?? 0.12;
    this.nodeGeometry = new SphereGeometry(1, 16, 16);
  }

  getLayer(id: string): LayerInstance | undefined {
    return this.layers.get(id);
  }

  registerLayer(config: LayerConfig): LayerInstance {
    const existing = this.layers.get(config.id);
    if (existing) {
      return existing;
    }

    const group = new Group();
    group.name = `layer-${config.id}`;
    this.root.add(group);

    const color = new Color(config.color ?? 0xffffff);
    const material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: config.opacity ?? 1,
      depthWrite: false,
    });

    const instance: LayerInstance = {
      id: config.id,
      group,
      visible: config.visible ?? true,
      opacity: config.opacity ?? 1,
      nodeScale: config.nodeScale ?? this.defaultNodeScale,
      color,
      material,
      instancedMesh: null,
      maxUsers: config.maxUsers,
    };

    instance.group.visible = instance.visible;
    this.layers.set(config.id, instance);
    return instance;
  }

  unregisterLayer(id: string): void {
    const instance = this.layers.get(id);
    if (!instance) {
      return;
    }

    this.disposeInstancedMesh(instance);
    instance.material.dispose();
    this.root.remove(instance.group);
    this.layers.delete(id);
  }

  setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    layer.visible = visible;
    layer.group.visible = visible;
    if (layer.instancedMesh) {
      layer.instancedMesh.visible = visible;
    }
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    layer.opacity = opacity;
    layer.material.opacity = opacity;
    layer.material.transparent = opacity < 1;
    if (layer.instancedMesh) {
      const meshMaterial = layer.instancedMesh.material as MeshBasicMaterial;
      meshMaterial.opacity = opacity;
      meshMaterial.transparent = opacity < 1;
    }
  }

  reflowLayers(): void {
    this.layers.forEach((layer) => {
      if (layer.instancedMesh) {
        layer.instancedMesh.visible = layer.visible && layer.opacity > 0;
      }
    });
  }

  updateUsers(id: string, nodes: LayerUserNode[]): void {
    const layer = this.layers.get(id);
    if (!layer) {
      return;
    }

    if (!nodes.length) {
      if (layer.instancedMesh) {
        layer.instancedMesh.visible = false;
      }
      return;
    }

    const count = layer.maxUsers ? Math.min(nodes.length, layer.maxUsers) : nodes.length;
    const instancedMesh = this.ensureInstancedMesh(layer, count);
    instancedMesh.count = count;
    instancedMesh.visible = layer.visible && layer.opacity > 0;

    const baseColor = layer.color.clone();
    const color = baseColor.clone();
    const instanceOpacities: number[] = new Array(count).fill(0);

    nodes.slice(0, count).forEach((node, index) => {
      const effectiveOpacity = layer.opacity * (node.opacity ?? 1);
      if (node.visible === false || effectiveOpacity === 0) {
        this.tempObject.position.set(0, 0, 0);
        this.tempObject.scale.setScalar(0);
        this.tempObject.updateMatrix();
        instancedMesh.setMatrixAt(index, this.tempObject.matrix);
        if (instancedMesh.instanceColor) {
          instancedMesh.setColorAt(index, color.setScalar(0));
        }
        instanceOpacities[index] = 0;
        return;
      }

      const radius = this.radius + (node.radiusOffset ?? 0);
      const direction = node.direction.clone().normalize();
      const position = direction.multiplyScalar(radius);

      const scale = layer.nodeScale * (node.scale ?? 1);

      this.tempObject.position.copy(position);
      this.tempObject.scale.setScalar(scale);
      this.tempObject.lookAt(0, 0, 0);
      this.tempObject.updateMatrix();
      instancedMesh.setMatrixAt(index, this.tempObject.matrix);

      if (instancedMesh.instanceColor) {
        const nodeColor = node.color ? color.set(node.color) : color.copy(baseColor);
        instancedMesh.setColorAt(index, nodeColor);
      }

      instanceOpacities[index] = effectiveOpacity;
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    const meshMaterial = instancedMesh.material as MeshBasicMaterial;
    meshMaterial.opacity = layer.opacity;
    meshMaterial.transparent = layer.opacity < 1;

    const hasVisibleNodes = instanceOpacities.some((value) => value > 0);
    instancedMesh.visible = layer.visible && meshMaterial.opacity > 0 && hasVisibleNodes;
    instancedMesh.userData.instanceOpacities = instanceOpacities;
  }

  dispose(): void {
    this.layers.forEach((layer) => this.unregisterLayer(layer.id));
    this.nodeGeometry.dispose();
  }

  private ensureInstancedMesh(layer: LayerInstance, count: number): InstancedMesh {
    if (layer.instancedMesh && layer.instancedMesh.count === count) {
      return layer.instancedMesh;
    }

    if (layer.instancedMesh) {
      this.disposeInstancedMesh(layer);
    }

    const material = layer.material.clone();
    const instancedMesh = new InstancedMesh(this.nodeGeometry, material, count || 1);
    instancedMesh.count = count || 1;
    instancedMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    instancedMesh.frustumCulled = false;

    layer.instancedMesh = instancedMesh;
    layer.group.add(instancedMesh);

    return instancedMesh;
  }

  private disposeInstancedMesh(layer: LayerInstance): void {
    const { instancedMesh } = layer;
    if (!instancedMesh) {
      return;
    }

    layer.group.remove(instancedMesh);
    instancedMesh.material.dispose();
    layer.instancedMesh = null;
  }
}
