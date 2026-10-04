import type { EventBus, GameEventMap } from "./EventBus";

export type GameSnapshot = {
  status: "booting" | "running" | "paused" | "disposed";
  player: {
    state: GameEventMap["player:state"]["state"];
    speed: number;
    grounded: boolean;
    position: { x: number; y: number; z: number };
    yaw: number;
  };
};

export class GameBridge {
  readonly events: EventBus<GameEventMap>;
  private snapshot: GameSnapshot = {
    status: "booting",
    player: {
      state: "idle",
      speed: 0,
      grounded: false,
      position: { x: 0, y: 0, z: 8 },
      yaw: 0,
    },
  };

  constructor(events: EventBus<GameEventMap>) {
    this.events = events;
  }

  getSnapshot(): GameSnapshot {
    return {
      ...this.snapshot,
      player: {
        ...this.snapshot.player,
        position: { ...this.snapshot.player.position },
      },
    };
  }

  setStatus(status: GameSnapshot["status"]) {
    this.snapshot = { ...this.snapshot, status };
    this.events.emit("game:status", { status });
  }

  publishPlayer(
    state: GameSnapshot["player"]["state"],
    speed: number,
    grounded: boolean,
    position: { x: number; y: number; z: number },
    yaw: number,
  ) {
    this.snapshot = {
      ...this.snapshot,
      player: {
        state,
        speed,
        grounded,
        position: { ...position },
        yaw,
      },
    };

    this.events.emit("player:state", { state, speed, grounded });
    this.events.emit("player:transform", { ...position, yaw });
  }

  command(command: GameEventMap["ui:command"]["command"]) {
    this.events.emit("ui:command", { command });
  }

  destroy() {
    this.setStatus("disposed");
    this.events.clear();
  }
}
