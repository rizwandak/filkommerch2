export function renderErrorPage(error?: any): string {
  const message = error?.message || (typeof error === "string" ? error : "");
  const stack = error?.stack || "";
  const details = message || stack ? `
      <details style="text-align: left; margin: 1rem 0; font-size: 11px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; max-height: 200px; overflow: auto;">
        <summary style="cursor: pointer; font-weight: 600; color: #dc2626;">Detail Kesalahan (Debug)</summary>
        <pre style="margin-top: 6px; white-space: pre-wrap; font-family: monospace; color: #1f2937;">${message}${stack ? `\n\n${stack}` : ""}</pre>
      </details>` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 32rem; width: 100%; text-align: center; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      ${details}
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
