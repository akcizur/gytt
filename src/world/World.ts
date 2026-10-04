import * as T from "three";

export class World {
  private readonly sceneObjects: T.Object3D[] = [];
  private readonly colliders: any[] = [];

  constructor(private readonly scene: T.Scene, private readonly R: any, private readonly physics: any) {
    this.addGround();
    this.addCity();
    this.addRoads();
  }

  dispose() {
    for (const collider of this.colliders) {
      try { this.physics.removeCollider(collider, true); } catch {}
    }
    for (const object of this.sceneObjects) {
      object.parent?.remove(object);
      object.traverse((node) => {
        const mesh = node as T.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) material.dispose();
      });
    }
    this.sceneObjects.length = 0;
    this.colliders.length = 0;
  }

  private addGround() {
    const ground = new T.Mesh(
      new T.PlaneGeometry(320, 320),
      new T.MeshStandardMaterial({ color: 0x465149, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.addObject(ground);
    this.colliders.push(
      this.physics.createCollider(this.R.ColliderDesc.cuboid(160, 0.05, 160)),
    );
  }

  private addCity() {
    for (let x = -60; x <= 60; x += 15) {
      for (let z = -60; z <= 60; z += 15) {
        if (Math.abs(x) < 16 && Math.abs(z) < 16) continue;
        const h = 5 + (Math.abs(x * 13 + z * 7) % 6) * 2;
        const building = new T.Mesh(
          new T.BoxGeometry(8, h, 8),
          new T.MeshStandardMaterial({ color: 0x59636b, roughness: 0.9 }),
        );
        building.position.set(x, h / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.addObject(building);
        this.colliders.push(
          this.physics.createCollider(
            this.R.ColliderDesc.cuboid(4, h / 2, 4).setTranslation(x, h / 2, z),
          ),
        );
      }
    }
  }

  private addRoads() {
    const road = new T.Mesh(
      new T.BoxGeometry(34, 0.02, 320),
      new T.MeshStandardMaterial({ color: 0x25292d, roughness: 1 }),
    );
    road.position.y = 0.01;
    this.addObject(road);

    const cross = road.clone();
    cross.material = (road.material as T.Material).clone();
    cross.rotation.y = Math.PI / 2;
    this.addObject(cross);
  }

  private addObject(object: T.Object3D) {
    this.scene.add(object);
    this.sceneObjects.push(object);
  }
}
