import { MessageHandler } from "./message-handler";
import { ControlMethod, GameMethod, MessageType, type Message, type SyncState } from "./message.interface";

// These are the list of states a iframe can cycle through.
export enum IFrameState {
  Bootstrapped = "bootstrapped", // Set when the iframeManager is bootstrapped
  Loaded = "loaded", // iframe script is loaded
  Initialized = "initialized", // Set when the iframeManager is fully initialized
}

export class IFrameController {
  private iframeState: IFrameState = IFrameState.Bootstrapped;
  private iframeWindow?: Window | null;
  private iframeSrc?: string;

  constructor(private messageHandler: MessageHandler) {}
  log(...x: any[]) {
    console.log("[IFrameController]:", ...x);
  }
  warn(...x: any[]) {
    console.warn("[IFrameController]:", ...x);
  }

  async init(iframe: HTMLIFrameElement) {
    this.log("Initializing iframe");

    if (this.iframeState === IFrameState.Bootstrapped) {
      this.iframeSrc = iframe.src;
      this.iframeWindow = iframe.contentWindow;
      this.iframeState = IFrameState.Loaded;
    }

    if (this.iframeState === IFrameState.Initialized) {
      return Promise.resolve(); // The iframe is already initialized
    } else if (this.iframeState === IFrameState.Loaded) {
      return new Promise<void>((resolve, reject) => {
        if (!this.iframeWindow) {
          reject(new Error("IFrame is undefined"));
          return;
        }

        // wait 30 seconds for the iframe to initialize
        const timeout = setTimeout(reject, 30 * 1000, "Unable to load page within 30 sec");

        window.addEventListener(
          "message",
          (event) => {
            const message = this.parseMessage(event.data);
            if (this.iframeWindow && message?.type === MessageType.control && message.method === ControlMethod.init) {
              clearTimeout(timeout);
              this.iframeState = IFrameState.Initialized;
              window.addEventListener("message", this.onMessage.bind(this));
              this.sendMessage(MessageType.control, { method: ControlMethod.init, id: message.id });
              resolve();
            }
          },
          { once: true }
        );
      });
    } else {
      // Unexpected state
      return Promise.reject(new Error("Unexpected iframe state"));
    }
  }

  private sendMessage(type: Message["type"], rest?: Omit<Message, "type">) {
    this.iframeWindow?.postMessage(JSON.stringify({ type, ...rest }), this.iframeSrc!);
  }

  private parseMessage(message: string) {
    try {
      return JSON.parse(message) as Message;
    } catch (error) {
      this.log("Error parsing message");
      return null;
    }
  }

  private onMessage(event: MessageEvent) {
    try {
      const message = this.parseMessage(event.data);
      if (!message || !message.type) {
        return;
      }

      switch (message.type) {
        case MessageType.control:
          this.messageHandler.onControlMessage(message);
          break;
        case MessageType.error:
          this.messageHandler.onErrorMessage(message);
          break;
        case MessageType.game:
          this.messageHandler.onGameMessage(message);
          break;
        case MessageType.request:
          this.messageHandler.onRequestMessage(message);
          break;
        case MessageType.sync:
          this.messageHandler.onSyncStateMessage(message);
          break;

        default:
          this.messageHandler.onUnknownMessage(message);
        // Do nothing
      }
    } catch (error) {
      this.warn("Error handling message from iframe:", error);
    }
  }

  /** Start the game */
  start() {
    this.sendMessage(MessageType.game, {
      method: GameMethod.start,
    });
  }

  /** Stops game connection */
  stop() {
    // Send a message to the iframe to stop t
    this.sendMessage(MessageType.game, {
      method: GameMethod.stop,
    });
  }

  terminate() {
    this.iframeWindow?.close();
    this.iframeWindow = null;
    this.iframeState = IFrameState.Bootstrapped;
  }

  /**
   * This method is used to keep values in sync between the main thread and the iframe thread.
   * It sends a message to the iframe with the specified value and payload.
   */
  public syncState(method: SyncState, payload: unknown) {
    this.sendMessage(MessageType.sync, { method, payload });
  }
}
