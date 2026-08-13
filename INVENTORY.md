# M0 — PDF Inventory & Analysis

**Project:** Mobile Book Library
**Date analyzed:** 2026-08-13
**Files analyzed:** 30 PDFs (`1.pdf` … `30.pdf`), stored at repo root on `main`.

## What these books actually are

All 30 files together form **one complete Qur'an (Qur'an Majīd)**, split into its
traditional **30 parts (Juz / Para)**. Each PDF = one Juz, in order:

- `1.pdf` = Juz 1 (starts at Surah Al‑Fatihah)
- `2.pdf` = Juz 2 ("Sayaqūl") … and so on …
- `30.pdf` = Juz 30 ("'Amma", starts at Surah An‑Naba')

The internal page headers run continuously (Juz 2 starts on printed page 21,
Juz 30 on printed page 525), confirming this is a single mushaf cut into 30 files.

## Uniform properties (true for ALL 30 files)

| Property | Finding |
|---|---|
| PDF type | **Scanned images** (digitised with CamScanner) |
| Selectable text | **No** — there is no text layer |
| Internal Table of Contents | **No** |
| Internal PDF bookmarks | **No** |
| Embedded title / author metadata | **Empty** |
| Contains images | Yes (every page is a scanned image) |
| Contains tables/diagrams | No |
| Dedicated cover image | No (covers must be generated) |
| Displayable without conversion | **Yes** — standard PDFs, open directly |
| Author | — (Qur'an; no conventional author) |
| Language | Arabic script (scanned print edition) |

**Totals:** 551 pages across 30 files, ~436 MB combined.

## Per‑book table

| # | File | Juz / Para (name) | Pages | Size (MB) |
|---|------|-------------------|-------|-----------|
| 1 | 1.pdf | Juz 1 — Alif Lām Mīm | 20 | 17.8 |
| 2 | 2.pdf | Juz 2 — Sayaqūl | 18 | 16.3 |
| 3 | 3.pdf | Juz 3 — Tilkal‑Rusul | 18 | 14.8 |
| 4 | 4.pdf | Juz 4 — Lan Tanālū | 18 | 13.7 |
| 5 | 5.pdf | Juz 5 — Wal‑Muḥṣanāt | 18 | 15.7 |
| 6 | 6.pdf | Juz 6 — Lā Yuḥibbullāh | 18 | 12.7 |
| 7 | 7.pdf | Juz 7 — Wa Idhā Samiʿū | 18 | 14.6 |
| 8 | 8.pdf | Juz 8 — Wa Law Annanā | 18 | 15.8 |
| 9 | 9.pdf | Juz 9 — Qālal‑Malaʾu | 18 | 15.8 |
| 10 | 10.pdf | Juz 10 — Wa‑ʿlamū | 18 | 14.7 |
| 11 | 11.pdf | Juz 11 — Yaʿtadhirūn | 18 | 15.5 |
| 12 | 12.pdf | Juz 12 — Wa Mā Min Dābbah | 18 | 15.0 |
| 13 | 13.pdf | Juz 13 — Wa Mā Ubarriʾu | 18 | 15.4 |
| 14 | 14.pdf | Juz 14 — Rubamā | 18 | 14.4 |
| 15 | 15.pdf | Juz 15 — Subḥānalladhī | 18 | 16.2 |
| 16 | 16.pdf | Juz 16 — Qāla Alam | 18 | 15.0 |
| 17 | 17.pdf | Juz 17 — Aqtaraba | 18 | 14.0 |
| 18 | 18.pdf | Juz 18 — Qad Aflaḥa | 18 | 14.9 |
| 19 | 19.pdf | Juz 19 — Wa Qālalladhīna | 18 | 15.5 |
| 20 | 20.pdf | Juz 20 — Aman Khalaqa | 18 | 15.1 |
| 21 | 21.pdf | Juz 21 — Utlu Mā Ūḥiya | 18 | 14.8 |
| 22 | 22.pdf | Juz 22 — Wa Man Yaqnut | 18 | 13.5 |
| 23 | 23.pdf | Juz 23 — Wa Mā Liya | 18 | 13.3 |
| 24 | 24.pdf | Juz 24 — Faman Aẓlamu | 18 | 13.3 |
| 25 | 25.pdf | Juz 25 — Ilaihi Yuraddu | 18 | 13.2 |
| 26 | 26.pdf | Juz 26 — Ḥā Mīm | 18 | 13.1 |
| 27 | 27.pdf | Juz 27 — Qāla Famā Khaṭbukum | 18 | 12.5 |
| 28 | 28.pdf | Juz 28 — Qad Samiʿallāh | 18 | 11.9 |
| 29 | 29.pdf | Juz 29 — Tabārakalladhī | 18 | 11.6 |
| 30 | 30.pdf | Juz 30 — 'Amma | 27 | 16.1 |

## Important technical issues

1. **No text layer (scanned images).** Searching *inside* a book is not possible
   without OCR. → In‑PDF search must be a **V2** feature. Library search (by Juz
   number / name) works fine from the catalog we create.
2. **No embedded metadata / TOC / bookmarks.** We will create a small
   `metadata.json` (Juz number, name, page count) for each book ourselves.
3. **Right‑to‑left content.** The Qur'an reads right‑to‑left, so the reader's
   "next page" should move in the correct direction.
4. **No cover images.** We'll generate clean, consistent cover cards (e.g. "Juz 1")
   — optionally using the ornate title page of Juz 1 for the whole set.
5. **Large total size (~436 MB).** We should **not** force‑download all 30 for
   offline use at once — cache each Juz when it is first opened, with an optional
   "download all" button.

## Recommended V1 approach

- **Mobile‑first PWA** (HTML + CSS + JavaScript), reader built on **pdf.js**
  rendering the **original PDFs unchanged** (no conversion, originals preserved).
- Pinch/zoom, page counter, RTL navigation, full‑screen reading.
- **localStorage** for reading progress + bookmarks (no server, works offline).
- **Service worker** caches the app shell always, and each Juz on first open.
- Keep PDFs where they are (don't duplicate 436 MB); add a separate `catalog.json`
  + generated covers folder that maps each book id → its PDF file.

## Recommended mobile‑only development approach

- Build here in the cloud; you **test on your phone** via a free **GitHub Pages**
  URL (can be switched on from the phone in the repo Settings).
- Package to Android later with **PWABuilder.com** (Trusted Web Activity) — a
  website where you paste the URL and it generates the Android APK/AAB. No laptop,
  no complex tools on your phone.
