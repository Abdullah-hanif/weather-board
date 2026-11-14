# WeatherBoard

Personal weather dashboard — searchable cities, live conditions + 5-day forecast, favourites, offline PWA, and a morning reminder notification.

**Live URL:** https://weatherboard-eta.vercel.app  
**GitHub:** https://github.com/Abdullah-hanif/weather-board  
**Stack:** Vite · React · TypeScript · vite-plugin-pwa (Workbox injectManifest)

---

## Setup

```bash
npm install
cp .env.example .env
# add keys (optional but recommended — see below)
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

### Environment variables

| Variable | Required? | Purpose |
|---|---|---|
| `VITE_OPENWEATHER_API_KEY` | Recommended | Primary weather source ([OpenWeatherMap](https://openweathermap.org/api)) |
| `VITE_RAPIDAPI_KEY` | Recommended | GeoDB Cities autocomplete via [RapidAPI](https://rapidapi.com/wirefreethought/api/geodb-cities) |

Without keys the app still runs:

- Weather uses **Open-Meteo** (no key).
- City search falls back to **Open-Meteo Geocoding** if GeoDB is missing or rate-limited.

For the challenge review, add both free-tier keys so GeoDB + OpenWeatherMap are exercised first.

---

## Features (challenge map)

1. **City search + autocomplete** — GeoDB (300 ms debounce), visible empty/error/rate-limit states; Open-Meteo geocoding fallback.
2. **Weather display** — OpenWeatherMap current + 5-day; automatic Open-Meteo fallback; loading skeletons + actionable errors.
3. **Form validation** — empty / too-short city on blur & submit; API no-results and network errors inline.
4. **Favourites** — up to 5 cities in `localStorage`; remove confirms; graceful message if storage blocked.
5. **PWA** — web manifest (192/512 icons, `theme_color`, `display: standalone`); service worker precaches app shell + caches weather responses; offline banner + last-city cache.
6. **Morning reminder** — explanation **before** permission prompt; user-chosen time; scheduled via service worker (`TimestampTrigger` when available); clear fallback if unsupported/denied.
7. **Responsive** — layouts for ~375 / 768 / 1280; 44 px touch targets; no horizontal scroll.
8. **Bonuses** — light/dark/system theme; °C/°F toggle persisted; CSS-animated condition icons.

---

## Architecture decisions

- **Client-only SPA** — no custom backend; all persistence is `localStorage` + Cache Storage via the service worker.
- **Normalized weather model** — both providers map into one `WeatherPayload` so the UI never cares which API answered.
- **OWM → Open-Meteo** — OWM free tier is easy to rate-limit; Open-Meteo keeps the product usable.
- **injectManifest SW** — needed for custom reminder scheduling + notification click handling beyond a generated Workbox SW.
- **Local scheduled notifications** — challenge forbids writing a push server. Reminders use the Notifications API + service worker (`TimestampTrigger` in Chromium when enabled; otherwise best-effort SW timer + reschedule on notification events). Denied permission never blocks search/weather/favourites.
- **Design** — calm teal/slate palette, Fraunces + Outfit, atmospheric background; empty states and inline errors inspired by Linear/Stripe patterns (not copied).

```
src/
  api/          GeoDB, OWM, Open-Meteo, unified fetch
  components/   Search, weather, favourites, reminders, dialogs
  hooks/        weather, favourites, theme, units, online, debounce
  lib/          storage, formatting, notifications, types
  sw.ts         custom service worker
```

---

## APIs used

| API | Role |
|---|---|
| OpenWeatherMap Current + 5‑day/3‑hour | Primary weather |
| Open-Meteo Forecast | Weather fallback |
| GeoDB Cities (RapidAPI) | Autocomplete |
| Open-Meteo Geocoding | Autocomplete fallback |
| Web Notifications + Service Worker | Daily morning reminder |

---

## Known limitations

- GeoDB free tier is ~1 req/s — debounce is 300 ms; bursts may briefly fall back to Open-Meteo geocoding.
- True Web Push (VAPID → browser push service) needs a server; this build uses **local** scheduled notifications instead so the tab can stay closed without a backend.
- `TimestampTrigger` support varies by browser; Chrome/Edge are best. Unsupported browsers show an explicit fallback message.
- OpenWeatherMap 5‑day API returns 3‑hour steps; we aggregate to daily min/max.
- API keys in `VITE_*` are exposed to the client (normal for pure SPA free-tier demos) — rotate if abused.

---

## Deploy

### Vercel

```bash
npm i -g vercel
vercel
```

Set `VITE_OPENWEATHER_API_KEY` and `VITE_RAPIDAPI_KEY` in the project Environment Variables, then redeploy.

### Netlify

```bash
npm run build
# publish directory: dist
```

Same env vars under Site settings → Environment variables.

After deploy, update **Live URL** at the top of this README.

---

## Agent IDE

Built primarily with **Cursor** (Agent). Full prompt history: [`PROMPTS.md`](./PROMPTS.md).
