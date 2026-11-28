"use strict";

const BASE = self.registration.scope;
const PREFIX = "family-calendar-" + BASE;
const CACHE = PREFIX + "-v2";


const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
].map(path => new URL(path, BASE).href);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      const requests = FILES.map(url =>
        new Request(url, { cache: "reload" })
      );
      await cache.addAll(requests);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();

    await Promise.all(
      names
        .filter(name =>
          name.startsWith(PREFIX + "-") && name !== CACHE
        )
        .map(name => caches.delete(name))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (
    request.method !== "GET" ||
    !request.url.startsWith(BASE)
  ) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    if (request.mode === "navigate") {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch {
        // Нет сети — используем сохранённую страницу.
      }

      const page = await cache.match(
        new URL("./index.html", BASE).href
      );

      return page || new Response(
        "Подключитесь к интернету и откройте календарь снова.",
        {
          status: 503,
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          }
        }
      );
    }

    const saved = await cache.match(request);
    return saved || fetch(request);
  })());
});
