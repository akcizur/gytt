import { describe, expect, it } from "vitest";
import { EventBus, type GameEventMap } from "../src/core/EventBus";
import { GameBridge } from "../src/core/GameBridge";

describe("GameBridge", () => {
  it("publishes snapshots without exposing mutable state", () => {
    const bus = new EventBus<GameEventMap>();
    const bridge = new GameBridge(bus);

    bridge.publishPlayer("run", 6, true, { x: 1, y: 0, z: 2 }, 0.5);
    const snapshot = bridge.getSnapshot();
    snapshot.player.position.x = 999;

    expect(bridge.getSnapshot().player.position.x).toBe(1);
    expect(bridge.getSnapshot().player.state).toBe("run");
  });

  it("routes UI commands through the event bus", () => {
    const bus = new EventBus<GameEventMap>();
    const bridge = new GameBridge(bus);
    const commands: GameEventMap["ui:command"]["command"][] = [];

    bus.on("ui:command", ({ command }) => commands.push(command));
    bridge.command("toggle-pause");

    expect(commands).toEqual(["toggle-pause"]);
  });
});
