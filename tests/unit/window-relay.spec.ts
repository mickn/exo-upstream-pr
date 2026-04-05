import { test, expect } from "@playwright/test";
import { EventEmitter } from "events";
import { WindowRelay } from "../../src/main/agents/window-relay";

class FakeWebContents {
  destroyed = false;
  sent: Array<{ channel: string; payload: unknown }> = [];
  throwOnSend = false;

  isDestroyed(): boolean {
    return this.destroyed;
  }

  send(channel: string, payload: unknown): void {
    if (this.throwOnSend) {
      throw new TypeError("Object has been destroyed");
    }
    this.sent.push({ channel, payload });
  }
}

class FakeWindow extends EventEmitter {
  destroyed = false;
  webContents: FakeWebContents | null = new FakeWebContents();

  isDestroyed(): boolean {
    return this.destroyed;
  }

  close(): void {
    this.destroyed = true;
    this.emit("closed");
  }
}

test.describe("WindowRelay", () => {
  test("sends to the attached live window", () => {
    const relay = new WindowRelay<FakeWindow>();
    const window = new FakeWindow();

    const sent = relay.send(window, "agent:event", { ok: true });

    expect(sent).toBe(true);
    expect(window.webContents?.sent).toEqual([{ channel: "agent:event", payload: { ok: true } }]);
  });

  test("stops sending after the attached window closes", () => {
    const relay = new WindowRelay<FakeWindow>();
    const window = new FakeWindow();
    relay.attach(window);

    window.close();

    const sent = relay.sendAttached("agent:event", { ok: true });

    expect(sent).toBe(false);
    expect(window.webContents?.sent).toEqual([]);
  });

  test("reattaches to a replacement window after the first one closes", () => {
    const relay = new WindowRelay<FakeWindow>();
    const first = new FakeWindow();
    const second = new FakeWindow();

    relay.attach(first);
    first.close();
    relay.attach(second);

    const sent = relay.sendAttached("agent:event", { ok: true });

    expect(sent).toBe(true);
    expect(first.webContents?.sent).toEqual([]);
    expect(second.webContents?.sent).toEqual([{ channel: "agent:event", payload: { ok: true } }]);
  });

  test("returns false when webContents is already destroyed", () => {
    const relay = new WindowRelay<FakeWindow>();
    const window = new FakeWindow();
    if (!window.webContents) throw new Error("expected webContents");
    window.webContents.destroyed = true;

    const sent = relay.send(window, "agent:event", { ok: true });

    expect(sent).toBe(false);
  });

  test("swallows destroyed-object send errors", () => {
    const relay = new WindowRelay<FakeWindow>();
    const window = new FakeWindow();
    if (!window.webContents) throw new Error("expected webContents");
    window.webContents.throwOnSend = true;

    const sent = relay.send(window, "agent:event", { ok: true });

    expect(sent).toBe(false);
  });
});
