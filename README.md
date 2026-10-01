# PawLedger

Your money, leaving a trail.

A private, long-term personal finance observatory: record income and spending, look back over months and years, compare periods, and notice patterns. It observes; it never scolds, scores or advises. Built with MongoDB, Express, React and Node, all in TypeScript. The product philosophy every feature was built against is in `CLAUDE.md`.

## Start here

**[GETTING-STARTED.md](GETTING-STARTED.md)** is the guided path: install, database, `npm run setup`, first launch, your account, the in-app welcome flow, a ten-minute walk through every page, putting it online, backups and troubleshooting.

The short version:

```bash
npm install
npm run setup          # guided: writes server/.env and checks the database
npm run dev            # then open http://localhost:5173 and create your account
npm run close-registration   # once your account exists
```

## First run inside the app

On first sign-in a five-step welcome flow runs by itself (and can be replayed from Settings): currency and timezone, optional starter categories, a choice between recording a real entry or loading about 70 clearly marked example entries, and a tour of each page. Example data is tagged **Example** wherever it appears, only loads before you have entries of your own, and removes cleanly (anything you edited or built on stays).

## Commands

| Command | What it does |
|---|---|
| `npm run setup` | Guided first-time configuration (writes `server/.env`). |
| `npm run doctor` | Checks the settings and the database connection, and says what to fix. |
| `npm run dev` | Server (port 4000) and app (port 5173) together. |
| `npm run build` / `npm start` | Production build, and running it. With `SERVE_CLIENT=true` the server also serves the app on one address. |
| `npm run close-registration` | Sets `ALLOW_REGISTRATION=false` in `server/.env`. |
| `npm test` | Script tests, server tests, client tests. The database tests download a small MongoDB the first time (needs internet). |

## Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (required) |
| `JWT_SECRET` | 32+ characters; signs the session cookie (required) |
| `ALLOW_REGISTRATION` | `true` only while creating your account |
| `PORT` | API port (Render sets this) |
| `SERVE_CLIENT` | `true` to have the server also serve the built app (single address; used on Render) |
| `CLIENT_URL` | Only for CORS when the app is hosted separately; optional otherwise |
| `COOKIE_SAMESITE` | `lax` (default); `none` only for cross-site setups |
| `CLIENT_DIST` | Override the built app's location (rarely needed) |

The client reads one optional variable, `VITE_API_URL` (see `client/.env.example`), for a separately hosted API.

## Deploying

`render.yaml` describes a single Render web service (build, start, health check, generated secret). Steps, the Atlas network-access trade-off, and closing registration afterwards are in GETTING-STARTED.md, step 10.

## Layout

```
client/    React + TypeScript + Tailwind (pages, features, components, lib)
server/    Express + TypeScript (routes -> controllers -> services -> models)
scripts/   setup and close-registration
docs/      screenshots used in the guide
render.yaml, GETTING-STARTED.md, CLAUDE.md
```

## Accessibility and polish

Skip link, landmarks, labelled controls, a focus ring on every control, `role="alert"` on errors, a hidden data table behind each chart, per-page tab titles, dialogs that return focus, and no animation for people who ask for reduced motion (including the charts). Text and button colours are tested against WCAG AA contrast. An error boundary shows a calm page instead of a blank one, and an expired session returns you to sign-in with a note.

## Money and dates

- Amounts are **integers in minor units** (8,500 DZD is stored as `850000`). The API only accepts and returns integers; `client/src/lib/money.ts` is the single place that converts to and from what people type or read.
- For an expense with `items[]`, each item `amount` is the line total, and the sum must equal the expense `amount` (the API rejects anything else).
- A transaction's `date` is stored as noon UTC of the calendar day chosen, so a purchase never slides into another day or month when timezones are applied.

## Categories

- Expense and income categories are separate trees, nested **one level deep** (a parent and its sub-categories). Both are optional on a transaction.
- A transaction stores the category **id**, so renaming or moving a category never rewrites history.
- **Archiving** hides a category from new transactions but keeps it on old ones (archiving a parent archives its sub-categories). **Deleting** only works for a category with no transactions and no sub-categories.
- Filtering History by a parent category includes its sub-categories.

## Dashboard and settings

- The dashboard is one server-side aggregation (`GET /api/analytics/summary`) that returns income, spending, net, the three largest purchases and spending rolled up by top-level category with sub-category detail. Nothing is summed in the browser.
- With no `month` it uses the current month **in your timezone** (Settings). A transaction is a plain calendar day, so the timezone only decides which month counts as "now".
- "Most-used spending area" means the categorised area with the highest total spend.
- Changing the currency in Settings **relabels** amounts; it never converts them.

## Analyze

- **Period:** last 12 months (default), each calendar year with data, or all time (capped at 10 years).
- **Sections:** income and spending by month (zero-filled, so a quiet month shows as zero rather than vanishing), where it went, spending types as you marked them, one category over time (sub-categories included), top stores, and largest purchases.
- Everything is aggregated in MongoDB; months are grouped by the stored calendar day, so no timezone maths is involved.
- Dates use fixed month abbreviations (`28 Sep 2026`) rather than `Intl`'s, which vary between browsers.
- The chart library loads only when Analyze is opened.

## Compare

- Pick two periods, each a month or a custom range of days. The default is last month against this month.
- Every change is the **second period minus the first**, with a percentage relative to the first (shown as "new" when the first was zero, since there is nothing to be relative to).
- Categories are lined up across both periods, including ones that exist in only one, sorted by the size of the movement in either direction. Sub-categories are shown under their parent.
- The wording states what changed and by how much, never why and never whether it was good or bad ("Hiking spending increased by 13,100 DZD (524%).").

## Things worth noticing

Observations on the dashboard come from fixed rules in `server/src/services/analytics.observations.ts`, not from an AI. The same data always gives the same observations, in this order, and a rule stays silent unless there is enough data behind it. With fewer than 3 expenses in the month there are no observations at all.

| Rule | Appears when |
|---|---|
| Spending change | The month differs from the comparison period by 10% or more |
| Unusually high | The month is at least 1.5x the average of the previous 6 months that had spending, and at least 3 of them did |
| Highest month | The month tops every other month of the calendar year so far, with at least 3 months of spending that year |
| Category increase | One category grew the most, involving at least 5% of the month's spending (new categories count) |
| Largest purchases | The 3 largest purchases are at least 40% of spending, with at least 6 purchases |
| Spending types | Necessities and optional purchases both exist and at least 60% of spending has a type |
| Busiest category | The top categorised area took at least 2 purchases |

While a month is still running it is compared with the **same days of last month**, never with a finished month. The wording reports what the data shows; it never advises, blames or praises. All thresholds are in one `RULES` object.

## API (all routes need a session, except `auth/*`)

```
POST   /api/transactions
GET    /api/transactions?page=1&limit=20&type=expense|income&categoryId=<id>&sort=newest|oldest|highest|lowest
GET    /api/transactions/:id
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/analytics/summary?month=YYYY-MM   (or from=YYYY-MM-DD&to=YYYY-MM-DD; default: current month)
GET    /api/analytics/monthly?from=YYYY-MM&to=YYYY-MM        (default: last 12 months)
GET    /api/analytics/breakdown?from=YYYY-MM&to=YYYY-MM
GET    /api/analytics/category-trend?categoryId=<id>&from=YYYY-MM&to=YYYY-MM
GET    /api/analytics/comparison?a=YYYY-MM&b=YYYY-MM         (or aFrom/aTo and bFrom/bTo as days; default: last month vs this month)
GET    /api/analytics/observations?month=YYYY-MM              (default: current month)
GET    /api/auth/config                (public: { registrationOpen })
POST   /api/settings/onboarded
GET    /api/demo                       (example data status)
POST   /api/demo                       (load example data; only before you have entries of your own)
DELETE /api/demo                       (remove example data; edited entries and categories in use stay)
PUT    /api/settings                  { currency, timezone }

GET    /api/categories                (each includes `usage`, its transaction count)
POST   /api/categories                { name, kind, parentId? }
PUT    /api/categories/:id            { name, parentId? }   (no parentId = top level)
PATCH  /api/categories/:id/archive    { archived: boolean }
DELETE /api/categories/:id            (409 if it is in use: archive instead)
```
