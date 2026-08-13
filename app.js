/* ===== Madinah Quran — app logic ===== */
(function () {
  "use strict";

  // pdf.js worker (local, offline-safe)
  if (window["pdfjsLib"]) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
  }

  // ---------- storage helpers ----------
  var LS = window.localStorage;
  function readJSON(key, fallback) {
    try { var v = LS.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { LS.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  var K_PROGRESS = "mq:progress", K_BOOKMARKS = "mq:bookmarks",
      K_THEME = "mq:theme", K_LAST = "mq:lastOpened";

  function getProgress() { return readJSON(K_PROGRESS, {}); }
  function setProgress(id, page, total) {
    var p = getProgress();
    p[id] = { page: page, total: total, updated: Date.now() };
    writeJSON(K_PROGRESS, p);
    writeJSON(K_LAST, id);
  }
  function getBookmarks() { return readJSON(K_BOOKMARKS, []); }
  function setBookmarks(list) { writeJSON(K_BOOKMARKS, list); }
  function hasBookmark(id, page) {
    return getBookmarks().some(function (b) { return b.id === id && b.page === page; });
  }
  function toggleBookmark(id, page) {
    var list = getBookmarks();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id && list[i].page === page) { idx = i; break; }
    }
    if (idx >= 0) { list.splice(idx, 1); }
    else { list.push({ id: id, page: page, ts: Date.now() }); }
    setBookmarks(list);
    return idx < 0; // true if added
  }

  // ---------- state ----------
  var CATALOG = [];
  var byId = {};
  var current = null;   // current reader state

  // ---------- dom ----------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var views = {
    library: $("#view-library"),
    details: $("#view-details"),
    reader: $("#view-reader"),
    bookmarks: $("#view-bookmarks")
  };

  function showView(name) {
    Object.keys(views).forEach(function (k) {
      views[k].classList.toggle("is-active", k === name);
    });
    if (name !== "reader") { window.scrollTo(0, 0); }
  }

  // ---------- theme ----------
  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode);
    else root.removeAttribute("data-theme"); // system
    var btn = $("#theme-btn");
    if (btn) btn.textContent = (mode === "dark") ? "☀️" : (mode === "light" ? "🌙" : "🌗");
  }
  function initTheme() {
    var mode = LS.getItem(K_THEME) || "system";
    applyTheme(mode);
    $("#theme-btn").addEventListener("click", function () {
      var cur = LS.getItem(K_THEME) || "system";
      var next = cur === "system" ? "light" : cur === "light" ? "dark" : "system";
      LS.setItem(K_THEME, next);
      applyTheme(next);
    });
  }

  // ---------- rendering: library ----------
  function coverHTML(b, large) {
    return '<div class="c-frame"></div>' +
      '<div class="c-para">Para</div>' +
      '<div class="c-num">' + b.para + '</div>' +
      '<div class="c-ar">' + b.nameAr + '</div>';
  }

  function progressFor(b) {
    var p = getProgress()[b.id];
    if (!p || !p.page || p.page <= 1) return null;
    var total = p.total || b.pages;
    var pct = Math.max(1, Math.min(100, Math.round((p.page / total) * 100)));
    return { page: p.page, total: total, pct: pct, updated: p.updated };
  }

  function cardHTML(b) {
    var pr = progressFor(b);
    var prog;
    if (pr) {
      prog = '<div class="progress">' +
        '<div class="progress-bar"><i style="width:' + pr.pct + '%"></i></div>' +
        '<div class="progress-label">' + pr.pct + '% · page ' + pr.page + '/' + pr.total + '</div>' +
        '</div>';
    } else {
      prog = '<div class="progress"><div class="badge-new">Not started</div></div>';
    }
    return '<article class="card" data-id="' + b.id + '" tabindex="0">' +
      '<div class="cover">' + coverHTML(b) + '</div>' +
      '<div class="card-body">' +
      '<div class="card-title">Para ' + b.para + ' · ' + b.name + '</div>' +
      '<div class="card-sub">' + b.range + '</div>' +
      prog +
      '</div></article>';
  }

  function renderGrid(list) {
    var grid = $("#grid");
    grid.innerHTML = list.map(cardHTML).join("");
    $("#grid-empty").hidden = list.length > 0;
  }

  function renderContinueBanner() {
    var el = $("#continue-banner");
    var lastId = readJSON(K_LAST, null);
    var pr = lastId != null ? getProgress()[lastId] : null;
    if (lastId == null || !byId[lastId] || !pr || !pr.page || pr.page <= 1) {
      el.hidden = true; return;
    }
    var b = byId[lastId];
    el.hidden = false;
    el.innerHTML =
      '<div><div class="cb-label">Continue reading</div>' +
      '<div class="cb-title">Para ' + b.para + ' · ' + b.name + '</div></div>' +
      '<div class="cb-go">Page ' + pr.page + ' ›</div>';
    el.onclick = function () { openReader(b.id, pr.page); };
  }

  function refreshLibrary() {
    var q = $("#search").value.trim();
    renderGrid(filterCatalog(q));
    renderContinueBanner();
  }

  function filterCatalog(q) {
    if (!q) return CATALOG.slice();
    var s = q.toLowerCase();
    return CATALOG.filter(function (b) {
      return ("para " + b.para).indexOf(s) >= 0 ||
        String(b.para) === s ||
        b.name.toLowerCase().indexOf(s) >= 0 ||
        (b.nameAr && b.nameAr.indexOf(q) >= 0) ||
        b.range.toLowerCase().indexOf(s) >= 0;
    });
  }

  // ---------- details ----------
  function openDetails(id) {
    var b = byId[id];
    if (!b) return;
    current = null;
    $("#d-title").textContent = "Para " + b.para;
    $("#d-cover").innerHTML = coverHTML(b, true);
    $("#d-name").textContent = "Para " + b.para + " · " + b.name;
    $("#d-name-ar").textContent = b.nameAr;
    $("#d-range").textContent = b.range;
    $("#d-pages").textContent = b.pages + " pages";
    var pr = progressFor(b);
    $("#d-progress").textContent = pr
      ? (pr.pct + "% complete · last on page " + pr.page + " of " + pr.total)
      : "Not started yet";
    var cont = $("#btn-continue");
    if (pr) { cont.disabled = false; cont.textContent = "Continue · page " + pr.page; }
    else { cont.disabled = true; cont.textContent = "Continue reading"; }

    $("#btn-read").onclick = function () { openReader(b.id, 1); };
    cont.onclick = function () { openReader(b.id, pr ? pr.page : 1); };
    $("#btn-bookmarks").onclick = function () { openBookmarks(b.id); };
    $("#view-details").dataset.id = b.id;
    showView("details");
  }

  // ---------- reader ----------
  var pdfDoc = null, renderTask = null, fitScale = 1, zoom = 1, renderToken = 0;

  function setLoading(on, text) {
    $("#r-loading").hidden = !on;
    if (text) $("#r-loading-text").textContent = text;
  }
  function setError(msg, book) {
    var el = $("#r-error");
    if (!msg) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = "";
    var p = document.createElement("div");
    p.textContent = msg;
    el.appendChild(p);
    if (book) {
      var btn = document.createElement("button");
      btn.className = "btn btn-secondary";
      btn.style.marginTop = "18px";
      btn.textContent = "Try again";
      btn.onclick = function () { setError(""); loadPdf(book); };
      el.appendChild(btn);
    }
  }

  function openReader(id, page) {
    var b = byId[id];
    if (!b) return;
    current = { id: id, page: page || 1, total: b.pages };
    $("#r-title").textContent = "Para " + b.para + " · " + b.name;
    showView("reader");
    setError("");
    zoom = 1;
    loadPdf(b);
  }

  // Download the whole PDF ourselves, then hand the complete bytes to pdf.js.
  // This avoids pdf.js internal range/streaming, which is unreliable in iOS
  // Safari behind a service worker, and it matches our per-Para offline cache.
  function fetchPdfBytes(url, onPct) {
    return fetch(url, { cache: "default" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      var len = parseInt(res.headers.get("Content-Length") || "0", 10);
      if (!res.body || !res.body.getReader) {
        return res.arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
      }
      var reader = res.body.getReader();
      var chunks = [], received = 0;
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            var out = new Uint8Array(received), pos = 0;
            for (var i = 0; i < chunks.length; i++) { out.set(chunks[i], pos); pos += chunks[i].length; }
            return out;
          }
          chunks.push(r.value); received += r.value.length;
          if (len && onPct) onPct(Math.min(100, Math.round((received / len) * 100)));
          return pump();
        });
      })();
    });
  }

  function loadPdf(b) {
    setError("");
    setLoading(true, "Downloading Para " + b.para + "…");
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (e) {} pdfDoc = null; }
    var done = false;
    var watchdog = setTimeout(function () {
      if (!done) {
        setLoading(false);
        setError("This Para is taking too long to open. Please check your internet connection, then tap Try again.", b);
      }
    }, 45000);

    fetchPdfBytes(b.file, function (pct) {
      setLoading(true, "Downloading Para " + b.para + "… " + pct + "%");
    }).then(function (bytes) {
      setLoading(true, "Preparing page…");
      var task = pdfjsLib.getDocument({
        data: bytes,
        disableStream: true,
        disableAutoFetch: true,
        isEvalSupported: false
      });
      return task.promise;
    }).then(function (doc) {
      done = true; clearTimeout(watchdog);
      pdfDoc = doc;
      current.total = doc.numPages;
      if (current.page > doc.numPages) current.page = doc.numPages;
      if (current.page < 1) current.page = 1;
      setLoading(false);
      renderPage();
    }).catch(function (err) {
      done = true; clearTimeout(watchdog);
      setLoading(false);
      var offline = (typeof navigator !== "undefined" && navigator.onLine === false);
      var msg = offline
        ? "You are offline and this Para hasn't been downloaded yet. Connect to the internet once to open it, then it will work offline."
        : "Could not open this Para. Please tap Try again.";
      setError(msg + "\n\n(" + (err && err.message ? err.message : err) + ")", b);
    });
  }

  // iOS Safari silently fails to paint canvases above a memory limit; cap the
  // internal pixel area so pages always render (still sharp on phone screens).
  var MAX_CANVAS_AREA = 5500000;

  function renderPage() {
    if (!pdfDoc || !current) return;
    var myToken = ++renderToken;
    setError("");
    pdfDoc.getPage(current.page).then(function (page) {
      if (myToken !== renderToken) return;
      var base = page.getViewport({ scale: 1 });
      fitScale = Math.max(0.2, ($("#r-canvas-wrap").clientWidth - 8) / base.width);
      var cssScale = fitScale * zoom;              // layout size
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var renderScale = cssScale * dpr;            // internal resolution
      var area = (base.width * renderScale) * (base.height * renderScale);
      if (area > MAX_CANVAS_AREA) renderScale *= Math.sqrt(MAX_CANVAS_AREA / area);

      var viewport = page.getViewport({ scale: renderScale });
      var canvas = $("#r-canvas");
      var ctx = canvas.getContext("2d", { alpha: false });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = Math.round(base.width * cssScale) + "px";
      canvas.style.height = Math.round(base.height * cssScale) + "px";
      canvas.style.transform = "none";

      if (renderTask) { try { renderTask.cancel(); } catch (e) {} }
      renderTask = page.render({ canvasContext: ctx, viewport: viewport });
      renderTask.promise.then(function () {
        if (myToken !== renderToken) return;
        renderTask = null;
        updateReaderChrome();
        // save progress
        setProgress(current.id, current.page, current.total);
      }).catch(function (e) {
        if (e && e.name === "RenderingCancelledException") return;
      });
    }).catch(function () {
      setError("Could not render this page.");
    });
  }

  function updateReaderChrome() {
    $("#r-page").textContent = current.page + " / " + current.total;
    $("#r-prev").disabled = current.page <= 1;
    $("#r-next").disabled = current.page >= current.total;
    var mark = hasBookmark(current.id, current.page);
    $("#r-bookmark").textContent = mark ? "★" : "☆";
  }

  function goPage(delta) {
    if (!current) return;
    var np = current.page + delta;
    if (np < 1 || np > current.total) return;
    current.page = np;
    zoom = 1;
    var wrap = $("#r-canvas-wrap"); wrap.scrollTop = 0; wrap.scrollLeft = 0;
    renderPage();
  }

  function setZoom(z) {
    zoom = Math.max(1, Math.min(4, z));
    renderPage();
  }

  // ---------- bookmarks screen ----------
  function openBookmarks(filterId) {
    var list = getBookmarks().slice().sort(function (a, b) {
      return (b.ts || 0) - (a.ts || 0);
    });
    if (filterId != null) list = list.filter(function (x) { return x.id === filterId; });
    $("#bm-title").textContent = filterId != null && byId[filterId]
      ? "Bookmarks · Para " + byId[filterId].para : "Bookmarks";
    $("#view-bookmarks").dataset.filter = (filterId != null ? filterId : "");
    var host = $("#bm-list");
    host.innerHTML = list.map(function (bm) {
      var b = byId[bm.id]; if (!b) return "";
      var d = new Date(bm.ts || Date.now());
      var when = d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return '<div class="bm-item" data-id="' + bm.id + '" data-page="' + bm.page + '">' +
        '<div class="bm-thumb">' + b.para + '</div>' +
        '<div class="bm-main"><div class="bm-name">Para ' + b.para + ' · ' + b.name + '</div>' +
        '<div class="bm-sub">Page ' + bm.page + ' · ' + when + '</div></div>' +
        '<button class="bm-del" data-del="' + bm.id + '_' + bm.page + '" aria-label="Remove">🗑</button>' +
        '</div>';
    }).join("");
    $("#bm-empty").hidden = list.length > 0;
    showView("bookmarks");
  }

  // ---------- events ----------
  function bindEvents() {
    // search
    var searchEl = $("#search");
    var t = null;
    searchEl.addEventListener("input", function () {
      clearTimeout(t); t = setTimeout(refreshLibrary, 120);
    });

    // grid card click
    $("#grid").addEventListener("click", function (e) {
      var card = e.target.closest(".card"); if (!card) return;
      openDetails(parseInt(card.dataset.id, 10));
    });
    $("#grid").addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var card = e.target.closest(".card"); if (!card) return;
      openDetails(parseInt(card.dataset.id, 10));
    });

    // back buttons
    document.querySelectorAll("[data-back-to]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var to = btn.dataset.backTo;
        if (to === "library") { refreshLibrary(); showView("library"); }
        else if (to === "details") {
          var id = parseInt($("#view-details").dataset.id || current && current.id, 10);
          if (id) openDetails(id); else { refreshLibrary(); showView("library"); }
        }
      });
    });

    // reader controls
    $("#r-prev").addEventListener("click", function () { goPage(-1); });
    $("#r-next").addEventListener("click", function () { goPage(1); });
    $("#r-zoom-in").addEventListener("click", function () { setZoom(zoom + 0.5); });
    $("#r-zoom-out").addEventListener("click", function () { setZoom(zoom - 0.5); });
    $("#r-bookmark").addEventListener("click", function () {
      if (!current) return;
      var added = toggleBookmark(current.id, current.page);
      $("#r-bookmark").textContent = added ? "★" : "☆";
    });

    // bookmarks list interactions
    $("#bm-list").addEventListener("click", function (e) {
      var del = e.target.closest(".bm-del");
      if (del) {
        e.stopPropagation();
        var parts = del.dataset.del.split("_");
        var id = parseInt(parts[0], 10), page = parseInt(parts[1], 10);
        var list = getBookmarks().filter(function (b) { return !(b.id === id && b.page === page); });
        setBookmarks(list);
        var f = $("#view-bookmarks").dataset.filter;
        openBookmarks(f === "" ? null : parseInt(f, 10));
        return;
      }
      var item = e.target.closest(".bm-item"); if (!item) return;
      openReader(parseInt(item.dataset.id, 10), parseInt(item.dataset.page, 10));
    });

    // keyboard (desktop testing)
    document.addEventListener("keydown", function (e) {
      if (!views.reader.classList.contains("is-active")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goPage(1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPage(-1);
    });

    // re-fit on resize/orientation
    var rt = null;
    window.addEventListener("resize", function () {
      if (!views.reader.classList.contains("is-active") || !pdfDoc) return;
      clearTimeout(rt); rt = setTimeout(renderPage, 200);
    });

    bindGestures();
  }

  // ---------- touch gestures: swipe + pinch + double-tap ----------
  function bindGestures() {
    var wrap = $("#r-canvas-wrap");
    var canvas = $("#r-canvas");
    var startX = 0, startY = 0, startT = 0, moved = false;
    var pinch = null; // {startDist, startZoom}
    var lastTap = 0;

    function dist(t) {
      var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.hypot(dx, dy);
    }

    wrap.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        pinch = { startDist: dist(e.touches), startZoom: zoom };
      } else if (e.touches.length === 1) {
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startT = Date.now(); moved = false;
      }
    }, { passive: true });

    wrap.addEventListener("touchmove", function (e) {
      if (pinch && e.touches.length === 2) {
        var ratio = dist(e.touches) / pinch.startDist;
        var live = Math.max(1, Math.min(4, pinch.startZoom * ratio));
        // live visual feedback via CSS scale relative to current render
        canvas.style.transform = "scale(" + (live / zoom) + ")";
        e.preventDefault();
      } else if (e.touches.length === 1) {
        if (Math.abs(e.touches[0].clientX - startX) > 10 ||
            Math.abs(e.touches[0].clientY - startY) > 10) moved = true;
      }
    }, { passive: false });

    wrap.addEventListener("touchend", function (e) {
      if (pinch) {
        var m = /scale\(([-0-9.]+)\)/.exec(canvas.style.transform);
        canvas.style.transform = "none";
        if (m) setZoom(zoom * parseFloat(m[1]));
        pinch = null;
        return;
      }
      // swipe navigation only when not zoomed in
      var dt = Date.now() - startT;
      if (zoom <= 1.01 && dt < 500) {
        var dx = (e.changedTouches[0].clientX - startX);
        var dy = (e.changedTouches[0].clientY - startY);
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
          // reading order left-to-right within a Para: swipe left => next
          if (dx < 0) goPage(1); else goPage(-1);
          return;
        }
      }
      // double-tap to zoom
      if (!moved) {
        var now = Date.now();
        if (now - lastTap < 300) {
          setZoom(zoom > 1.01 ? 1 : 2);
          lastTap = 0;
        } else { lastTap = now; }
      }
    }, { passive: true });
  }

  // ---------- boot ----------
  function boot() {
    initTheme();
    bindEvents();
    fetch("catalog.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        CATALOG = data.books || [];
        CATALOG.forEach(function (b) { byId[b.id] = b; });
        refreshLibrary();
      })
      .catch(function () {
        $("#grid-empty").hidden = false;
        $("#grid-empty").textContent = "Could not load the library list.";
      });

    // register service worker for offline
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      });
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
