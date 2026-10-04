import * as T from "three";

export type PlayerAnimationState = "idle" | "walk" | "jog" | "run" | "crouch" | "jump" | "fall";
type ClipMap = Partial<Record<PlayerAnimationState, string[]>>;

const DEFAULT_CLIPS: Record<PlayerAnimationState, string[]> = {
  idle: ["idle", "idle_loop", "idle animation"],
  walk: ["walk", "walking", "walk forward"],
  jog: ["jog", "jogging", "jog forward"],
  run: ["run", "running", "run forward"],
  crouch: ["crouch", "crouching", "crouch idle"],
  jump: ["jump", "jump start", "jumping"],
  fall: ["fall", "falling", "airborne"],
};

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export class AnimationGraph {
  private mixer: T.AnimationMixer | null = null;
  private actions = new Map<PlayerAnimationState, T.AnimationAction>();
  private current: PlayerAnimationState = "idle";
  private clipMap: ClipMap = DEFAULT_CLIPS;

  constructor(private readonly root: T.Object3D) {}

  attach(clips: T.AnimationClip[], clipMap: ClipMap = DEFAULT_CLIPS) {
    this.dispose();
    this.clipMap = clipMap;
    this.mixer = new T.AnimationMixer(this.root);

    const normalized = clips.map(clip => ({ clip, name: normalize(clip.name) }));
    for (const state of Object.keys(this.clipMap) as PlayerAnimationState[]) {
      const aliases = (this.clipMap[state] ?? []).map(normalize);
      const found = normalized.find(({ name }) =>
        aliases.some(alias => name === alias || name.includes(alias)),
      );
      if (found) this.actions.set(state, this.mixer.clipAction(found.clip));
    }

    // Always have a usable visual state when an asset has incomplete animation names.
    if (!this.actions.has("idle") && clips[0]) {
      this.actions.set("idle", this.mixer.clipAction(clips[0]));
    }

    this.setState(this.current, true);
  }

  setState(state: PlayerAnimationState, immediate = false) {
    const next = this.actions.get(state);
    if (!next || !this.mixer) return;
    if (this.current === state && !immediate && next.isRunning()) return;

    const previous = this.actions.get(this.current);
    this.current = state;

    next.reset().setLoop(T.LoopRepeat, Infinity);
    if (previous && previous !== next) previous.fadeOut(immediate ? 0 : 0.12);
    next.fadeIn(immediate ? 0 : 0.12).play();
  }

  update(dt: number) {
    if (this.mixer && Number.isFinite(dt) && dt > 0) this.mixer.update(dt);
  }

  dispose() {
    if (!this.mixer) return;
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
    this.mixer = null;
    this.actions.clear();
  }
}