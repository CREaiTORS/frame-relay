import { getOrigin, parseMessage, ssrSafeWindow, validateOrigin } from "./helpers";
import { MessageHandler } from "./message-handler";
import { ControlMethod, Message, MessageType } from "./message.interface";

export class Communication {
  public static currentWindow: Window | any;
  public static parentOrigin: string | null;
  public static parentWindow: Window | any;

  static parentMessageQueue: Message[] = [];
  static nextMessageId = 0;
  static callbacks: Map<string, Function> = new Map();
  static messageListener: Function;
}

export function initializeCommunication(messageHandler: MessageHandler) {
  Communication.currentWindow = Communication.currentWindow || ssrSafeWindow();
  // If we are in an iframe, our parent window is the one hosting us (i.e., window.parent); otherwise,
  // it's the window that opened us (i.e., window.opener)
  Communication.parentWindow =
    Communication.currentWindow.parent !== Communication.currentWindow.self
      ? Communication.currentWindow.parent
      : Communication.currentWindow.opener;

  if (!Communication.parentWindow) {
    return Promise.reject(new Error("Initialization Failed. No Parent window found."));
  } else {
    // Listen for messages post to our window
    Communication.messageListener = createMessageListner(messageHandler);
    Communication.currentWindow.addEventListener("message", Communication.messageListener, false);
  }

  try {
    // Send the initialized message to any origin, because at this point we most likely don't know the origin
    // of the parent window, and this message contains no data that could pose a security risk.
    Communication.parentOrigin = getOrigin();
    return sendMessageToParentAsync<string[]>(MessageType.control, ControlMethod.init);
  } finally {
    Communication.parentOrigin = null;
  }
}

export function uninitializeCommunication(): void {
  if (Communication.currentWindow) {
    Communication.currentWindow.removeEventListener("message", Communication.messageListener, false);
  }

  Communication.currentWindow = null;
  Communication.parentWindow = null;
  Communication.parentOrigin = null;
  Communication.parentMessageQueue = [];
  Communication.nextMessageId = 0;
  Communication.callbacks.clear();
}

export async function sendMessageToParentAsync<T>(type: MessageType, actionName: string, args?: any[]): Promise<T> {
  const request = sendMessageToParentHelper(type, actionName, args);
  return new Promise<T>((resolve) => {
    Communication.callbacks.set(request.id!, resolve);
  });
}

export function sendMessageToParent(type: MessageType, actionName: string, args?: any[], callback?: Function): void {
  const request = sendMessageToParentHelper(type, actionName, args);
  if (callback) {
    Communication.callbacks.set(request.id!, callback);
  }
}

function createMessageListner(messageHandler: MessageHandler) {
  return async function processIncomingMessage(evt: MessageEvent): Promise<void> {
    // Process only if we received a valid message
    if (!evt || !evt.data || typeof evt.data !== "string") {
      return;
    }

    if (!shouldProcessIncomingMessage(evt.source, evt.origin)) {
      return;
    }

    // Update our parent relationship based on this message
    updateRelationships(evt.source as Window, evt.origin!);

    // Handle the message if the source is from the parent
    if (evt.source === Communication.parentWindow) {
      handleIncomingMessageFromParent(evt, messageHandler);
      return;
    }
  };
}

function shouldProcessIncomingMessage(messageSource: MessageEventSource | null, messageOrigin: string) {
  // Process if message source is a different window and if origin is either in
  // Teams' pre-known whitelist or supplied as valid origin by user during initialization
  if (Communication.currentWindow && messageSource === Communication.currentWindow) {
    console.log("Should not process message because it is coming from the current window");
    return false;
  } else if (
    Communication.currentWindow &&
    Communication.currentWindow.location &&
    messageOrigin &&
    messageOrigin === Communication.currentWindow.location.origin
  ) {
    return true;
  } else {
    let messageOriginURL: URL;
    try {
      messageOriginURL = new URL(messageOrigin);
    } catch (_) {
      console.log("Message has an invalid origin of %s", messageOrigin);
      return false;
    }

    const isOriginValid = validateOrigin(messageOriginURL);
    if (!isOriginValid) {
      console.log("Message not whitelisted for origin %s", messageOrigin);
    }
    return isOriginValid;
  }
}

function handleIncomingMessageFromParent(evt: MessageEvent, messageHandler: MessageHandler): void {
  const message = parseMessage(evt);
  if (!message || !message.type) {
    return;
  }

  if (message.id) {
    Communication.callbacks.get(message.id)?.();
  }

  switch (message.type) {
    case MessageType.control:
      messageHandler.onControlMessage(message);
      break;
    case MessageType.error:
      messageHandler.onErrorMessage(message);
      break;
    case MessageType.game:
      messageHandler.onGameMessage(message);
      break;
    case MessageType.request:
      messageHandler.onRequestMessage(message);
      break;
    case MessageType.sync:
      messageHandler.onSyncStateMessage(message);
      break;

    default:
      messageHandler.onUnknownMessage(message);
    // Do nothing
  }
}

function sendMessageToParentHelper(type: MessageType, actionName: string, args: any[] | undefined): Message {
  const message = createMessageRequest(type, actionName, args);

  if (Communication.parentWindow && Communication.parentOrigin) {
    console.log("sendMessageToParent", message, Communication.parentOrigin);
    Communication.parentWindow.postMessage(JSON.stringify(message), Communication.parentOrigin);
  } else {
    Communication.parentMessageQueue.push(message);
  }

  return message;
}

function updateRelationships(messageSource: Window, messageOrigin: string): void {
  // Determine if the source of the message is our parent and update our window and
  // origin pointer accordingly.
  if (
    !Communication.parentWindow ||
    Communication.parentWindow.closed ||
    messageSource === Communication.parentWindow
  ) {
    Communication.parentWindow = messageSource;
    Communication.parentOrigin = messageOrigin;
  }

  // Clean up pointers to closed parent windows
  if (Communication.parentWindow && Communication.parentWindow.closed) {
    Communication.parentWindow = null;
    Communication.parentOrigin = null;
  }

  // If we have any messages in our queue, send them now
  flushMessageQueue();
}

function createMessageRequest(type: MessageType, method: any, args: any[] | undefined): Message {
  return {
    id: (Communication.nextMessageId++).toString(),
    type,
    method,
    payload: args || [],
  };
}

function flushMessageQueue() {
  if (!Communication.parentWindow || !Communication.parentOrigin || Communication.parentMessageQueue.length === 0) {
    return;
  }
  while (Communication.parentMessageQueue.length > 0) {
    const message = Communication.parentMessageQueue.shift();
    if (message) {
      Communication.parentWindow.postMessage(JSON.stringify(message), Communication.parentOrigin);
    }
  }
}
