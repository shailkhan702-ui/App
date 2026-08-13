# Madinah Quran

A simple, mobile-first Qur'an reading app. The Holy Qur'an is organised into
its 30 traditional parts (Para / Juz). Read offline, zoom, bookmark pages, and
the app remembers where you stopped.

This is a **web app (PWA)** built with plain HTML, CSS, and JavaScript — no
server, no account, no internet needed once a Para has been opened.

---

## What's in this project

| File / folder | What it is |
|---|---|
| `1.pdf` … `30.pdf` | Your original Qur'an files, one per Para (untouched) |
| `index.html` | The app screen |
| `app.css` | The look/design |
| `app.js` | The app logic |
| `catalog.json` | The list of the 30 Para (names, pages, Surah ranges) |
| `vendor/` | The PDF viewer engine (pdf.js), stored locally for offline use |
| `icons/` | App icons |
| `manifest.webmanifest` | Makes it installable as an app |
| `sw.js` | The "service worker" that makes offline reading work |
| `INVENTORY.md` | The M0 analysis of all 30 PDFs |

---

## How to see it on your phone (no laptop needed)

The app must be opened over **https** (this is required for offline mode).
The easiest free way is **GitHub Pages**:

1. On your phone, open **github.com** and go to this repository.
2. Tap **Settings → Pages**.
3. Under **Branch**, choose `claude/mobile-book-library-ksuhz1` (or `main`
   after it is merged) and the `/ (root)` folder, then tap **Save**.
4. Wait ~1 minute. GitHub shows a link like
   `https://shailkhan702-ui.github.io/App/`.
5. Open that link in your phone browser. That's the app. 🎉
6. In your browser menu, tap **"Add to Home screen"** to keep it like a real app.

**First open needs internet** (to download the app and each Para you open).
After that, opened Para work with no internet.

---

## How to turn it into an Android app (APK/AAB) — later

Once the GitHub Pages link works on your phone, use **PWABuilder** (a website,
so it works from your phone):

1. Open **https://www.pwabuilder.com**.
2. Paste your GitHub Pages link and tap **Start**.
3. Choose **Android** and tap **Generate Package**.
4. Download the package. It contains the files needed to publish to the
   Google Play Store (or to install directly).

PWABuilder uses a method called a **Trusted Web Activity** — the Android app is
a thin wrapper around this same web app, so anything you fix here updates the
app too.

---

## Notes

- The PDFs are **scanned images**, so searching *inside* the text is not
  possible yet — that is planned for a later version. Searching the library
  (by Para number, name, or Surah) works now.
- Your reading position and bookmarks are stored **only on your device**.
