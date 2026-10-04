export type Actions = {
  moveX: number; moveY: number;
  lookX: number; lookY: number;
  sprint: boolean; jump: boolean; crouch: boolean; roll: boolean; interact: boolean;
};

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

const deadzone = (v: number, zone = 0.08) => {
  const a = Math.abs(v);
  if (a <= zone) return 0;
  const normalized = Math.min(1, (a - zone) / (1 - zone));
  const curved = normalized * normalized * (3 - 2 * normalized);
  return Math.sign(v) * curved;
};

export class InputSystem {
  readonly actions: Actions = {
    moveX: 0, moveY: 0, lookX: 0, lookY: 0,
    sprint: false, jump: false, crouch: false, roll: false, interact: false,
  };

  private readonly keys = new Set<string>();
  private readonly just = new Set<string>();
  private readonly pointers = new Map<number, { kind: "move" | "look"; x: number; y: number }>();
  private readonly activeStick: Record<"move" | "look", number | null> = { move: null, look: null };
  private readonly stickMove = { x: 0, y: 0 };
  private readonly stickLook = { x: 0, y: 0 };
  private readonly lookVelocity = { x: 0, y: 0 };
  private frameSampled = false;
  private disposed = false;

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (!this.keys.has(e.code)) this.just.add(e.code);
    this.keys.add(e.code);
    if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
  };

  private readonly onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private readonly onBlur = () => this.reset();
  private readonly onVisibility = () => document.hidden && this.reset();
  private readonly onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== this.canvas) return;
    this.actions.lookX += e.movementX * 0.0022;
    this.actions.lookY += e.movementY * 0.0022;
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    addEventListener("keydown", this.onKeyDown, { passive: false });
    addEventListener("keyup", this.onKeyUp);
    addEventListener("blur", this.onBlur);
    addEventListener("visibilitychange", this.onVisibility);
    addEventListener("mousemove", this.onMouseMove);

    const map: Record<string, string> = {
      jump: "Space", crouch: "ControlLeft", run: "ShiftLeft", interact: "KeyE",
    };

    document.querySelectorAll<HTMLElement>("[data-action]").forEach((el) => {
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

    canvas.addEventListener("click", this.requestPointerLock);
  }

  private readonly requestPointerLock = () => {
    if (matchMedia("(pointer:fine)").matches) this.canvas.requestPointerLock?.();
  };

  private bindStick(selector: string, kind: "move" | "look") {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;

    el.style.touchAction = "none";

    const down = (e: PointerEvent) => {
      if (this.activeStick[kind] !== null) return;
      e.preventDefault();
      this.activeStick[kind] = e.pointerId;
      this.pointers.set(e.pointerId, { kind, x: e.clientX, y: e.clientY });
      el.classList.add("active");
      el.setPointerCapture?.(e.pointerId);
    };

    const move = (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId);
      if (!p || this.activeStick[p.kind] !== e.pointerId) return;

      const radius = Math.max(44, Math.min(el.clientWidth, el.clientHeight) * 0.42);
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;

      if (kind === "move") {
        this.stickMove.x = deadzone(clamp(dx / radius));
        this.stickMove.y = deadzone(clamp(-dy / radius));
        el.style.setProperty("--sx", String(this.stickMove.x));
        el.style.setProperty("--sy", String(-this.stickMove.y));
      } else {
        this.stickLook.x = clamp(dx * 0.0020, -0.12, 0.12);
        this.stickLook.y = clamp(dy * 0.00165, -0.10, 0.10);
        this.actions.lookX += this.stickLook.x;
        this.actions.lookY += this.stickLook.y;
        p.x = e.clientX;
        p.y = e.clientY;
        el.style.setProperty("--sx", String(clamp(dx / radius)));
        el.style.setProperty("--sy", String(clamp(dy / radius)));
      }
    };

    const end = (e: PointerEvent) => {
      if (!this.pointers.delete(e.pointerId)) return;
      this.activeStick[kind] = null;
      el.classList.remove("active");
      el.style.setProperty("--sx", "0");
      el.style.setProperty("--sy", "0");
      if (kind === "move") {
        this.stickMove.x = 0;
        this.stickMove.y = 0;
      } else {
        this.stickLook.x = 0;
        this.stickLook.y = 0;
      }
    };

    el.addEventListener("pointerdown", down, { passive: false });
    el.addEventListener("pointermove", move, { passive: false });
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);
  }

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

    const digitalX = clamp(keyX);
    const digitalY = clamp(keyY);
    const touchMag = Math.hypot(this.stickMove.x, this.stickMove.y);
    const digitalMag = Math.hypot(digitalX, digitalY);
    const gamepadMag = Math.hypot(gp.moveX, gp.moveY);

    if (touchMag >= digitalMag && touchMag >= gamepadMag) {
      this.actions.moveX = this.stickMove.x;
      this.actions.moveY = this.stickMove.y;
    } else if (gamepadMag >= digitalMag) {
      this.actions.moveX = gp.moveX;
      this.actions.moveY = gp.moveY;
    } else {
      this.actions.moveX = digitalX;
      this.actions.moveY = digitalY;
    }

    this.actions.lookX += gp.lookX * 0.090;
    this.actions.lookY += gp.lookY * 0.075;

    const mobileAutoRun = touchMag > 0.88 && digitalMag === 0 && gamepadMag === 0;
    this.actions.sprint =
      this.down("ShiftLeft") ||
      this.down("ShiftRight") ||
      !!gamepad?.buttons[10]?.pressed ||
      mobileAutoRun;
    this.actions.crouch =
      this.down("ControlLeft") ||
      this.down("ControlRight") ||
      !!gamepad?.buttons[1]?.pressed;
    this.actions.jump = this.pressed("Space") || !!gamepad?.buttons[0]?.pressed;
    this.actions.roll = this.pressed("KeyQ") || !!gamepad?.buttons[3]?.pressed;
    this.actions.interact = this.pressed("KeyE") || !!gamepad?.buttons[2]?.pressed;

    return this.actions;
  }

  down(code: string) { return this.keys.has(code); }
  pressed(code: string) { return this.just.has(code); }

  endFrame() {
    this.just.clear();
    this.frameSampled = false;
    this.actions.lookX = 0;
    this.actions.lookY = 0;
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
    this.lookVelocity.x = 0;
    this.lookVelocity.y = 0;
    this.frameSampled = false;
    Object.assign(this.actions, {
      moveX: 0, moveY: 0, lookX: 0, lookY: 0,
      sprint: false, jump: false, crouch: false, roll: false, interact: false,
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    removeEventListener("keydown", this.onKeyDown);
    removeEventListener("keyup", this.onKeyUp);
    removeEventListener("blur", this.onBlur);
    removeEventListener("visibilitychange", this.onVisibility);
    removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("click", this.requestPointerLock);
    this.reset();
  }
}
