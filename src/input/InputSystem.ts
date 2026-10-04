export type Actions = {
  moveX: number; moveY: number;
  lookX: number; lookY: number;
  sprint: boolean; jump: boolean; crouch: boolean; roll: boolean; interact: boolean;
};

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
const deadzone = (v: number, zone = 0.08) => {
  const a = Math.abs(v);
  if (a <= zone) return 0;
  const normalized = (a - zone) / (1 - zone);
  // Smooth the first part of the stick for precision without feeling sluggish.
  const curved = normalized * normalized * (3 - 2 * normalized);
  return Math.sign(v) * curved;
};

export class InputSystem {
  readonly actions: Actions = {
    moveX: 0, moveY: 0, lookX: 0, lookY: 0,
    sprint: false, jump: false, crouch: false, roll: false, interact: false,
  };

  private keys = new Set<string>();
  private just = new Set<string>();
  private pointers = new Map<number, { kind: "move" | "look"; x: number; y: number }>();
  private activeStick: Record<"move" | "look", number | null> = { move: null, look: null };
  private stickMove = { x: 0, y: 0 };
  private stickLook = { x: 0, y: 0 };
  private frameSampled = false;
  private lastLookTime = performance.now();

  constructor(private canvas: HTMLCanvasElement) {
    addEventListener("keydown", e => {
      if (!this.keys.has(e.code)) this.just.add(e.code);
      this.keys.add(e.code);
      if (e.code === "Space") e.preventDefault();
    }, { passive: false });

    addEventListener("keyup", e => this.keys.delete(e.code));
    addEventListener("blur", () => this.reset());
    addEventListener("visibilitychange", () => document.hidden && this.reset());

    const map: Record<string, string> = {
      jump: "Space", crouch: "ControlLeft", run: "ShiftLeft", interact: "KeyE",
    };

    document.querySelectorAll<HTMLElement>("[data-action]").forEach(el => {
      const code = map[el.dataset.action || ""];
      if (!code) return;
      const down = (e: PointerEvent) => {
        e.preventDefault();
        this.keys.add(code);
        this.just.add(code);
        el.setPointerCapture?.(e.pointerId);
      };
      const up = () => this.keys.delete(code);
      el.addEventListener("pointerdown", down, { passive: false });
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("lostpointercapture", up);
    });

    this.bindStick("#move", "move");
    this.bindStick("#look", "look");

    canvas.addEventListener("click", () => {
      if (matchMedia("(pointer:fine)").matches) canvas.requestPointerLock?.();
    });

    addEventListener("mousemove", e => {
      if (document.pointerLockElement !== canvas) return;
      this.actions.lookX += e.movementX * 0.0022;
      this.actions.lookY += e.movementY * 0.0022;
    });
  }

  private bindStick(selector: string, kind: "move" | "look") {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;

    el.style.touchAction = "none";

    el.addEventListener("pointerdown", e => {
      if (this.activeStick[kind] !== null) return;
      e.preventDefault();
      this.activeStick[kind] = e.pointerId;
      this.pointers.set(e.pointerId, { kind, x: e.clientX, y: e.clientY });
      el.setPointerCapture?.(e.pointerId);
    }, { passive: false });

    el.addEventListener("pointermove", e => {
      const p = this.pointers.get(e.pointerId);
      if (!p || this.activeStick[p.kind] !== e.pointerId) return;

      const radius = Math.max(44, Math.min(el.clientWidth, el.clientHeight) * 0.42);
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;

      if (kind === "move") {
        this.stickMove.x = deadzone(clamp(dx / radius), 0.08);
        // Screen Y is inverted: swipe upward means forward.
        this.stickMove.y = deadzone(clamp(-dy / radius), 0.08);
      } else {
        // Camera: responsive at small movements, but capped to prevent jumps.
        this.stickLook.x = clamp(this.stickLook.x + dx * 0.00165, -0.14, 0.14);
        // Screen Y is inverted for orbit control: swipe up looks up.
        this.stickLook.y = clamp(this.stickLook.y + dy * 0.00135, -0.12, 0.12);
        p.x = e.clientX;
        p.y = e.clientY;
      }
    }, { passive: false });

    const end = (e: PointerEvent) => {
      if (!this.pointers.delete(e.pointerId)) return;
      this.activeStick[kind] = null;
      if (kind === "move") {
        this.stickMove.x = 0;
        this.stickMove.y = 0;
      } else {
        this.stickLook.x = 0;
        this.stickLook.y = 0;
      }
    };

    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);
  }

  down(code: string) { return this.keys.has(code); }
  pressed(code: string) { return this.just.has(code); }

  sample() {
    if (this.frameSampled) return this.actions;
    this.frameSampled = true;

    const gamepad = navigator.getGamepads?.().find(Boolean);
    const gp = gamepad ? {
      moveX: deadzone(gamepad.axes[0] ?? 0),
      moveY: deadzone(-(gamepad.axes[1] ?? 0)),
      lookX: deadzone(gamepad.axes[2] ?? 0),
      lookY: deadzone(gamepad.axes[3] ?? 0),
    } : { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };

    const keyX = (this.down("KeyD") ? 1 : 0) - (this.down("KeyA") ? 1 : 0);
    const keyY = (this.down("KeyW") ? 1 : 0) - (this.down("KeyS") ? 1 : 0);

    this.actions.moveX = clamp(this.stickMove.x + keyX + gp.moveX);
    this.actions.moveY = clamp(this.stickMove.y + keyY + gp.moveY);
    this.actions.lookX += this.stickLook.x + gp.lookX * 0.090;
    this.actions.lookY += this.stickLook.y + gp.lookY * 0.075;

    this.actions.sprint =
      this.down("ShiftLeft") || this.down("ShiftRight") || !!gamepad?.buttons[10]?.pressed;
    this.actions.crouch =
      this.down("ControlLeft") || this.down("ControlRight") || !!gamepad?.buttons[1]?.pressed;
    this.actions.jump = this.pressed("Space") || !!gamepad?.buttons[0]?.pressed;
    this.actions.roll = this.pressed("KeyQ") || !!gamepad?.buttons[3]?.pressed;
    this.actions.interact = this.pressed("KeyE") || !!gamepad?.buttons[2]?.pressed;

    return this.actions;
  }

  endFrame() {
    this.just.clear();
    this.frameSampled = false;
    this.actions.lookX = 0;
    this.actions.lookY = 0;
    this.stickLook.x = 0;
    this.stickLook.y = 0;
  }

  reset() {
    this.keys.clear();
    this.just.clear();
    this.pointers.clear();
    this.activeStick.move = null;
    this.activeStick.look = null;
    this.stickMove.x = 0;
    this.stickMove.y = 0;
    this.stickLook.x = 0;
    this.stickLook.y = 0;
    this.frameSampled = false;
    Object.assign(this.actions, {
      moveX: 0, moveY: 0, lookX: 0, lookY: 0,
      sprint: false, jump: false, crouch: false, roll: false, interact: false,
    });
  }
}
