import { ControlMethod, MessageType } from "./message.interface";
import { getHub } from "./store";

export function navigateBack() {
  getHub().sendMessageToParent(MessageType.control, ControlMethod.back);
}
