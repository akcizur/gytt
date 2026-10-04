import * as T from "three";
import { InputSystem } from "../input/InputSystem";

export class Player {
  readonly object = new T.Group();
  readonly velocity = new T.Vector3();
  position = new T.Vector3(0, 0, 8);
  yaw = 0;
  grounded = false;
  state = "idle";

  private body: any;
  private collider: any;
  private controller: any;
  private visual: T.Mesh;

  constructor(private R: any, private world: any, private input: InputSystem) {
    this.object.userData.noCameraCollision = true;
    this.visual = new T.Mesh(
      new T.CapsuleGeometry(0.38, 0.95, 6, 12),
      new T.MeshStandardMaterial({ color: 0x3d73b8, roughness: 0.8 }),
    );
    this.visual.position.y = 1;
    this.visual.castShadow = true;
    this.object.add(this.visual);

    this.body = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.75, 8),
    );
    this.collider = world.createCollider(R.ColliderDesc.capsule(0.68, 0.38), this.body);
    this.controller = world.createCharacterController(0.05);
    this.controller.enableAutostep(0.5, 0.25, true);
    this.controller.enableSnapToGround(0.25);
  }

  update(dt: number, cameraYaw: number) {
    const a = this.input.sample();

    // Three.js camera convention: forward is local -Z.
    // cameraYaw=0 therefore means "north" / world -Z.
    const forward = new T.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new T.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

    const inputLength = Math.min(1, Math.hypot(a.moveX, a.moveY));
    const dir = new T.Vector3()
      .addScaledVector(right, a.moveX)
      .addScaledVector(forward, a.moveY);

    if (dir.lengthSq() > 1) dir.normalize();

    const speed = a.crouch ? 2.6 : a.sprint ? 8.5 : 4.8;
    const target = dir.multiplyScalar(speed);
    const accel = 20;

    this.velocity.x += Math.max(
      -accel * dt,
      Math.min(accel * dt, target.x - this.velocity.x),
    );
    this.velocity.z += Math.max(
      -accel * dt,
      Math.min(accel * dt, target.z - this.velocity.z),
    );

    if (inputLength < 0.08) {
      const damping = Math.pow(0.001, dt);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
    }

    if (a.jump && this.grounded && !a.crouch) {
      this.velocity.y = 7.2;
    }

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
      // The player model faces local -Z, matching the camera-relative input.
      const desiredYaw = Math.atan2(this.velocity.x, -this.velocity.z);
      let delta = desiredYaw - this.yaw;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      this.yaw += delta * (1 - Math.exp(-14 * dt));
    }

    this.object.rotation.y = this.yaw;

    this.state = !this.grounded
      ? this.velocity.y > 0 ? "jump" : "fall"
      : a.crouch
        ? "crouch"
        : horizontalSpeed < 0.15
          ? "idle"
          : horizontalSpeed < 6.2
            ? "walk"
            : "run";

    this.visual.scale.y = 1 + (this.state === "run" ? 0.05 : 0);
  }

  dispose() {
    this.world.removeCollider(this.collider, true);
    this.world.removeRigidBody(this.body);
    this.visual.geometry.dispose();
    (this.visual.material as T.Material).dispose();
  }
}
