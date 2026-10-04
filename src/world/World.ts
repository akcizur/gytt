import * as T from "three";

type RapierApi = {
  ColliderDesc: {
    cuboid: (hx: number, hy: number, hz: number) => {
      setTranslation: (x: number, y: number, z: number) => unknown;
    };
  };
};

export class World {
  private readonly sceneObjects: T.Object3D[] = [];
  private readonly colliders: unknown[] = [];

  constructor(
    private readonly scene: T.Scene,
    private readonly R: RapierApi,
    private readonly physics: any,
  ) {
    this.addGround();
    this.addHouse();
    this.addShed();
    this.addVegetation();
  }

  dispose() {
    for (const collider of this.colliders) {
      try {
        this.physics.removeCollider(collider, true);
      } catch {}
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
      new T.PlaneGeometry(140, 140),
      new T.MeshStandardMaterial({ color: 0x66715f, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.addObject(ground);

    this.colliders.push(
      this.physics.createCollider(this.R.ColliderDesc.cuboid(70, 0.05, 70)),
    );

    const drive = new T.Mesh(
      new T.PlaneGeometry(8, 48),
      new T.MeshStandardMaterial({ color: 0x77736a, roughness: 0.95 }),
    );
    drive.rotation.x = -Math.PI / 2;
    drive.position.set(0, 0.012, 31);
    drive.receiveShadow = true;
    this.addObject(drive);
  }

  private addHouse() {
    const house = new T.Group();
    house.position.set(0, 0, -5);

    const wall = new T.MeshStandardMaterial({ color: 0xd7d0c2, roughness: 0.9 });
    const darkWall = new T.MeshStandardMaterial({ color: 0xb7afa0, roughness: 0.95 });
    const roof = new T.MeshStandardMaterial({ color: 0x3d3833, roughness: 0.92 });
    const glass = new T.MeshStandardMaterial({
      color: 0x607b82,
      roughness: 0.2,
      metalness: 0.05,
    });
    const wood = new T.MeshStandardMaterial({ color: 0x5d4636, roughness: 0.85 });

    const body = new T.Mesh(new T.BoxGeometry(13, 5.4, 9), wall);
    body.position.y = 2.7;
    this.addMesh(house, body);

    const roofMesh = new T.Mesh(new T.ConeGeometry(7.9, 3.2, 4), roof);
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.position.y = 6.9;
    roofMesh.scale.z = 0.7;
    this.addMesh(house, roofMesh);

    const porch = new T.Mesh(new T.BoxGeometry(7, 0.3, 2.2), wood);
    porch.position.set(0, 0.16, 5.2);
    this.addMesh(house, porch);

    const door = new T.Mesh(new T.BoxGeometry(1.35, 2.7, 0.16), wood);
    door.position.set(0, 1.35, 4.56);
    this.addMesh(house, door);

    for (const x of [-4.2, 4.2]) {
      const window = new T.Mesh(new T.BoxGeometry(2.35, 1.55, 0.16), glass);
      window.position.set(x, 2.8, 4.56);
      this.addMesh(house, window);

      const frameH = new T.Mesh(new T.BoxGeometry(0.08, 1.7, 0.2), darkWall);
      frameH.position.set(x, 2.8, 4.45);
      this.addMesh(house, frameH);

      const frameV = new T.Mesh(new T.BoxGeometry(2.5, 0.08, 0.2), darkWall);
      frameV.position.set(x, 2.8, 4.45);
      this.addMesh(house, frameV);
    }

    const chimney = new T.Mesh(new T.BoxGeometry(0.9, 2.2, 0.9), darkWall);
    chimney.position.set(3.5, 7.2, -1.8);
    this.addMesh(house, chimney);

    house.traverse((node) => {
      const mesh = node as T.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    this.addObject(house);
    this.addBoxCollider(6.5, 2.7, 4.5, 0, 2.7, -5);
  }

  private addShed() {
    const shed = new T.Group();
    shed.position.set(11, 0, -2);

    const wall = new T.MeshStandardMaterial({ color: 0x76614f, roughness: 0.95 });
    const roof = new T.MeshStandardMaterial({ color: 0x393733, roughness: 0.95 });
    const doorMaterial = new T.MeshStandardMaterial({ color: 0x443b33, roughness: 0.9 });

    const body = new T.Mesh(new T.BoxGeometry(5.5, 3.4, 4.5), wall);
    body.position.y = 1.7;
    this.addMesh(shed, body);

    const roofMesh = new T.Mesh(new T.BoxGeometry(6.1, 0.35, 5.1), roof);
    roofMesh.position.y = 3.55;
    this.addMesh(shed, roofMesh);

    const door = new T.Mesh(new T.BoxGeometry(1.7, 2.7, 0.12), doorMaterial);
    door.position.set(0, 1.35, 2.3);
    this.addMesh(shed, door);

    shed.traverse((node) => {
      const mesh = node as T.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    this.addObject(shed);
    this.addBoxCollider(2.75, 1.7, 2.25, 11, 1.7, -2);
  }

  private addVegetation() {
    const placements = [
      [-15, -8, 1.1], [17, -12, 1.25], [-18, 5, 0.9],
      [18, 8, 1.15], [-11, 15, 1.0], [8, 16, 0.85],
    ] as const;

    for (const [x, z, scale] of placements) {
      const tree = new T.Group();
      tree.position.set(x, 0, z);
      tree.scale.setScalar(scale);

      const trunk = new T.Mesh(
        new T.CylinderGeometry(0.22, 0.32, 2.5, 8),
        new T.MeshStandardMaterial({ color: 0x584536, roughness: 1 }),
      );
      trunk.position.y = 1.25;

      const crown = new T.Mesh(
        new T.IcosahedronGeometry(1.5, 1),
        new T.MeshStandardMaterial({ color: 0x435844, roughness: 1 }),
      );
      crown.position.y = 3.1;

      tree.add(trunk, crown);
      tree.traverse((node) => {
        const mesh = node as T.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      this.addObject(tree);
    }
  }

  private addBoxCollider(
    hx: number,
    hy: number,
    hz: number,
    x: number,
    y: number,
    z: number,
  ) {
    this.colliders.push(
      this.physics.createCollider(
        this.R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z),
      ),
    );
  }

  private addMesh(parent: T.Object3D, mesh: T.Mesh) {
    parent.add(mesh);
  }

  private addObject(object: T.Object3D) {
    this.scene.add(object);
    this.sceneObjects.push(object);
  }
}
