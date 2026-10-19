const port = Number(Deno.args[0] ?? 8000);
const root = Deno.cwd();

const contentTypes: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  svg: "image/svg+xml",
  webmanifest: "application/manifest+json",
  json: "application/json",
  png: "image/png",
};

const reloadSnippet =
  `<script>new EventSource("/__reload").onmessage = () => location.reload();</script>`;

const selfDestructingServiceWorker = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
  );
});
`;

const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

function broadcastReload() {
  for (const client of clients) {
    try {
      client.enqueue(encoder.encode("data: reload\n\n"));
    } catch {
      clients.delete(client);
    }
  }
}

let debounceTimer: number | undefined;
(async () => {
  for await (const event of Deno.watchFs(root)) {
    if (event.kind === "access") continue;
    if (event.paths.every((path) => path.includes("/.git/"))) continue;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(broadcastReload, 100);
  }
})();

const noStore = { "cache-control": "no-store" };

Deno.serve({ port }, async (request) => {
  const { pathname } = new URL(request.url);

  if (pathname === "/__reload") {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        clients.add(c);
        c.enqueue(encoder.encode(": connected\n\n"));
      },
      cancel() {
        clients.delete(controller);
      },
    });
    return new Response(body, {
      headers: { "content-type": "text/event-stream", ...noStore },
    });
  }

  if (pathname === "/sw.js") {
    return new Response(selfDestructingServiceWorker, {
      headers: { "content-type": contentTypes.js, ...noStore },
    });
  }

  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const requested = relativePath === "" || relativePath.endsWith("/")
    ? `${relativePath}index.html`
    : relativePath;
  if (requested.split("/").includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const file = await Deno.readFile(`${root}/${requested}`);
    const extension = requested.split(".").pop() ?? "";
    const contentType = contentTypes[extension] ?? "application/octet-stream";
    if (extension === "html") {
      const html = new TextDecoder().decode(file).replace("</body>", `${reloadSnippet}</body>`);
      return new Response(html, { headers: { "content-type": contentType, ...noStore } });
    }
    return new Response(file, { headers: { "content-type": contentType, ...noStore } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
});
