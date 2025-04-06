import { Hub } from "./hub";

let _hub: Hub;

export function createHub(...x: ConstructorParameters<typeof Hub>): Hub {
  return (_hub = new Hub(...x));
}

export function getHub() {
  return _hub;
}
