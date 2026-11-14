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

> Shared OpenWeatherMap and RapidAPI dashboard screenshots. Asked to configure `.env` and check offline / PWA behaviour.

**Agent actions:** Confirmed `.env` is gitignored; verified service worker, manifest (192/512 icons, `theme_color`, `display: standalone`), offline banner, and offline reload of last cached city.

---

## Prompt 3 — Provide API keys

> Pasted OpenWeatherMap and RapidAPI keys into the chat for local setup.

**Agent actions:** Wrote keys to local `.env` only (never committed); verified GeoDB responses; confirmed weather load; enriched city search by merging GeoDB + Open-Meteo geocoding (GeoDB free tier is sparse).

---

## Prompt 4 — Requirements gap check

> Asked what is still pending vs the challenge requirements.

**Agent actions:** Audited 01–07 + bonuses as complete; noted remaining submission items: public GitHub repo, live deploy URL, email, README live URL, PROMPTS updates.

---

## Prompt 5 — Push to GitHub

> Shared an empty GitHub repo and asked to push the project.

**Agent actions:** Initial commit (excluding `.env`), set `origin`, pushed `main`.

---

## Prompt 6 — Deploy publicly

> Asked to deploy the app on Vercel (or similar) with a public live URL.

**Agent actions:** Production deploy with `VITE_*` env vars configured for the hosting project. Live URL: https://weatherboard-eta.vercel.app

---

## Prompt 7 — UI / Three.js / fonts / notifications polish

> Asked for stronger Three.js, a unique theme, clearer fonts, footer fix, remove test-notification button, then refresh the public deploy.

**Agent actions:** Glass weather-orb Three.js scene; Harbor Observatory theme (Sora + IBM Plex Sans); sticky footer; reminder flow kept without a test button; updated production build.

---

## Prompt strategy (what we optimized for)

1. **Spec-first** — mapped each numbered requirement (01–07) to a concrete module before styling.
2. **Graceful degradation** — OWM → Open-Meteo; GeoDB → Open-Meteo geocoding; localStorage / notifications failures never brick the core weather UX.
3. **No backend** — used local Notification Triggers / SW scheduling instead of inventing a push server (matches “client-side only”).
4. **Product polish** — loading skeletons, specific error copy, confirmation on favourite remove, offline banner, installable manifest.
5. **Interview artifacts** — README (architecture, APIs, limitations, live URL) + mandatory PROMPTS.md.
