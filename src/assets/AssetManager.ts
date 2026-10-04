import * as T from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

export type CharacterAsset = {
  scene: T.Group;
  animations: T.AnimationClip[];
};

export class AssetManager {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<GLTF>>();

  async loadGLTF(url: string): Promise<GLTF> {
    const cached = this.cache.get(url);
    if (cached) return cached;

    const request = this.loader.loadAsync(url);
    this.cache.set(url, request);

    try {
      return await request;
    } catch (error) {
      this.cache.delete(url);
      throw error;
    }
  }

  async loadCharacter(url: string): Promise<CharacterAsset> {
    const gltf = await this.loadGLTF(url);
    const scene = gltf.scene;

    scene.traverse((object) => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    return { scene, animations: gltf.animations };
  }

  dispose() {
    for (const promise of this.cache.values()) {
      void promise.then((gltf) => this.disposeScene(gltf.scene));
    }
    this.cache.clear();
  }

  private disposeScene(root: T.Object3D) {
    root.traverse((object) => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.dispose();
    });
  }
}
