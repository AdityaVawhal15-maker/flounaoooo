# Flouna

**Stop Searching. Start Deciding.**

Flouna is an AI decision engine by [Algorithec](https://github.com/Algorithec). Instead of switching between apps and comparing prices yourself, you tell Flouna what you need — it searches across ONDC and partner platforms, applies the best offers, reads the reviews, and gives you one clear answer. Food and rides today; more domains on the roadmap.

---

## What it does

- **Ask in plain language** — *"order biryani under ₹300"*, by text or voice. The intent engine extracts what you want and compares every option.
- **One clear recommendation** — best *effective* price (item + delivery − offers), with delivery time, ratings, a review summary, and exactly how much you save versus the next-best option.
- **Combo requests** — *"order dinner and book a cab home"* handled in a single message.
- **Order timing advisor** — tells you when waiting will get you a better price ("₹100 off expected after 8 PM") and when it won't.
- **Rides comparison** — live map, route and ETA, fares compared across providers with best-price and fastest badges.
- **In-app checkout** for ONDC orders (Cashfree), tracking timeline, invoices, and order history.
- **Savings ledger** — every order records what Flouna saved you; your lifetime total lives on the Rewards screen.
- **Budget guardian** — set a weekly food budget and get warned before an order takes you over it.
- **Smart reorder** — one tap to reorder your usual at today's best price.

## How the recommendation is made

Flouna's pick is arithmetic, not a black box. Every option is scored on three
parameters, normalised across the current result set so they're comparable:

| What you ask for | Price | Rating | Speed |
|---|---|---|---|
| *(no preference)* — balanced | 0.45 | 0.35 | 0.20 |
| "cheapest" | 0.70 | 0.20 | 0.10 |
| "top-rated" | 0.20 | 0.65 | 0.15 |
| "fastest" | 0.25 | 0.20 | 0.55 |

Price and delivery time are inverted (lower is better), rating is direct, and
the weights always sum to 1. Where every option ties on a parameter, that
parameter stops discriminating between them.

**The language model never ranks anything.** It classifies intent — deciding
whether you asked for cheap, fast or highly rated — and returns one of those
four labels. The ordering itself is deterministic: the same inputs always
produce the same result, and the model cannot move an option up the list.

Personalisation applies only when you stated no preference, and only after
three paid orders: your spend band shifts a weight by 0.15, and a dish you
reorder gets a small bonus capped at 0.12. It adjusts weights and nothing else
— it never touches a price, and seller identity is not an input to the scorer
at all.

Every search writes a **decision log**: the filters that excluded results and
why, the weights applied, and what each option scored. So "why was I shown
this?" has an answer after the fact, not just a plausible-sounding story.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Maps | MapLibre GL + MapTiler tiles, Geoapify geocoding, OpenRouteService routing |
| Backend | Node.js, Express, TypeScript |
| Database | Prisma ORM — SQLite in development, PostgreSQL in production |
| AI | Pluggable intent engine: Anthropic Claude / DeepSeek / built-in rule-based mode |
| Payments | Cashfree (sandbox and production) |
| Tests | Vitest + Supertest — 312 tests across auth, chat firewall, ranking, orders, payments, complaints |

## Project structure

```
web/      Next.js frontend (responsive: mobile + desktop, installable PWA)
server/   Express REST API, Prisma schema, tests
```

## Getting started

Requirements: **Node.js 20.9+**

```bash
# 1. API server
cd server
npm install
cp .env.example .env        # then fill in the two JWT secrets (see below)
npx prisma migrate dev
npm run seed                # creates a dev login (see below) — do this or you
                            # have an empty database and nothing to log in with
npm run dev                 # http://localhost:4000

# 2. Web app (second terminal)
cd web
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env.local
npm run dev                 # http://localhost:3000
```

### Signing in locally

`npm run seed` creates a ready-to-use account (the database is gitignored, so a
fresh clone starts empty):

```
email:    test@example.com
password: newsecret99
```

It's pre-verified and has a delivery address, so you can order straight away.

If you sign up with your own email instead, note that **no email is sent unless
SMTP is configured** — the 6-digit OTP is printed to the API server's console
instead. Look for `[mailer] OTP for you@example.com: 123456` in that terminal.

Generate the JWT secrets (run twice — once per variable):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Runs fully without third-party keys

Every integration has a development fallback, so the whole product works out of the box:

| Feature | Without keys | With keys in `server/.env` |
|---|---|---|
| Email OTP | Code prints to the server console | Real email via SMTP |
| AI chat | Rule-based intent engine | Claude / DeepSeek |
| Payments | Simulated checkout flow | Cashfree hosted checkout |
| Maps | Demo tiles + built-in places | MapTiler, Geoapify, OpenRouteService |
| Google sign-in | Hidden until configured | One-tap Google sign-in |

Add keys whenever they're ready — the adapters detect them and switch over with no code changes.

## Testing

```bash
cd server
npm test        # 312 tests: auth, OTP limits, chat firewall, ranking decisions, order pricing, webhooks
npm run lint    # type check
```

```bash
cd web
npm run lint
npm run build
```

## Security model

- Passwords hashed with bcrypt; OTP codes hashed, expiring, and attempt-limited
- Sessions: short-lived JWT access token + rotating refresh token, both httpOnly cookies
- Every endpoint validates input with zod; prices are always recomputed server-side
- Helmet headers, strict CORS, layered rate limits (global, auth, chat)
- Payment webhooks verified with a timing-safe HMAC signature over the raw bytes
- Identical responses for existing and non-existing accounts (no enumeration)
- Chat is scope-locked to food and rides: fixed response schema, restricted system prompt, injection pre-filter, per-user rate limits
- Ranking is deterministic and has no administrative override: weights are compile-time constants, so no console, API or database field can promote, demote or hide a result
- Uploaded complaint evidence is never served statically — bytes come back only through an authenticated route that re-checks ownership

## Production notes

- Switch the Prisma datasource to `postgresql` and run `npx prisma migrate deploy`
- Set `NODE_ENV=production` and `WEB_ORIGIN` to the deployed frontend URL
- Host the web app and API on the same domain (e.g. `flouna.app` + `api.flouna.app`) — session cookies require it
- Register the Cashfree webhook: `https://<api-host>/api/payments/webhook/cashfree`
- Put both services behind Cloudflare
- Decision logs are pruned to 90 days by the hourly housekeeping job; raise `UPLOAD_DIR` onto durable storage if the API runs on ephemeral disk

---

© Algorithec Pvt Ltd
