# Leaffy — Project Notes

## What is this?

A plant identification web app. User uploads a photo → server sends it to plant ID APIs → returns the plant name, description, and care info.

Built with React + Vite (frontend) and a small Node/Express server (backend).

---

## How to run locally

You need **two terminals open at the same time**.

**Terminal 1 — Backend server:**
```bash
cd /Users/sumit/Documents/sumit-projects/plants
npm run dev:server
```
You should see: `[server] http://127.0.0.1:3002`

**Terminal 2 — Frontend (React):**
```bash
cd /Users/sumit/Documents/sumit-projects/plants
npm run dev
```
You should see: `http://localhost:5174`

Then open `http://localhost:5174/plants/` in your browser. That's it.

> The frontend runs on port **5174**, the backend on port **3002**.
> The frontend calls `/plants-api/identify`. Locally, Vite proxies `/plants-api/*` → `http://127.0.0.1:3002/api/*`; in production nginx does the same thing (plus rate limiting).
> The server listens on `127.0.0.1` only, so it can never be reached directly from the internet.

---

## Deploying to sumitnarang.com/plants

```bash
cd /Users/sumit/Documents/sumit-projects/plants
./deploy.sh
```

This builds the frontend, uploads `dist/`, `server/` and `.env`, runs `npm ci` for the server on the box, restarts PM2 (`plants`) and checks `https://sumitnarang.com/plants-api/health`. Server setup details are in `../server.md`.

---

## API Keys (stored in `.env` at project root)

There are 3 APIs being used. Keys are already in `.env`.

### 1. PlantNet — Plant Identification (primary)
- **What it does:** Identifies the plant from the photo. This is tried first.
- **Key name in .env:** `PLANTNET_KEY`
- **Free plan limit:** 500 requests/day
- **What happens at limit:** Server automatically falls back to iNaturalist
- **Dashboard / key management:** https://my.plantnet.org/

### 2. iNaturalist — Plant Identification (fallback)
- **What it does:** Same as PlantNet, used when PlantNet hits its daily limit or if the key is missing.
- **Key name in .env:** `INAT_TOKEN`
- **Free plan limit:** No hard published limit, but don't abuse it — it's a free community service
- **Note:** The token expires. If identifications stop working and PlantNet is also failing, the iNaturalist token may need to be refreshed. Log in at inaturalist.org and generate a new API token.
- **Token refresh:** https://www.inaturalist.org/users/api_token

### 3. Wikipedia — Plant Description
- **What it does:** Fetches the plant description text shown in the app.
- **No key needed** — it's a free public API, no limits to worry about.

---

## How the identification flow works

```
User uploads photo
      ↓
Try PlantNet
      ↓ (if 429 rate limit or key missing)
Try iNaturalist
      ↓
Get top result (scientific name)
      ↓
Fetch Wikipedia summary
      ↓
Return everything to frontend
```

---

## File structure (what matters)

```
plants/
├── .env                        ← API keys (never commit this)
├── vite.config.js              ← Frontend config, proxy setup
├── deploy.sh                   ← One-command deploy to the Hetzner server
├── src/
│   ├── App.jsx                 ← Main app, handles image upload + state
│   ├── pages/
│   │   └── LandingPage.jsx     ← Home screen with upload button
│   ├── utils/
│   │   └── heic.js             ← iPhone HEIC → JPEG conversion (shared)
│   └── components/
│       └── PlantCard.jsx       ← Results screen (name, description, alternatives)
└── server/                     ← Has its OWN package.json — deps must be installed in server/
    └── index.js                ← Backend: /api/identify + /api/health
```

---

## Common issues

**"Something went wrong" / "temporarily unavailable" error on upload:**
- Locally: check that the backend server is running (Terminal 1)
- Production: `curl https://sumitnarang.com/plants-api/health` should return `{"ok":true}`. If not, `ssh root@46.62.130.159 'pm2 logs plants --lines 50'`
- `Cannot find package 'express'` in the logs means server deps weren't installed — rerun `./deploy.sh`

**"You're going a bit fast" error:**
- nginx allows 10 requests/minute per IP (burst of 5) on `/plants-api/` to protect the PlantNet quota

**PlantNet stops working:**
- Hit 500/day limit — it resets at midnight UTC
- iNaturalist will take over automatically

**iNaturalist stops working:**
- The JWT token may have expired (they expire periodically)
- Go to https://www.inaturalist.org/users/api_token, copy the new token, paste it into `.env` as `INAT_TOKEN=`

