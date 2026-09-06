const CACHE = "wb-v41";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.png",
  "./icon-192.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // 外部资源（新闻来源等）不缓存

  // 页面导航：network-first，保证每次看到最新内容；离线时回退缓存
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const cp = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // 其他静态资源：cache-first + 后台更新
  e.respondWith(
    caches.match(e.request).then((r) => {
      if (r) return r;
      return fetch(e.request)
        .then((res) => {
          const cp = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp));
          return res;
        })
        .catch(() => {});
    })
  );
});
