import { type Message } from "./message.interface";

export function parseMessage(event: MessageEvent) {
  try {
    return JSON.parse(event.data) as Message;
  } catch (error) {
    return null;
  }
}

const ValidOriginsList = ["revitalaize.vercel.app", "localhost:3000", "revitalaize-games.netlify.app"];
export function validateOrigin(url: URL) {
  return ValidOriginsList.some((pattern) => validateHostAgainstPattern(pattern, url.host));
}

function validateHostAgainstPattern(pattern: string, host: string): boolean {
  if (pattern.substring(0, 2) === "*.") {
    const suffix = pattern.substring(1);
    if (
      host.length > suffix.length &&
      host.split(".").length === suffix.split(".").length &&
      host.substring(host.length - suffix.length) === suffix
    ) {
      return true;
    }
  } else if (pattern === host) {
    return true;
  }
  return false;
}

export function ssrSafeWindow() {
  if (typeof window !== "undefined") {
    return window;
  } else {
    // This should NEVER actually be written. It's just here to make TypeScript happy.
    throw new Error("window object undefined at SSR check");
  }
}

export function getOrigin() {
  const referrer = document.referrer;
  if (referrer) {
    try {
      const url = new URL(referrer);
      return url.origin;
    } catch (error) {
      console.log("Error constructing URL:", error);
    }
  } else {
    console.log("No referrer URL found.");
  }

  return "*";
}
