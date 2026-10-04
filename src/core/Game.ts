import * as T from "three";
import { InputSystem } from "../input/InputSystem";
import { Player } from "../player/Player";
import { World } from "../world/World";
import { AssetManager } from "../assets/AssetManager";
import { RenderSystem } from "../render/RenderSystem";

const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.1;
const MAX_STEPS_PER_FRAME = 5;

export class Game {
  private readonly scene = new T.Scene();
  private readonly render: RenderSystem;
  private readonly physics: any;
  private readonly input: InputSystem;
  private readonly player: Player;
  private readonly assets = new AssetManager();

  private last = performance.now();
  private accumulator = 0;
  private raf = 0;
  private running = false;
  private disposed = false;
  private yaw = 0;
  private pitch = -0.2;
  private frames = 0;
  private fpsTime = performance.now();

  constructor({ canvas, RAPIER }: { canvas: HTMLCanvasElement; RAPIER: any }) {
    this.render = new RenderSystem(canvas);
    this.physics = new RAPIER.World({ x: 0, y: -18, z: 0 });
    this.input = new InputSystem(canvas);

    new World(this.scene, RAPIER, this.physics);
    this.player = new Player(RAPIER, this.physics, this.input);
    this.scene.add(this.player.object);

    const sun = new T.DirectionalLight(0xffffff, 2.2);
    sun.position.set(40, 70, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(sun);
    this.scene.add(new T.HemisphereLight(0xcfe5ff, 0x253029, 1.2));

    this.scene.background = new T.Color(0x8faabd);
    this.scene.fog = new T.Fog(0x8faabd, 45, 240);
  }

  async start() {
    if (this.disposed || this.running) return;
    try {
      const url = new URL("assets/characters/RobotExpressive.glb", import.meta.env.BASE_URL).href;
      const character = await this.assets.loadCharacter(url);
      this.player.attachCharacter(character);
    } catch (error) {
      console.warn("GYTT character asset unavailable; using physics fallback.", error);
    }

    this.running = true;
    this.last = performance.now();
    this.fpsTime = this.last;
    this.frames = 0;
    this.accumulator = 0;
    document.querySelector("#boot")?.remove();
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    if (!this.running) return;

    const frameDt = Math.min(MAX_FRAME_DT, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.accumulator += frameDt;

    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      this.player.update(FIXED_DT, this.yaw);
      this.physics.step();
      this.accumulator -= FIXED_DT;
      steps++;
    }

    // Prevent a background-tab resume from creating a physics spiral.
    if (steps === MAX_STEPS_PER_FRAME && this.accumulator >= FIXED_DT) {
      this.accumulator = 0;
    }

    // Camera/render stay on the display clock; simulation stays fixed-step.
    this.cameraUpdate(frameDt);
    this.render.render(this.scene);
    this.hud();
    this.input.endFrame();
    this.raf = requestAnimationFrame(this.loop);
  };

  private cameraUpdate(dt: number) {
    this.yaw += this.input.actions.lookX;
    this.pitch = Math.max(-1.05, Math.min(0.35, this.pitch + this.input.actions.lookY));

    const target = this.player.position.clone().add(new T.Vector3(0, 1.15, 0));
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const distance = 6.5;

    const desired = new T.Vector3(
      target.x + Math.sin(this.yaw) * cp * distance,
      target.y - sp * distance,
      target.z + Math.cos(this.yaw) * cp * distance,
    );

    const smoothing = 1 - Math.pow(0.0008, Math.min(dt, MAX_FRAME_DT));
    this.render.camera.position.lerp(desired, smoothing);
    this.render.camera.lookAt(target);
  }

  private hud() {
    this.frames++;
    const now = performance.now();

    if (now - this.fpsTime > 500) {
      const el = document.querySelector("#fps");
      if (el) el.textContent = Math.round(this.frames * 1000 / (now - this.fpsTime)) + " FPS";
      this.frames = 0;
      this.fpsTime = now;
    }

    const speed = document.querySelector("#speed");
    if (speed) {
      speed.textContent = Math.round(Math.hypot(this.player.velocity.x, this.player.velocity.z) * 3.6) + " KM/H";
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.player.dispose();
    this.assets.dispose();
    this.render.dispose();
  }
}
