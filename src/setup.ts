import { GameService } from "gamez";
import { MessageHandler } from "./message-handler";
import { GameMethod, Message, SyncState } from "./message.interface";
import { createHub } from "./store";

/**
 * Sets up frame relay communication with the game service
 * @param gs Game service instance
 * @returns Promise that resolves with the configured message handler
 */
export function setupFrameRelay(gs: GameService) {
  return new Promise<MessageHandler>((resolve, reject) => {
    const messageHandler = new MessageHandler();
    // Reject the promise if the game service is not initialized within 60 seconds
    const timeout = setTimeout(reject, 60 * 1000, new Error("Frame Relay timeout"));

    // Set up the message handler to communicate with the game service
    messageHandler.onSyncStateMessage = (message: Message) => {
      if (message.method === SyncState.currLevel) {
        gs.setCurrLevel(message.payload as number);
      } else if (message.method === SyncState.levels) {
        const { idx, level } = message.payload as any;
        gs.levels[idx] = level as any[];
      }
    };

    messageHandler.onGameMessage = (message: Message) => {
      switch (message.method) {
        case GameMethod.start:
          clearTimeout(timeout);
          resolve(messageHandler);
          break;
      }
    };

    const hub = createHub(messageHandler);

    hub.initialize().catch(reject);
  });
}
