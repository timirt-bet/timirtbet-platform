// Timirtbet's service worker: lets the installed app open without a connection. Pages come from the
// network first (so updates show at once); the last page is kept for when there is no connection.
// The API and other sites are never touched.
const CACHE = "timirtbet-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || r.mode !== "navigate" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(r).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); }
    return res;
  }).catch(() => caches.match("/").then((hit) => hit || Response.error())));
});
