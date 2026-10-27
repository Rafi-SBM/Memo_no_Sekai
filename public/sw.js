/**
 * Offline shell for Memo no Sekai.
 *
 * Navigations are network-first so a deploy is picked up immediately, with the
 * cached shell as the offline fallback. Everything else is cache-first, because
 * build assets carry content hashes and never change under the same URL.
 *
 * Memo text is never cached here: it lives in IndexedDB, and `/api/` is skipped
 * so a stale workspace can never be served back to the editor.
 */
const CACHE_NAME = "memo-no-sekai-shell-v3";
const APP_SHELL = ["/", "/manifest.webmanifest", "/app.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // One missing asset must not abort the whole install.
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Only a complete, same-origin, basic response is worth keeping. */
const isCacheable = (response) =>
  response && response.status === 200 && response.type === "basic" && !response.headers.has("set-cookie");

const putInCache = (request, response) => {
  if (!isCacheable(response)) return;
  const copy = response.clone();
  void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy).catch(() => undefined));
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          putInCache(request, response);
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          putInCache(request, response);
          return response;
        }),
    ),
  );
});
