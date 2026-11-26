# SinStreams

> **Movies | Series | Anime | Live TV** — A monochrome glassmorphism streaming web application built with React, Vite, Express, and MongoDB.

---

## ✨ Features

- **Movies & Series Catalog**: Powered by TMDB metadata with genre rows, multi-season slider & quick-jump dropdown for long-running shows, detailed synopses, and curated recommendations.
- **Dedicated Anime Hub**: Powered by AniList GraphQL (with Jikan v4 fallback), live broadcast episode counts, dedicated anime search, side-by-side chunked episode selector (`1–100`, etc.) with instant jump-to-episode search, and separate **SUB / DUB** server rows (*Ichigo*, *Yuki Suo*, *Hinata*, *Makima*).
- **Live TV**: Indian national and regional IPTV channel streaming with HLS playback (`hls.js` / `video.js`).
- **Hero Showcase & Randomizer**: Auto-advancing full-bleed hero cover sliders across Home, Movies, Series, and Anime, plus a *"Surprise Me"* title randomizer.
- **No-Login Guest Watch History**: Stores the last 20 watched/visited Movies, Series, and Anime locally in the browser using **IndexedDB**, alongside *Continue Watching* progress tracking.
- **User Accounts & Watchlist**: Clerk authentication (`@clerk/clerk-react`) with persistent watchlist support via Express & MongoDB.
- **Festive Monochrome UI & Splash**: Custom desktop/mobile 5-second opening splash screens, subtle 60fps canvas snowflakes, continuous fairy-light garland decoration, and mobile-first responsive layouts.
- **Client-Side Inspect Deterrent**: Blocks casual DevTools shortcuts and context-menu inspection attempts.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 8, React Router 7, Framer Motion, Lucide React, HLS.js, Video.js, Axios
- **Backend**: Node.js, Express 5, MongoDB (Mongoose), Helmet, CORS, Express Rate Limit, Cheerio
- **Auth**: Clerk (`@clerk/clerk-react` & `@clerk/clerk-sdk-node`)
- **Databases / APIs**: TMDB, AniList GraphQL API, Jikan API v4, Browser IndexedDB
- **Deployment**: Vercel (`vercel.json`)

---

## 📁 Project Structure

```text
SinStreams/
├── public/
│   ├── images/               # Splash screens & static images
│   ├── Adguard prompt.js     # Post-intro AdGuard recommendation prompt
│   └── favicon.svg           # App icon
├── server/                   # Express server entry
├── routes/                   # API routes (auth, livetv, media, proxy, stream, user)
├── models/                   # Mongoose schemas (User, WatchHistory, Watchlist)
├── middleware/               # Auth middleware (requireAuth)
├── services/                 # API & storage services (anime, media, stream, tmdb, IndexedDB)
├── src/
│   ├── components/           # Pages & UI components (Home, Movies, Series, Anime, Watch, LiveTV, etc.)
│   ├── App.jsx               # Routes & global layout wrappers
│   └── main.jsx              # App entry point with Clerk & Router providers
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/SinStreams.git
cd SinStreams
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory and add the required keys:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
MONGODB_URI=your_mongodb_connection_string
```

*(Add any additional backend or API keys required by your server environment.)*

### 4. Run locally

Start the frontend dev server:

```bash
npm run dev
```

Start the backend Express server (in a separate terminal):

```bash
npm run dev:server
```

---

## 📜 Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Runs the Vite development server |
| `npm run dev:server` | Runs the backend server with `nodemon` (`server/server.js`) |
| `npm run build` | Builds the production frontend bundle into `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint across the project |

---

## 📦 Production Build

```bash
npm run build
```

Deploy directly on **Vercel** using the included `vercel.json` configuration.

---

## ⚠️ Disclaimer

SinStreams is built for educational and personal media indexing purposes. It does not host or store any video files on its servers; all streams are served via third-party APIs and publicly accessible embed providers.
