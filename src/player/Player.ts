import * as T from "three";
import { AnimationGraph, type PlayerAnimationState } from "../animation/AnimationGraph";
import { InputSystem } from "../input/InputSystem";
import type { CharacterAsset } from "../assets/AssetManager";

export class Player {
  readonly object = new T.Group();
  readonly velocity = new T.Vector3();
  position = new T.Vector3(0, 0, 8);
  yaw = 0;
  grounded = false;
  state: PlayerAnimationState = "idle";

  private body: any;
  private collider: any;
  private controller: any;
  private fallback: T.Mesh | null = null;
  private character: T.Group | null = null;
  private animation: AnimationGraph | null = null;

  constructor(private R: any, private world: any, private input: InputSystem) {
    this.object.userData.noCameraCollision = true;

    this.fallback = new T.Mesh(
      new T.CapsuleGeometry(0.38, 0.95, 6, 12),
      new T.MeshStandardMaterial({ color: 0x3d73b8, roughness: 0.8 }),
    );
    this.fallback.position.y = 1;
    this.fallback.castShadow = true;
    this.object.add(this.fallback);

    this.body = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.75, 8),
    );
    this.collider = world.createCollider(R.ColliderDesc.capsule(0.68, 0.38), this.body);
    this.controller = world.createCharacterController(0.05);
    this.controller.enableAutostep(0.5, 0.25, true);
    this.controller.enableSnapToGround(0.25);
  }

  attachCharacter(asset: CharacterAsset) {
    this.animation?.dispose();

    if (this.character) {
      this.object.remove(this.character);
      this.disposeVisual(this.character);
    }

    if (this.fallback) {
      this.object.remove(this.fallback);
      this.fallback.geometry.dispose();
      (this.fallback.material as T.Material).dispose();
      this.fallback = null;
    }

    this.character = asset.scene;
    this.character.rotation.y = Math.PI;

    // Normalize arbitrary GLB scale/origin so the physics capsule stays authoritative.
    const bounds = new T.Box3().setFromObject(this.character);
    const size = bounds.getSize(new T.Vector3());
    if (size.y > 0.001) this.character.scale.multiplyScalar(1.85 / size.y);

    const normalizedBounds = new T.Box3().setFromObject(this.character);
    this.character.position.y -= normalizedBounds.min.y;
    this.character.traverse((object) => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    this.object.add(this.character);
    this.animation = new AnimationGraph(this.character);
    this.animation.attach(asset.animations, {
      idle: ["idle", "idle_loop"],
      walk: ["walk", "walking"],
      jog: ["jog", "walking"],
      run: ["run", "running"],
      crouch: ["crouch", "crouching"],
      jump: ["jump", "jump start", "jumping"],
      fall: ["fall", "falling"],
    });
  }

  update(dt: number, cameraYaw: number) {
    const a = this.input.sample();

    const forward = new T.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new T.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

    const inputLength = Math.min(1, Math.hypot(a.moveX, a.moveY));
    const dir = new T.Vector3()
      .addScaledVector(right, a.moveX)
      .addScaledVector(forward, a.moveY);

    const stickPower = inputLength > 0.10
      ? Math.min(1, (inputLength - 0.10) / 0.90)
      : 0;
    const curvedInput = stickPower * stickPower * (3 - 2 * stickPower);
    const maxSpeed = a.crouch ? 2.4 : a.sprint ? 8.6 : 6.2;
    const speed = maxSpeed * curvedInput;

    if (dir.lengthSq() > 1) dir.normalize();

    const target = dir.multiplyScalar(speed);
    const accel = a.crouch ? 24 : a.sprint ? 22 : 18;

    this.velocity.x += Math.max(-accel * dt, Math.min(accel * dt, target.x - this.velocity.x));
    this.velocity.z += Math.max(-accel * dt, Math.min(accel * dt, target.z - this.velocity.z));

    if (inputLength < 0.08) {
      const damping = Math.pow(0.001, dt);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
    }

    if (a.jump && this.grounded && !a.crouch) this.velocity.y = 7.2;

    this.velocity.y -= 18 * dt;

    this.controller.computeColliderMovement(this.collider, {
      x: this.velocity.x * dt,
      y: this.velocity.y * dt,
      z: this.velocity.z * dt,
    });

    const movement = this.controller.computedMovement();
    this.position.x += movement.x;
    this.position.y += movement.y;
    this.position.z += movement.z;

    this.grounded = this.controller.computedGrounded();
    if (this.grounded && this.velocity.y < 0) this.velocity.y = 0;

    this.body.setNextKinematicTranslation({
      x: this.position.x,
      y: this.position.y + 0.75,
      z: this.position.z,
    });

    this.object.position.copy(this.position);

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > 0.15) {
      const desiredYaw = Math.atan2(this.velocity.x, -this.velocity.z);
      let delta = Math.atan2(Math.sin(desiredYaw - this.yaw), Math.cos(desiredYaw - this.yaw));
      this.yaw += delta * (1 - Math.exp(-14 * dt));
    }

    this.object.rotation.y = this.yaw;

    this.state = !this.grounded
      ? this.velocity.y > 0 ? "jump" : "fall"
      : a.crouch
        ? "crouch"
        : inputLength < 0.10
          ? "idle"
          : inputLength < 0.42
            ? "walk"
            : inputLength < 0.78
              ? "jog"
              : "run";

    this.animation?.setState(this.state);
    this.animation?.update(dt);
  }

  dispose() {
    this.animation?.dispose();
    if (this.character) this.disposeVisual(this.character);
    if (this.fallback) {
      this.fallback.geometry.dispose();
      (this.fallback.material as T.Material).dispose();
    }
    this.world.removeCollider(this.collider, true);
    this.world.removeRigidBody(this.body);
  }

  private disposeVisual(root: T.Object3D) {
    root.traverse((object) => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.dispose();
    });
    root.parent?.remove(root);
  }
}
