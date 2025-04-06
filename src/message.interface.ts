export enum MessageType {
  control = "control",
  error = "error",
  game = "game",
  request = "request",
  sync = "sync",
}

export enum GameMethod {
  start = "start",
  stop = "stop",
  end = "end",
  report = "report",
}

export enum ControlMethod {
  init = "init",
  back = "back",
}

export enum SyncState {
  levels = "levels",
  currLevel = "currLevel",
}

export type Message = {
  id?: string;
  type: MessageType;
  method?: GameMethod | ControlMethod | SyncState;
  text?: string;
  payload?: unknown;
};
