// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  if (error) {
    const msg = String((error as any)?.message || (error as any)?.reason || error);
    const stack = String((error as any)?.stack || "");
    if (
      msg.includes("katulampa.gopay.sh") ||
      msg.includes("play.google.com/log") ||
      msg.includes("faro-web-sdk") ||
      stack.includes("katulampa") ||
      stack.includes("faro")
    ) {
      return;
    }
  }
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("uncaughtException", (err) => record(err));
  process.on("unhandledRejection", (reason) => record(reason));
}

const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.length > 0) record(args[0]);
  originalConsoleError.apply(console, args);
};

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
