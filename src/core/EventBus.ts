export type GameEventMap = {
  "player:state": {
    state: "idle" | "walk" | "jog" | "run" | "crouch" | "jump" | "fall";
    speed: number;
    grounded: boolean;
  };
  "player:transform": {
    x: number;
    y: number;
    z: number;
    yaw: number;
  };
  "game:status": {
    status: "booting" | "running" | "paused" | "disposed";
  };
  "ui:command": {
    command:
      | "pause"
      | "resume"
      | "toggle-pause"
      | "interact";
  };
};

type Listener<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<Listener<any>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }

    set.add(listener as Listener<any>);
    return () => this.off(event, listener);
  }

  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      listener(payload);
    });
    return unsubscribe;
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(listener as Listener<any>);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
