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

  async loadCharacter(primaryUrl: string, fallbackUrl?: string): Promise<CharacterAsset> {
    try {
      const gltf = await this.loadGLTF(primaryUrl);
      return this.toCharacterAsset(gltf);
    } catch (primaryError) {
      if (!fallbackUrl) throw primaryError;
      const gltf = await this.loadGLTF(fallbackUrl);
      return this.toCharacterAsset(gltf);
    }
  }

  dispose() {
    this.cache.clear();
  }

  private toCharacterAsset(gltf: GLTF): CharacterAsset {
    const scene = gltf.scene;
    scene.traverse((object) => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return { scene, animations: gltf.animations };
  }
}
