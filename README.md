# The Friendly Finder 🧭🍺

> A compass that points at beer. Specifically, the nearest **Grain Belt Premium** — "The Friendly Beer." GPS can find you a hospital, but can it find you a Premium? It can now.

Live at **[friendly-finder.com](https://friendly-finder.com)**.

## The pitch

You're somewhere unfamiliar. You're thirsty. You have standards (Premium). Open the app, let it borrow your location for a hot second, and a giant bottle-cap compass swings its needle toward the closest bar or liquor store stocking Grain Belt Premium. Walk that way. Don't overthink it.

It's a PWA, so you can install it to your home screen and pretend it's a real app. On your phone the needle actually tracks as you turn — like a compass that went to bartending school.

## Features

- 🧭 **Live compass** — uses your device heading, so the needle points at the Premium, not just "north-ish."
- 📍 **Nearest first** — bars and liquor stores within range, sorted by distance, in a tidy little list.
- 🗺️ **Get Directions** — one tap hands off to Google Maps for when walking in a straight line proves too ambitious.
- 📲 **Installable PWA** — lives on your home screen with a Grain Belt bottle-cap icon I am unreasonably proud of.
- 🍺 **Real data** — it asks Grain Belt's own store locator where the Premium is. I just draw the arrow.

## How it works (for the curious / the suspicious)

1. The browser grabs your location — with permission, I'm not a monster.
2. A serverless function proxies Grain Belt's official locator, which replies in XML like it's 2006, so I parse it and quietly fix their double-encoded ampersands.
3. Honest-to-goodness great-circle bearing math works out which way the nearest Premium is.
4. An SVG bottle-cap compass rotates a needle to point at it. That's the whole magic trick.

No accounts. No tracking. No "we value your privacy" modal. Just beer vectors.

## Tech stack

- **Vanilla TypeScript + [Vite](https://vitejs.dev)** — no framework, because a compass that points at beer does not need a virtual DOM.
- **[vite-plugin-pwa](https://vite-pwa-org.netlify.app)** — service worker, manifest, installability.
- **[Vitest](https://vitest.dev) + jsdom** — yes, the beer compass has tests. The bearing math is unit-tested. I have priorities.
- **[fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)** — for wrangling the locator's XML.

## Run it locally

Prereqs: Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other knobs:

```bash
npm test           # run the tests
npm run typecheck  # make TypeScript glare at me
npm run build      # production build into dist/
```

## Project structure

```
src/        the app — compass, geolocation, bearing math, UI
lib/        shared XML parsing + types
api/        Vercel serverless proxy
lambda/     AWS Lambda proxy (same idea, different cloud)
cdk/        AWS infrastructure as code
test/       proof that I tested it
```

---

Built by [Chad Juettner](https://chad.juettner.dev). Not affiliated with, endorsed by, or sanctioned by Grain Belt — just a fan with a location API and too much free time.
