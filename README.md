# PawLedger

Your money, leaving a trail.

A private, long-term personal finance observatory: record income and spending, look back over months and years, compare periods, and notice patterns. It observes; it never scolds, scores or advises. Built with MongoDB, Express, React and Node, all in TypeScript. The product philosophy every feature was built against is in `CLAUDE.md`.

## A tour in pictures

Every screenshot below is the running app, filled with its built-in example data (five months of clearly marked, made-up entries). Nothing here is a real person's money.

### A private door

Anyone who follows the link lands on a sign-in page that says plainly that this is one person's ledger, not a public service. When the server is asleep (a free host does that), the app says so and opens by itself once it is awake.

<table>
  <tr>
    <td align="center" valign="top"><img src="docs/showcase/signin.png" width="260" alt="Sign-in page saying this is a private app" /><br /><sub>Sign-in, with registration closed</sub></td>
    <td align="center" valign="top"><img src="docs/showcase/waking.png" width="260" alt="Loading screen saying the server is waking up" /><br /><sub>While a sleeping server wakes up</sub></td>
  </tr>
</table>

### A welcome flow, not a manual

Five short steps on first sign-in: currency and timezone, optional starter categories, then a choice between recording something real or exploring with example data, and a tour of each page. It can be replayed from Settings.

<table>
  <tr>
    <td align="center" valign="top"><img src="docs/showcase/welcome-start.png" width="300" alt="Welcome step: what the app is and what it never does" /><br /><sub>What it is, and what it never does</sub></td>
    <td align="center" valign="top"><img src="docs/showcase/welcome-categories.png" width="300" alt="Welcome step: choosing starter categories" /><br /><sub>Starter categories, all optional</sub></td>
    <td align="center" valign="top"><img src="docs/showcase/welcome-first-entries.png" width="300" alt="Welcome step: record something real or load example data" /><br /><sub>Real entry or example data</sub></td>
  </tr>
</table>

### Home: what is happening with my money right now

![Home page for October 2026](docs/showcase/home.png)

- The month at a glance: income, spending and net, with the number of transactions and where most of it went.
- **Against what you expected**: spending shown against the month's plan, with how far through the month you are. A bar that passes the line turns dark, never red.
- **Things worth noticing**: observations written from your own data ("Your spending increased by 27,450 DZD (178%) compared with the same days of last month"), always labelled as observations, not advice.
- Where it went, the largest purchases, and the most recent entries.

### Recording and finding entries

Adding an expense needs only what you bought and how much. Category, items, store, spending type and notes sit behind progressive disclosure.

![Add expense dialog](docs/showcase/add-expense.png)

History holds everything, with filters (all, expenses, income, category), sorting and pagination. A purchase with several items shows its items and checks the total.

![History page](docs/showcase/history.png)

### Analyze: patterns over time

Income and spending by month, spending by category, by spending type (necessity, good to have, complementary, impulse), one category's trend over time, where you shop, and the largest purchases, for any period.

![Analyze page](docs/showcase/analyze.png)

### Compare: two periods side by side

Pick two months, or two custom date ranges. It lists what changed in plain sentences, then tables for money in and out and for each category and sub-category.

![Compare page](docs/showcase/compare.png)

### The monthly rhythm: Plan and Inventory

**Plan** is what you expect from a month: spending in total and by category, plus optional income and saving. It is for noticing, not scoring.

![Plan page](docs/showcase/plan.png)

**Inventory** is a count of what you hold in each account at the end of a month. The app sets the change in what you hold against what your entries explain, and shows the difference as "Unaccounted for", in both directions and in plain words. Savings accounts show a target and the arithmetic of the recent pace.

![Inventory page](docs/showcase/inventory.png)

### Categories and settings

Categories are yours: two levels, per kind (expense or income), archived rather than deleted when they have history. Settings hold the currency label, the timezone, example data and the welcome tour.

<table>
  <tr>
    <td valign="top"><img src="docs/showcase/categories.png" alt="Categories page" /></td>
    <td valign="top"><img src="docs/showcase/settings.png" alt="Settings page" /></td>
  </tr>
</table>

### On a phone

The layout is designed for small screens too: the navigation wraps, History reads as a list, and the add buttons stay within reach.

<table>
  <tr>
    <td align="center" valign="top"><img src="docs/showcase/mobile-home.png" width="260" alt="Home on a phone" /></td>
    <td align="center" valign="top"><img src="docs/showcase/mobile-history.png" width="260" alt="History on a phone" /></td>
    <td align="center" valign="top"><img src="docs/showcase/mobile-add-expense.png" width="260" alt="Add expense on a phone" /></td>
  </tr>
</table>

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

## The monthly rhythm: expectations and inventory

- **Plan** (start of the month): what you expect to spend, in total and optionally by category, plus optional expected income and saving. Home and Plan show spending against it, with how far through the month you are. Expectations are never enforced and never scored.
- **Inventory** (end of the month or the 1st): count what you hold in each account (cash, bank, savings, other). From the second count on, the change in what you hold, minus what your recorded income and spending explain, is shown as **Unaccounted for**, in plain words and in both directions. Savings accounts show balance, optional target, recent monthly average and, if the pace is positive, the arithmetic of reaching the target.
- An inventory is filed under the month that is starting: counted on the 1st to the 16th is that month, from the 17th the next. An entry dated on a counting day belongs to the period that ends that day. Moves between your own accounts change nothing in the total.
- Home reminds you during the last five days of a month and the first week of the next, until it is done.

Details and a worked example are in GETTING-STARTED.md, under "Your monthly rhythm".

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

## Private by design

The sign-in page tells visitors that this is a private, one-person app (the wording is in `client/src/features/auth/privateNotice.ts`). The app also sends `noindex, nofollow, noarchive` (meta tag and `X-Robots-Tag` header) and serves `robots.txt` with `Disallow: /`. These only ask crawlers to stay away; access control is the sign-in plus `ALLOW_REGISTRATION=false`.

## Deploying

`render.yaml` describes a single Render web service (build, start, health check, generated secret). Steps, the Atlas network-access trade-off, and closing registration afterwards are in GETTING-STARTED.md, step 10.

## Layout

```
client/    React + TypeScript + Tailwind (pages, features, components, lib)
server/    Express + TypeScript (routes -> controllers -> services -> models)
scripts/   setup and close-registration
docs/      screenshots used in the guide (screenshots/) and in this README (showcase/)
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
| Plan (spending) | You set expectations for the month: always shown, with how far through the month you are |
| Plan (category) | A planned category has passed what you expected of it (the furthest one is named) |

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
GET    /api/accounts                   (each includes `usage`: inventories that count it)
POST   /api/accounts                   { name, kind: cash|bank|savings|other, target? (savings only) }
PUT    /api/accounts/:id
PATCH  /api/accounts/:id/archive       { archived: boolean }
DELETE /api/accounts/:id               (409 once an inventory has counted it: archive instead)

GET    /api/inventories/overview       (accounts, inventories, periods between counts, savings, reminder)
GET    /api/inventories/prompt
POST   /api/inventories                { asOf: YYYY-MM-DD, balances: [{ accountId, amount }], notes? }
PUT    /api/inventories/:id
DELETE /api/inventories/:id

GET    /api/plans?month=YYYY-MM        (the plan, set against what happened, and the last twelve months)
PUT    /api/plans/:month               { expectedSpending, expectedIncome?, expectedSaving?, categories?, notes? }
DELETE /api/plans/:month
PUT    /api/settings                  { currency, timezone }

GET    /api/categories                (each includes `usage`, its transaction count)
POST   /api/categories                { name, kind, parentId? }
PUT    /api/categories/:id            { name, parentId? }   (no parentId = top level)
PATCH  /api/categories/:id/archive    { archived: boolean }
DELETE /api/categories/:id            (409 if it is in use: archive instead)
```
