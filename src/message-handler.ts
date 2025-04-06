import { Message } from "./message.interface";

export class MessageHandler {
  onControlMessage(_message: Message) {}
  onErrorMessage(_message: Message) {}
  onGameMessage(_message: Message) {}
  onRequestMessage(_message: Message) {}
  onSyncStateMessage(_message: Message) {}
  onUnknownMessage(_message: Message) {}
}
