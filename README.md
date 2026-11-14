# Linkly: URL shortener with analytics

A full-stack MERN app for creating short links and seeing who clicks them. Built with a focus on the backend: cache-aside redirects, Redis-backed rate limiting, and a single-query analytics pipeline.

## Features

- **Short links** with auto-generated base62 codes or **custom aliases** (validated, reserved words blocked)
- **Expiry dates**, enable/disable toggle, and editable destination
- **Click tracking**: device, browser, OS, country (GeoIP), referrer, and unique visitors (salted hash, no raw IPs stored)
- **Analytics dashboard**: clicks over time, device donut, top countries / referrers / browsers / OS, 7/30/90 day ranges
- **QR codes** for every link, downloadable as PNG
- **Redis caching** on the redirect path, with `X-Cache: HIT|MISS` header
- **Rate limiting** (Redis `INCR`/`EXPIRE`, fixed window) on API, auth, link creation and redirects, with `X-RateLimit-*` and `Retry-After` headers
- **Graceful degradation**: if Redis is missing or goes down, cache and limiter fall back to in-memory
- JWT auth (bcrypt), Helmet, CORS, input validation, centralized error handling

## Architecture highlights

| Concern | Approach |
| --- | --- |
| Fast redirects | Cache-aside: Redis lookup, then MongoDB on miss, TTL capped at the link's expiry. Cache is invalidated on update/delete. |
| Zero-latency tracking | The 302 is sent first; the click is recorded afterwards (fire-and-forget) so analytics never slow a redirect. |
| Analytics | One `$facet` aggregation returns totals, uniques, daily series and every breakdown in a single MongoDB round trip. Missing days are zero-filled. |
| Abuse protection | Per-IP limits (redirect 300/min, API 120/min), per-IP auth limit (20 / 15 min), per-user create limit (20/min). |
| Code generation | `crypto.randomBytes` with rejection sampling (no modulo bias) and retry on collision. |
| Privacy | Visitors are counted by `sha256(secret + ip + user-agent)`; raw IPs are never stored. |

## Tech stack

MongoDB, Express, React 18 (Vite), Node 18+, Mongoose, Redis, Recharts, `ua-parser-js`, `geoip-lite`, `qrcode`.

## Getting started

Requirements: Node 18+, MongoDB, and (optionally) Redis. Docker is the quickest way to get both:

```bash
docker compose up -d
```

Copy the example environment files before starting the app. In PowerShell:

```powershell
Copy-Item .\server\.env.example .\server\.env
Copy-Item .\client\.env.example .\client\.env
```

On macOS/Linux, use `cp server/.env.example server/.env` and
`cp client/.env.example client/.env` instead. Set a unique `JWT_SECRET` in
`server/.env` before deploying; for example, generate one with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

**1. Server**

```bash
cd server
npm install
npm run seed              # optional: demo user + sample clicks
npm run dev               # http://localhost:5000
```

**2. Client**

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

Sign in with the seeded account `demo@linkly.dev` / `demo1234`, or register a new one.

> Leave `REDIS_URL` empty in `server/.env` to run without Redis.

## Environment variables (server)

| Variable | Description |
| --- | --- |
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis URL; empty disables Redis |
| `JWT_SECRET` | Secret for signing tokens (required in production) |
| `BASE_URL` | Public URL of the API; short links are built from it |
| `CLIENT_URL` | Frontend origin, used for CORS |

## Environment variables (client)

| Variable | Description |
| --- | --- |
| `API_PROXY_TARGET` | API server URL used by the Vite development proxy (default `http://localhost:5000`) |
| `VITE_SHORT_HOST` | Host displayed in the custom-alias field |
| `VITE_API_URL` | Optional API base URL including `/api`, for production when the API has a separate origin |

## Publishing to GitHub

- Keep `server/.env` and `client/.env` private; only commit the `.env.example` templates.
- Set production environment variables in your hosting provider's secret/configuration settings.
- Use a unique, strong `JWT_SECRET` in production and configure `MONGO_URI`, `REDIS_URL`,
  `BASE_URL`, and `CLIENT_URL` for your deployed services.
- If the frontend and API are on separate origins, set `VITE_API_URL` when building the client.

## API

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/links?page&limit&q` | List and search your links |
| POST | `/api/links` | Create `{ url, alias?, title?, expiresAt? }` |
| GET | `/api/links/overview?days=30` | Dashboard totals, daily series, top links |
| GET | `/api/links/:id` | Link details |
| PATCH | `/api/links/:id` | Update `{ url?, title?, isActive?, expiresAt? }` |
| DELETE | `/api/links/:id` | Delete link and its clicks |
| GET | `/api/links/:id/analytics?days=30` | Per-link analytics |
| GET | `/api/links/:id/qr` | QR code as a PNG data URL |
| GET | `/:code` | Public redirect (302) |

## Try the rate limiter and cache

```bash
curl -i http://localhost:5000/portfolio     # X-Cache: MISS, then HIT on the next call
for i in $(seq 1 310); do curl -s -o /dev/null -w "%{http_code} " http://localhost:5000/portfolio; done
# ... 302 302 302 ... 429 429
```

## Notes

- Country lookup works for real IPs. On localhost every click shows as "Unknown" (use `npm run seed` for demo data). Behind Cloudflare or Vercel, their country header is used automatically.
- Production: set `NODE_ENV=production`, a strong `JWT_SECRET`, `BASE_URL` to your public domain, and build the client with `npm run build` (set `VITE_API_URL` if the API is on another origin).

## Ideas to extend

Bot filtering, per-link password protection, UTM builder, team workspaces, a bulk CSV import, and a Docker image for the whole stack.
