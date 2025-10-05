import { Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector3 } from 'three';
import type { LayerMetadata } from './types';
import type { PublicUserProfile } from '../users/types';

interface LayerInstance {
  metadata: LayerMetadata;
  shell: Mesh;
  users: InstancedMesh | null;
  targetOpacity: number;
}

export type LayerManagerEvent =
  | { type: 'layerVisibilityChanged'; layer: LayerMetadata }
  | { type: 'layerRegistered'; layer: LayerMetadata }
  | { type: 'usersUpdated'; layerId: string; count: number };

export class LayerManager {
  private scene: Group;

  private layers = new Map<string, LayerInstance>();

  private tempObject = new Object3D();

  private listeners: Set<(event: LayerManagerEvent) => void> = new Set();

  constructor(scene: Group) {
    this.scene = scene;
  }

  on(listener: (event: LayerManagerEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: LayerManagerEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  registerLayer(metadata: LayerMetadata) {
    if (this.layers.has(metadata.id)) {
      return this.updateLayer(metadata.id, metadata);
    }

    const geometry = new SphereGeometry(1, 64, 64);
    const material = new MeshStandardMaterial({
      color: new Color(metadata.color),
      transparent: true,
      opacity: metadata.visible ? metadata.opacity : 0,
      wireframe: false,
    });

    const mesh = new Mesh(geometry, material);
    mesh.name = `layer-shell-${metadata.id}`;
    mesh.renderOrder = 2;
    mesh.visible = true;

    const instance: LayerInstance = {
      metadata,
      shell: mesh,
      users: null,
      targetOpacity: metadata.visible ? metadata.opacity : 0,
    };

    this.layers.set(metadata.id, instance);
    this.scene.add(mesh);
    this.reflowLayers();
    this.emit({ type: 'layerRegistered', layer: metadata });
    return instance;
  }

  updateLayer(id: string, metadata: LayerMetadata) {
    const instance = this.layers.get(id);
    if (!instance) {
      return this.registerLayer(metadata);
    }
    instance.metadata = metadata;
    const material = instance.shell.material as MeshStandardMaterial;
    material.color = new Color(metadata.color);
    instance.targetOpacity = metadata.visible ? metadata.opacity : 0;
    instance.shell.material.transparent = true;
    this.reflowLayers();
    this.emit({ type: 'layerVisibilityChanged', layer: metadata });
    return instance;
  }

  updateUsers(layerId: string, users: PublicUserProfile[]) {
    const instance = this.layers.get(layerId);
    if (!instance) return;

    if (instance.users) {
      this.scene.remove(instance.users);
      instance.users.geometry.dispose();
    }

    if (users.length === 0) {
      instance.users = null;
      this.emit({ type: 'usersUpdated', layerId, count: 0 });
      return;
    }

    const geometry = new SphereGeometry(0.015, 8, 8);
    const material = new MeshStandardMaterial({
      color: new Color(instance.metadata.color).offsetHSL(0, 0.1, 0.2),
      emissive: new Color(instance.metadata.color),
      emissiveIntensity: 0.9,
    });

    const mesh = new InstancedMesh(geometry, material, users.length);
    mesh.name = `layer-users-${layerId}`;
    mesh.renderOrder = 3;

    const dummyMatrix = new Matrix4();

    users.forEach((user, index) => {
      const domain = user.domains.find((d) => d.domain === instance.metadata.name);
      if (!domain) return;
      const shellRadius = instance.shell.scale.x;
      const offset = new Vector3(...domain.coordinates).normalize().multiplyScalar(shellRadius + 0.12);
      this.tempObject.position.copy(offset);
      this.tempObject.scale.setScalar(1);
      this.tempObject.lookAt(new Vector3(0, 0, 0));
      this.tempObject.updateMatrix();
      dummyMatrix.copy(this.tempObject.matrix);
      mesh.setMatrixAt(index, dummyMatrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    instance.users = mesh;
    this.scene.add(mesh);
    this.emit({ type: 'usersUpdated', layerId, count: users.length });
  }

  toggleVisibility(id: string, visible: boolean) {
    const instance = this.layers.get(id);
    if (!instance) return;
    instance.metadata.visible = visible;
    instance.targetOpacity = visible ? instance.metadata.opacity : 0;
    this.emit({ type: 'layerVisibilityChanged', layer: instance.metadata });
  }

  removeLayer(id: string) {
    const instance = this.layers.get(id);
    if (!instance) return;
    this.scene.remove(instance.shell);
    instance.shell.geometry.dispose();
    (instance.shell.material as MeshStandardMaterial).dispose();
    if (instance.users) {
      this.scene.remove(instance.users);
      instance.users.geometry.dispose();
    }
    this.layers.delete(id);
    this.reflowLayers();
  }

  syncWithMetadata(nextLayers: LayerMetadata[]) {
    const nextIds = new Set(nextLayers.map((layer) => layer.id));
    Array.from(this.layers.keys()).forEach((id) => {
      if (!nextIds.has(id)) {
        this.removeLayer(id);
      }
    });
    nextLayers.forEach((layer) => this.registerLayer(layer));
  }

  private reflowLayers() {
    const ordered = Array.from(this.layers.values())
      .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
    ordered.forEach((instance, index) => {
      const radius = 1 + (index + 1) * 0.08;
      instance.shell.scale.setScalar(radius);
    });
  }

  animate(delta: number) {
    this.layers.forEach((instance) => {
      const material = instance.shell.material as MeshStandardMaterial;
      const currentOpacity = material.opacity;
      const target = instance.targetOpacity;
      if (Math.abs(currentOpacity - target) > 0.01) {
        const next = currentOpacity + (target - currentOpacity) * Math.min(delta * 4, 1);
        material.opacity = next;
      } else {
        material.opacity = target;
      }
    });
  }

  dispose() {
    this.layers.forEach((instance) => {
      this.scene.remove(instance.shell);
      instance.shell.geometry.dispose();
      (instance.shell.material as MeshStandardMaterial).dispose();
      if (instance.users) {
        this.scene.remove(instance.users);
        instance.users.geometry.dispose();
      }
    });
    this.layers.clear();
  }
}
