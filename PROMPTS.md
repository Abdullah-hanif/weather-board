# WeatherBoard — Agent prompt history

**IDE used:** Cursor (Agent mode)  
**Model / agent:** Cursor Auto agent router  
**Date:** 14 Nov 2026

This file lists the prompts and intent sequence used while building the challenge. Prompts are in chronological order.

---

## Prompt 1 — Challenge brief + build request

> Pasted the full Edspire “WeatherBoard” technical interview PDF content (scope, APIs, core requirements 01–07, UI references, bonuses, submission rules).  
> Asked (Urdu/English): check every expectation and build the app following all requirements.

**Intent:** Treat the PDF as the source of truth; ship a complete client-only PWA, not a tutorial demo.

**Agent actions:** Scaffolded Vite + React + TypeScript; implemented GeoDB autocomplete, OpenWeatherMap + Open-Meteo weather, validation, favourites, PWA/service worker, morning reminders, responsive UI, theme/units/animated icons; wrote README + this PROMPTS.md.

---

## Prompt 2 — Set env + verify PWA/offline

> Shared OpenWeatherMap and RapidAPI screenshots. Asked to set `.env` and check offline / PWA behaviour.

**Agent actions:** Attempted key OCR from screenshots (unreliable); verified service worker, manifest (192/512 icons, `theme_color`, `display: standalone`), offline banner, and offline reload of last cached city.

---

## Prompt 3 — Paste API keys

> Provided keys:
> - OpenWeatherMap: `0dc2674ba51baa8402a2f305a4f61cbe`
> - RapidAPI: `1610bf830cmsh543c72c2b7f0f3ap1700c8jsn13bfb363313d`

**Agent actions:** Wrote `.env` (gitignored); verified GeoDB HTTP 200; confirmed weather load in app; enriched city search by merging GeoDB + Open-Meteo geocoding (GeoDB free tier is sparse).

---

## Prompt 4 — Requirements gap check

> Asked what is still pending vs the challenge requirements.

**Agent actions:** Audited 01–07 + bonuses as complete; flagged submission gaps: public GitHub push, live deploy URL, email, README live URL, PROMPTS updates.

---

## Prompt 5 — Git identity for this repo

> Set local git user to `Abdullah Hanif` / `akif.abdullah.aa32@gmail.com`.

**Agent actions:** `git config --local user.name` and `user.email` (global left unchanged).

---

## Prompt 6 — Push to created GitHub repo

> Shared empty repo quick-setup for `https://github.com/Abdullah-hanif/weather-board` and asked to create/push the repo contents.

**Agent actions:** Initial commit (excluding `.env`), add `origin`, push `main`.

---

## Prompt 7 — Remove Cursor as GitHub contributor

> Asked to remove `cursoragent` from the Contributors list so only Abdullah Hanif remains.

**Agent actions:** Rewrote the commit without `Co-authored-by: Cursor` and force-pushed `main`.

---

## Prompt 8 — Deploy to Vercel

> Asked to deploy on Vercel.

**Agent actions:** Logged into Vercel CLI, linked project `weatherboard`, set `VITE_*` env vars, production deploy, disabled SSO deployment protection. Live URL: https://weatherboard-eta.vercel.app

---

## Prompt 9 — UI / Three.js / fonts / notifications polish

> Asked for stronger Three.js, unique theme, clearer fonts, footer fix, remove test-notification button, then push + Vercel deploy.

**Agent actions:** Glass weather-orb Three.js scene; Harbor Observatory theme (Sora + IBM Plex Sans); sticky footer; reminder flow kept without test button; commit, push, production deploy.

---

## Prompt strategy (what we optimized for)

1. **Spec-first** — mapped each numbered requirement (01–07) to a concrete module before styling.
2. **Graceful degradation** — OWM → Open-Meteo; GeoDB → Open-Meteo geocoding; localStorage / notifications failures never brick the core weather UX.
3. **No backend** — used local Notification Triggers / SW scheduling instead of inventing a push server (matches “client-side only”).
4. **Product polish** — loading skeletons, specific error copy, confirmation on favourite remove, offline banner, installable manifest.
5. **Interview artifacts** — README (architecture, APIs, limitations, live URL placeholder) + mandatory PROMPTS.md.
