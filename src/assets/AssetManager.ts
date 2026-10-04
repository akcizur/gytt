import * as T from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

export type CharacterAsset = {
  scene: T.Group;
  animations: T.AnimationClip[];
};

export type EnvironmentAsset = {
  scene: T.Group;
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
      return this.toCharacterAsset(await this.loadGLTF(primaryUrl));
    } catch (primaryError) {
      if (!fallbackUrl) throw primaryError;
      return this.toCharacterAsset(await this.loadGLTF(fallbackUrl));
    }
  }

  async loadEnvironment(primaryUrl: string, fallbackUrl?: string): Promise<EnvironmentAsset> {
    try {
      return this.toEnvironmentAsset(await this.loadGLTF(primaryUrl));
    } catch (primaryError) {
      if (!fallbackUrl) throw primaryError;
      return this.toEnvironmentAsset(await this.loadGLTF(fallbackUrl));
    }
  }

  dispose() {
    this.cache.clear();
  }

  private toCharacterAsset(gltf: GLTF): CharacterAsset {
    const scene = gltf.scene;
    this.prepareScene(scene);
    return { scene, animations: gltf.animations };
  }

  private toEnvironmentAsset(gltf: GLTF): EnvironmentAsset {
    const scene = gltf.scene;
    this.prepareScene(scene);
    return { scene };
  }

  private prepareScene(scene: T.Group) {
    scene.traverse((object) => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
    });
  }
}
