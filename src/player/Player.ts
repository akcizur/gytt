import * as T from "three";
import { AnimationGraph, type PlayerAnimationState } from "../animation/AnimationGraph";
import { InputSystem } from "../input/InputSystem";
import type { CharacterAsset } from "../assets/AssetManager";

const MOVE_ACCEL = 20;
const SPRINT_ACCEL = 26;
const CROUCH_ACCEL = 16;
const GRAVITY = 18;
const JUMP_SPEED = 7.2;
const CAPSULE_RADIUS = 0.38;
const CAPSULE_HALF_HEIGHT = 0.68;
const BODY_HEIGHT = 1.74;

export class Player {
  readonly object = new T.Group();
  readonly velocity = new T.Vector3();
  readonly position = new T.Vector3(0, 0, 8);

  yaw = 0;
  grounded = false;
  state: PlayerAnimationState = "idle";

  private readonly body: any;
  private readonly collider: any;
  private readonly controller: any;
  private character: T.Group | null = null;
  private animation: AnimationGraph | null = null;
  private fallbackParts: T.Object3D[] = [];

  constructor(
    private readonly R: any,
    private readonly world: any,
    private readonly input: InputSystem,
  ) {
    this.object.userData.noCameraCollision = true;

    this.body = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, BODY_HEIGHT * 0.5, 8),
    );
    this.collider = world.createCollider(
      R.ColliderDesc.capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS),
      this.body,
    );

    this.controller = world.createCharacterController(0.05);
    this.controller.enableAutostep(0.55, 0.3, true);
    this.controller.enableSnapToGround(0.2);
    this.controller.setMaxSlopeClimbAngle(Math.PI / 3);

    this.createFallback();
  }

  attachCharacter(asset: CharacterAsset) {
    this.animation?.dispose();
    this.animation = null;

    if (this.character) {
      this.disposeVisual(this.character);
      this.character = null;
    }

    this.disposeFallback();

    this.character = asset.scene;
    this.character.rotation.y = Math.PI;

    const bounds = new T.Box3().setFromObject(this.character);
    const size = bounds.getSize(new T.Vector3());
    if (size.y > 0.001) {
      this.character.scale.multiplyScalar(1.85 / size.y);
    }

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
      jog: ["jog", "jogging", "walking"],
      run: ["run", "running"],
      crouch: ["crouch", "crouching"],
      jump: ["jump", "jumping"],
      fall: ["fall", "falling"],
    });
  }

  update(dt: number, cameraYaw: number) {
    const a = this.input.sample();

    const forward = new T.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new T.Vector3(Math.cos(cameraYaw), 0, Math.sin(cameraYaw));

    const dir = new T.Vector3()
      .addScaledVector(right, a.moveX)
      .addScaledVector(forward, a.moveY);

    const rawMagnitude = Math.min(1, dir.length());
    if (rawMagnitude > 1) dir.normalize();

    const moveAmount = rawMagnitude < 0.08
      ? 0
      : (rawMagnitude - 0.08) / 0.92;

    const curved = moveAmount * moveAmount * (3 - 2 * moveAmount);
    const maxSpeed = a.crouch ? 2.4 : a.sprint ? 8.6 : 5.8;
    const targetSpeed = maxSpeed * curved;

    if (dir.lengthSq() > 1) dir.normalize();

    const targetX = dir.x * targetSpeed;
    const targetZ = dir.z * targetSpeed;
    const acceleration = a.crouch ? CROUCH_ACCEL : a.sprint ? SPRINT_ACCEL : MOVE_ACCEL;
    const step = acceleration * dt;

    this.velocity.x = this.approach(this.velocity.x, targetX, step);
    this.velocity.z = this.approach(this.velocity.z, targetZ, step);

    if (rawMagnitude < 0.08) {
      const damping = Math.exp(-12 * dt);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
    }

    if (a.jump && this.grounded && !a.crouch) {
      this.velocity.y = JUMP_SPEED;
      this.grounded = false;
    }

    this.velocity.y -= GRAVITY * dt;

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
      y: this.position.y + CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS,
      z: this.position.z,
    });

    this.object.position.copy(this.position);

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > 0.12) {
      const desiredYaw = Math.atan2(this.velocity.x, -this.velocity.z);
      const delta = Math.atan2(
        Math.sin(desiredYaw - this.yaw),
        Math.cos(desiredYaw - this.yaw),
      );
      this.yaw += delta * (1 - Math.exp(-14 * dt));
    }
    this.object.rotation.y = this.yaw;

    this.state = !this.grounded
      ? this.velocity.y > 0 ? "jump" : "fall"
      : a.crouch
        ? "crouch"
        : rawMagnitude < 0.08
          ? "idle"
          : rawMagnitude < 0.42
            ? "walk"
            : rawMagnitude < 0.78
              ? "jog"
              : "run";

    this.animation?.setState(this.state);
    this.animation?.update(dt);
    this.updateFallback(dt, horizontalSpeed);
  }

  dispose() {
    this.animation?.dispose();
    this.animation = null;

    if (this.character) {
      this.disposeVisual(this.character);
      this.character = null;
    }

    this.disposeFallback();
    this.world.removeCollider(this.collider, true);
    this.world.removeRigidBody(this.body);
  }

  private approach(current: number, target: number, amount: number) {
    if (current < target) return Math.min(current + amount, target);
    if (current > target) return Math.max(current - amount, target);
    return target;
  }

  private createFallback() {
    const material = new T.MeshStandardMaterial({ color: 0x3d73b8, roughness: 0.78 });
    const dark = new T.MeshStandardMaterial({ color: 0x17202a, roughness: 0.9 });

    const torso = new T.Mesh(new T.CapsuleGeometry(0.28, 0.65, 5, 10), material);
    torso.position.y = 0.98;

    const head = new T.Mesh(new T.SphereGeometry(0.28, 12, 8), material);
    head.position.y = 1.62;

    const visor = new T.Mesh(new T.BoxGeometry(0.32, 0.08, 0.025), dark);
    visor.position.set(0, 1.63, -0.275);

    const leftLeg = new T.Mesh(new T.CapsuleGeometry(0.11, 0.62, 4, 8), dark);
    const rightLeg = leftLeg.clone();
    leftLeg.position.set(-0.16, 0.45, 0);
    rightLeg.position.set(0.16, 0.45, 0);

    for (const part of [torso, head, visor, leftLeg, rightLeg]) {
      part.castShadow = true;
      this.object.add(part);
      this.fallbackParts.push(part);
    }
  }

  private updateFallback(dt: number, speed: number) {
    if (this.character || this.fallbackParts.length < 5) return;

    const leftLeg = this.fallbackParts[3];
    const rightLeg = this.fallbackParts[4];

    if (speed > 0.15 && this.grounded) {
      const phase = performance.now() * 0.012 * Math.min(speed, 8);
      leftLeg.rotation.x = Math.sin(phase) * 0.55;
      rightLeg.rotation.x = -Math.sin(phase) * 0.55;
    } else {
      const relax = Math.min(1, dt * 12);
      leftLeg.rotation.x *= 1 - relax;
      rightLeg.rotation.x *= 1 - relax;
    }
  }

  private disposeFallback() {
    for (const part of this.fallbackParts) {
      const mesh = part as T.Mesh;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.dispose();
      this.object.remove(part);
    }
    this.fallbackParts = [];
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
