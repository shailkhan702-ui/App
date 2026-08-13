/* ===== Madinah Quran — service worker (offline) ===== */
var VERSION = "mq-v4";
var SHELL_CACHE = "mq-shell-" + VERSION;
var PDF_CACHE = "mq-pdf-v1";

// App shell: everything except the PDFs. Cached on install so the app
// itself always works offline.
var SHELL = [
  "./",
  "index.html",
  "app.css",
  "app.js",
  "catalog.json",
  "manifest.webmanifest",
  "vendor/pdf.min.js",
  "vendor/pdf.worker.min.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(function (c) {
      // Add individually so one missing file doesn't abort the whole install.
      return Promise.all(SHELL.map(function (url) {
        return c.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE && k !== PDF_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // only same-origin

  var isPdf = url.pathname.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    // PDFs: cache-first, then network; store after download so each Para
    // becomes available offline once it has been opened. Supports range
    // requests (pdf.js) by falling through to network for partial requests.
    if (req.headers.get("range")) {
      e.respondWith(fetch(req).catch(function () {
        return caches.match(req, { cacheName: PDF_CACHE, ignoreVary: true });
      }));
      return;
    }
    e.respondWith(
      caches.open(PDF_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          // Buffer the whole file first, then build two independent responses
          // (one to cache, one to return). Avoids response.clone() streaming,
          // which can deadlock in iOS Safari and freeze the download at 100%.
          return fetch(req).then(function (res) {
            if (!res || !res.ok) return res;
            var headers = {};
            res.headers.forEach(function (v, k) { headers[k] = v; });
            return res.blob().then(function (blob) {
              try { cache.put(req, new Response(blob, { status: 200, headers: headers })); } catch (e) {}
              return new Response(blob, { status: 200, headers: headers });
            });
          });
        });
      })
    );
    return;
  }

  // Shell & other same-origin assets: cache-first with network update.
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && (res.type === "basic")) {
          var copy = res.clone();
          caches.open(SHELL_CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // offline fallback to app shell for navigations
        if (req.mode === "navigate") return caches.match("index.html");
      });
    })
  );
});
