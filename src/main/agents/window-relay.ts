type WebContentsLike = {
  isDestroyed(): boolean;
  send(channel: string, payload: unknown): void;
};

type WindowLike = {
  isDestroyed(): boolean;
  once(event: "closed", listener: () => void): void;
  webContents?: WebContentsLike | null;
};

export class WindowRelay<TWindow extends WindowLike = WindowLike> {
  private attachedWindow: TWindow | null = null;

  attach(window: TWindow): void {
    this.attachedWindow = window;
    window.once("closed", () => {
      if (this.attachedWindow === window) {
        this.attachedWindow = null;
      }
    });
  }

  send(window: TWindow | null | undefined, channel: string, payload: unknown): boolean {
    if (!window || window.isDestroyed()) {
      return false;
    }

    const contents = window.webContents;
    if (!contents || contents.isDestroyed()) {
      return false;
    }

    try {
      contents.send(channel, payload);
      return true;
    } catch {
      return false;
    }
  }

  sendAttached(channel: string, payload: unknown): boolean {
    return this.send(this.attachedWindow, channel, payload);
  }
}
