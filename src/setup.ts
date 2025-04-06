import { GameService } from "gamez";
import { MessageHandler } from "./message-handler";
import { ControlMethod, GameMethod, Message, MessageType, SyncState } from "./message.interface";
import { createHub } from "./store";

export function setupFrameRelay(gs: GameService, start: () => void) {
  const messageHandler = new MessageHandler();

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
        start();
        break;
    }
  };

  const hub = createHub(messageHandler);

  gs.addListener("back", () => {
    hub.sendMessageToParent(MessageType.control, ControlMethod.back);
  });

  hub.initialize().catch(() => {
    start();
  });

  return messageHandler;
}
