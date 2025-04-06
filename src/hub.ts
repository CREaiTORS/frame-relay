import {
  initializeCommunication,
  sendMessageToParent,
  sendMessageToParentAsync,
  uninitializeCommunication,
} from "./communication";
import { MessageHandler } from "./message-handler";

export class Hub {
  constructor(private messageHandler: MessageHandler) {}

  async initialize() {
    return await initializeCommunication(this.messageHandler);
  }

  uninitialize() {
    uninitializeCommunication();
  }

  sendMessageToParentAsync(...x: Parameters<typeof sendMessageToParentAsync>) {
    sendMessageToParentAsync(...x);
  }

  sendMessageToParent(...x: Parameters<typeof sendMessageToParent>) {
    sendMessageToParent(...x);
  }
}
