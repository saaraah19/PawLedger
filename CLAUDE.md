# CLAUDE.md

## Project: Personal Finance Dashboard

A private, long-term personal finance tracking application built with the MERN stack.

The purpose of this application is not to behave like a traditional budgeting app. It is a personal financial observatory: a calm, useful place where the user can record income and spending, inspect financial history, compare periods, and gradually understand their own spending patterns.

The application should feel personal, intentional, modern, and slightly opinionated rather than like a generic SaaS dashboard.

---

# 1. Core Product Philosophy

The application exists to answer questions such as:

* Where is my money actually going?
* What did I spend money on this month?
* How much did I spend compared with last month?
* Did my spending increase because of one unusual purchase or because of a broader pattern?
* How much of my spending was necessary?
* How much was optional?
* What hobbies or interests are consuming money over time?
* How much money came in versus went out?
* What happens if I compare July 2026 with September 2026?
* Which purchases were isolated events and which are recurring patterns?
* Am I spending more than I realize on a particular area of life?
* How has my financial behavior changed over several months or years?

The application should help the user OBSERVE their behavior before trying to change it.

Do not build a judgmental budgeting application.

Do not shame the user for spending.

Do not use gamification, streaks, badges, fake productivity metrics, or aggressive "you overspent!" messaging.

Recommendations are allowed, but they should be based on observed data and presented as observations, not commands.

Example:

Good:

> "You spent 18,400 DZD on hiking-related purchases this month, compared with 6,200 DZD in August."

Bad:

> "You are spending too much on hiking. Stop buying gear."

---

# 2. Tech Stack

Use:

* MongoDB
* Express.js
* React
* Node.js
* TypeScript
* REST API
* Mongoose
* React Router
* A modern charting library suitable for React
* Tailwind CSS or another maintainable styling system
* Render for deployment

Prefer TypeScript throughout the application.

Keep frontend and backend clearly separated.

Suggested structure:

```text
/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── styles/
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   └── ...
│
├── README.md
├── CLAUDE.md
└── package.json
```

Do not introduce unnecessary technologies merely because they are fashionable.

Keep the architecture understandable.

---

# 3. Privacy

This is a PERSONAL finance application.

Treat financial data as private by default.

Never expose financial information publicly.

The application must not:

* expose API endpoints without appropriate authentication
* store passwords in plaintext
* expose MongoDB credentials
* expose secrets in the frontend
* commit `.env` files
* log sensitive financial data unnecessarily

Use environment variables for:

```text
MONGODB_URI
JWT_SECRET
CLIENT_URL
PORT
```

If authentication is implemented, use secure password hashing and token handling.

The user should be able to run the application privately without any social features.

There should be no:

* public profiles
* followers
* social feed
* public spending
* leaderboards

---

# 4. Main User Experience

When the user opens the application, they should immediately understand what they can do.

Primary actions:

1. Add Expense
2. Add Income
3. View History
4. Analyze Finances

Secondary functionality:

* Manage Categories
* Compare Periods
* View financial trends
* Search/filter transactions
* Edit/delete transactions
* Settings

The application should NOT open with a wall of statistics.

The dashboard should feel like a financial workspace rather than an accounting spreadsheet.

---

# 5. Main Dashboard

The dashboard should answer:

"What is happening with my money right now?"

Possible dashboard sections:

### Current period

Show:

* Current month income
* Current month expenses
* Net change
* Number of transactions
* Largest expense
* Most-used spending area

Example:

```text
September 2026

Income       42,000 DZD
Spent        27,450 DZD
Remaining    14,550 DZD

23 transactions
Largest purchase: Hiking jacket — 8,500 DZD
```

These numbers should not dominate the interface.

Use visual hierarchy.

---

# 6. Dashboard Visual Identity

Avoid generic finance-dashboard aesthetics.

DO NOT create:

* endless white cards
* generic blue gradients
* excessive rounded rectangles
* meaningless dashboard widgets
* giant "Total Balance" cards
* stock-fintech aesthetics
* excessive donut charts
* arbitrary icons everywhere
* generic SaaS templates

The interface should feel like a carefully designed personal tool.

Visual direction:

* editorial
* calm
* modern
* slightly playful
* data-oriented
* tactile
* personal
* minimal but not sterile

Think:

"personal field journal for money"

rather than:

"corporate banking admin panel"

Use typography, spacing, subtle borders, visual rhythm, and meaningful hierarchy instead of decorative UI.

The design should still be practical and fast.

---

# 7. Expenses

An expense represents money leaving the user's finances.

The user should be able to quickly add a simple expense without filling out a giant accounting form.

Basic expense fields:

```text
Amount
Date
What did you buy?
Category
Subcategory (optional)
Spending type
Notes (optional)
```

Spending type should support:

* Necessity
* Good to have
* Complementary
* Impulse / Unplanned
* Other

Do NOT force the user to select a category if they do not want to.

Categories should be flexible.

---

# 8. Purchases With Multiple Items

The application should support an expense containing multiple purchased items.

Example:

```text
Expense
Date: September 28, 2026
Store: Decathlon

Items:
- Hiking jacket — 8,500 DZD
- Hiking pants — 5,900 DZD
- Hiking socks — 1,200 DZD

Total: 15,600 DZD
Category: Hiking
Spending type: Good to have
```

This is important.

Do not model every purchase as only:

```text
amount = 15600
description = "Decathlon"
```

The application should preserve useful detail.

Suggested structure:

```text
Expense
├── totalAmount
├── date
├── merchant
├── category
├── subcategory
├── spendingType
├── notes
└── items[]
    ├── name
    ├── amount
    └── quantity
```

The total should be validated against the item amounts when items are provided.

---

# 9. Categories

Categories must NOT be hardcoded permanently.

The user should be able to create, rename, archive, and organize categories.

Examples:

```text
Hiking
    ├── Clothing
    ├── Gear
    ├── Food
    └── Transportation

Personal
    ├── Clothing
    ├── Beauty
    └── Miscellaneous

Education
    ├── Courses
    ├── Books
    └── Exams

Technology
    ├── Software
    ├── Hardware
    └── Subscriptions
```

Categories can evolve as the user's life evolves.

If the user starts photography as a hobby, they should be able to create:

```text
Hobbies
    └── Photography
```

or simply:

```text
Photography
```

Do not impose a rigid hierarchy.

Support optional parent categories.

Suggested category model:

```text
Category
├── name
├── parentId (optional)
├── icon (optional)
├── archived
├── createdAt
└── updatedAt
```

Archived categories should remain attached to historical transactions.

Deleting a category must NOT destroy historical financial data.

---

# 10. Income

The user should be able to log income separately.

Examples:

* Freelance payment
* Salary
* Client payment
* Gift
* Refund
* Other income

Income fields:

```text
Amount
Date
Source
Category/type
Notes
```

Example:

```text
Income
42,000 DZD
September 14
Source: Freelance project
Type: Freelance
```

Income categories should also be customizable.

---

# 11. Transaction History

The History page is one of the core features.

It should allow the user to browse their entire financial history.

Support:

* Date filtering
* Month filtering
* Year filtering
* Income/expense filtering
* Category filtering
* Spending-type filtering
* Search
* Merchant search
* Amount range

Example search:

```text
September 2026
↓
Expenses
↓
Hiking
```

should show every hiking-related expense during September.

Transactions should be sortable by:

* newest
* oldest
* highest amount
* lowest amount

Each transaction should be editable.

Deleting should require confirmation.

---

# 12. Time

Time is a first-class concept in the application.

The user should be able to view:

* Today
* This week
* This month
* Previous month
* Custom date range
* Specific month
* Specific year
* Multiple years

The application must support long-term historical data.

Do not design the database around a single year.

The user should realistically be able to use this application for 5–10+ years.

Store transaction dates properly and perform date calculations server-side where appropriate.

Be careful with timezone handling.

---

# 13. Month Comparison

A major feature is comparing two periods.

Example:

```text
Compare

July 2026
vs
September 2026
```

The comparison should show:

```text
Income
July:       38,000 DZD
September:  42,000 DZD

Expenses
July:       21,500 DZD
September:  27,450 DZD

Net
July:       +16,500 DZD
September:  +14,550 DZD
```

Then provide meaningful breakdowns.

For example:

```text
Hiking
July:       2,500 DZD
September:  15,600 DZD

Education
July:       8,000 DZD
September:  4,500 DZD
```

The application should identify meaningful changes without pretending to know why they happened.

Example:

> "Hiking spending increased by 13,100 DZD."

Not:

> "You became irresponsible with hiking purchases."

---

# 14. Analysis

The Analysis section should help the user understand patterns.

Useful visualizations include:

### Spending over time

Line chart showing total spending per month.

### Income vs expenses

Monthly comparison.

### Spending by category

Bar chart is preferred over a donut chart when there are many categories.

### Spending type

For example:

```text
Necessity
Good to have
Complementary
Impulse / Unplanned
```

### Largest purchases

Show the largest individual expenses for the selected period.

### Category trends

Show how a category changes over time.

Example:

```text
Hiking

May     0
June    2,000
July    2,500
August  6,200
Sept    15,600
```

This makes behavioral changes visible.

---

# 15. Recommendations / Observations

The application may include a section called:

"Things worth noticing"

rather than "Financial Advice."

These observations should be generated from actual user data.

Examples:

> "Your spending increased 31% compared with last month."

> "You made 4 hiking-related purchases this month."

> "Your three largest purchases represent 46% of your total spending this month."

> "You spent more on optional purchases than necessities this month."

> "September is currently your highest-spending month of 2026."

These are observations.

Do not make unsupported financial claims.

Do not pretend to be a financial advisor.

Do not generate recommendations from insufficient data.

---

# 16. Impulse Spending

Because one purpose of the application is to help the user notice impulsive shopping, the system should preserve whether a purchase was:

* Necessity
* Good to have
* Complementary
* Impulse / Unplanned

Do not hide impulse purchases.

Do not shame them.

Allow analysis such as:

```text
September 2026

Necessities              12,400 DZD
Good to have               7,800 DZD
Complementary              4,100 DZD
Impulse / Unplanned        3,150 DZD
```

This can become one of the most useful long-term indicators.

---

# 17. Merchant / Store Tracking

Expenses should optionally include a merchant/store.

Examples:

```text
Decathlon
Local grocery
Amazon
Freelance platform
Pharmacy
Restaurant
```

The user should later be able to answer:

> "How much have I spent at Decathlon this year?"

Support merchant filtering.

Do not force merchants into a separate category system unless necessary.

A merchant is not necessarily a category.

---

# 18. Notes

Allow free-form notes on transactions.

Example:

```text
Bought because my old hiking jacket is no longer waterproof.
```

or:

```text
Impulse purchase. Didn't originally plan to buy this.
```

Notes are useful for future reflection.

Do not over-structure everything.

---

# 19. Search

Global transaction search should support:

* item name
* merchant
* category
* notes

Example:

Searching:

```text
jacket
```

should find:

```text
Hiking jacket
Winter jacket
Rain jacket
```

---

# 20. Dashboard Navigation

Suggested navigation:

```text
Home
History
Analyze
Compare
Categories
Settings
```

Primary quick actions should always remain easy to access:

```text
+ Expense
+ Income
```

On desktop, these can live prominently in the navigation/header.

On mobile, use an accessible floating or bottom action.

The application must be responsive.

---

# 21. Data Model

Suggested MongoDB collections:

```text
users
transactions
categories
```

Potential transaction structure:

```typescript
Transaction {
  _id: ObjectId

  userId: ObjectId

  type: "expense" | "income"

  amount: number

  date: Date

  description: string

  merchant?: string

  categoryId?: ObjectId

  subcategoryId?: ObjectId

  spendingType?:
    | "necessity"
    | "good_to_have"
    | "complementary"
    | "impulse"
    | "other"

  notes?: string

  items?: [
    {
      name: string
      amount: number
      quantity?: number
    }
  ]

  createdAt: Date
  updatedAt: Date
}
```

Do not duplicate category names directly inside every transaction if category references are being used.

However, historical integrity must be preserved if a category is renamed or archived.

---

# 22. API

Use RESTful endpoints.

Example:

```text
POST   /api/transactions
GET    /api/transactions
GET    /api/transactions/:id
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/analytics/summary
GET    /api/analytics/monthly
GET    /api/analytics/categories
GET    /api/analytics/comparison

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

Analytics endpoints should accept date ranges and filters rather than creating separate endpoints for every possible combination.

---

# 23. Analytics Architecture

Do not calculate everything in React.

The backend should perform aggregation where appropriate.

MongoDB aggregation pipelines can be used for:

* monthly totals
* category totals
* spending-type totals
* merchant totals
* period comparisons
* highest expenses
* income vs expenses

Keep analytics logic inside services rather than controllers.

Example:

```text
analytics/
├── summary.service.ts
├── monthly.service.ts
├── category.service.ts
└── comparison.service.ts
```

---

# 24. Performance

The application is expected to accumulate years of data.

Design accordingly.

Use MongoDB indexes for common queries, especially:

```text
userId
userId + date
userId + type
userId + categoryId
```

Do not load thousands of transactions into the frontend simply to calculate totals.

Use pagination for History.

Analytics should request aggregated data.

---

# 25. UX Principles

The user should be able to log an ordinary expense in less than a minute.

Avoid unnecessarily long forms.

Use progressive disclosure.

For example:

First:

```text
What did you buy?
Amount?
```

Then optionally:

```text
Category
Merchant
Spending type
Notes
Items
```

The user should be able to record something quickly and add detail when they care.

---

# 26. Forms

Expense form example:

```text
Add Expense

What did you buy?
[ Hiking jacket ]

Amount
[ 8500 DZD ]

Date
[ 28 Sep 2026 ]

Category
[ Hiking ]

Spending type
[ Good to have ]

Store
[ Decathlon ]

+ Add another item

Notes
[ ... ]

[ Save Expense ]
```

For multiple items:

```text
Items

Hiking jacket       8500
Hiking pants        5900
Hiking socks        1200

Total              15600
```

The UI should automatically calculate the total.

---

# 27. Empty States

Do not use generic empty-state messages.

Instead of:

> "No data available."

Use context-aware messages.

Example:

> "Nothing recorded yet. Your first transaction will become the first line in your financial history."

For Analysis:

> "There isn't enough history here yet. Keep recording normally; patterns become more useful over time."

---

# 28. Design System

Create a coherent design system before building individual pages.

Define:

* typography
* spacing
* borders
* shadows
* radius
* buttons
* inputs
* dropdowns
* charts
* tables
* badges
* modal/dialog behavior

Do not invent a different style for every page.

The application should feel like one product.

Avoid excessive use of gradients.

Avoid excessive animations.

Use animation only when it improves feedback or orientation.

---

# 29. Charts

Charts must answer questions.

Do not add charts simply because dashboards normally have charts.

Every visualization should communicate something useful.

Preferred:

* line charts
* bar charts
* stacked bars
* simple area charts where appropriate

Use donut/pie charts sparingly.

For comparison, prioritize side-by-side visual comparison.

Charts must have:

* clear labels
* useful tooltips
* correct date ranges
* accessible colors
* readable mobile behavior

---

# 30. Mobile

The application must work well on mobile.

Logging an expense from a phone should be one of the easiest interactions.

History should become a readable transaction list rather than an oversized desktop table.

Charts should remain readable.

The dashboard should not simply shrink the desktop interface.

Design mobile intentionally.

---

# 31. Localization / Currency

The initial application should support DZD.

However, do not hardcode the entire architecture around DZD.

Create a currency setting.

Future currencies can include:

```text
DZD
EUR
USD
GBP
```

The application should store numeric amounts consistently.

Display formatting should be separated from stored values.

---

# 32. Date Formatting

Use the user's locale appropriately.

The application should clearly display dates such as:

```text
28 Sep 2026
```

rather than ambiguous formats such as:

```text
09/28/26
```

unless the locale explicitly requires it.

---

# 33. Error Handling

Errors should be understandable.

Bad:

> Error 500.

Better:

> "We couldn't save this expense. Your data has not been changed."

Show loading states.

Prevent duplicate submissions.

Validate forms on both frontend and backend.

---

# 34. Delete Behavior

Deleting a financial transaction is destructive.

Require confirmation.

Example:

> "Delete this expense?"

Show enough information to make the user certain they are deleting the correct transaction.

Do not silently delete.

For categories, prefer archive behavior over destructive deletion.

---

# 35. Seed Data

During development, create realistic mock data.

Example:

```text
Income:
Freelance payment
Gift
Refund

Expenses:
Groceries
Hiking jacket
Hiking pants
Course
Restaurant
Transportation
Phone bill
Books
Coffee
```

Create several months of data so that analytics and comparisons can be developed properly.

Do not use fake data in production.

---

# 36. Testing

At minimum, test:

### Backend

* creating transactions
* updating transactions
* deleting transactions
* authentication
* category creation
* analytics calculations
* month comparison
* date filtering

### Frontend

* expense form
* income form
* history filtering
* comparison
* category management
* responsive behavior

Analytics calculations are particularly important.

A wrong financial total is worse than a broken button.

---

# 37. Deployment

The application should be deployable on Render.

Expected deployment:

```text
Frontend
React application

Backend
Node/Express application

Database
MongoDB Atlas
```

Configure production environment variables securely.

Do not hardcode:

* database URLs
* JWT secrets
* API keys
* credentials

Create a production-ready README explaining deployment.

---

# 38. Development Process

Build incrementally.

Do NOT attempt to build every feature at once.

Recommended phases:

## Phase 1 — Foundation

* MERN project setup
* TypeScript
* MongoDB connection
* Express API
* React frontend
* authentication
* basic layout
* environment configuration

## Phase 2 — Core Transactions

* add expense
* add income
* transaction model
* transaction history
* edit transaction
* delete transaction
* pagination

## Phase 3 — Categories

* category CRUD
* parent/subcategory support
* archive categories
* category filtering

## Phase 4 — Dashboard

* current month summary
* income vs expenses
* recent transactions
* largest expenses
* basic spending breakdown

## Phase 5 — Analytics

* monthly spending
* category trends
* spending types
* merchant analysis
* yearly overview

## Phase 6 — Comparison

* month vs month
* custom period vs custom period
* category comparison
* income comparison
* expense comparison

## Phase 7 — Observations

Implement rule-based observations such as:

* unusually high spending
* increased category spending
* largest purchase
* spending-type distribution
* highest spending month

Do this with deterministic rules first.

Do NOT add an LLM just because the application contains the word "AI."

## Phase 8 — Polish

* responsive design
* loading states
* empty states
* error handling
* accessibility
* animations
* visual refinement

## Phase 9 — Deployment

* Render deployment
* MongoDB Atlas
* production environment variables
* production testing
* README

---

# 39. Important Product Constraint

Do not over-engineer this application.

This is a personal tool.

If a feature does not help the user:

1. record money,
2. understand money,
3. compare money over time,
4. notice patterns,

it probably does not belong in V1.

Do not add:

* cryptocurrency tracking
* investment portfolios
* bank synchronization
* social features
* shared household accounts
* complicated budgeting systems
* AI financial advisors
* subscription marketplaces
* gamification
* unnecessary notifications

These can be considered later if the core application proves useful.

---

# 40. Future Possibilities

The architecture should leave room for future features without implementing them now.

Possible future features:

* recurring expenses
* recurring income
* budgets
* savings goals
* attachments/receipts
* CSV export
* financial reports
* spending forecasts
* multiple accounts/wallets
* multiple currencies
* visual calendar
* receipt OCR
* natural-language transaction entry
* AI-powered pattern summaries

But do not implement these unless explicitly requested.

---

# 41. Product Personality

The product should feel like:

> "A private little observatory where I can look at the trail my money has left behind."

It should not feel like:

> "An accounting system that expects me to behave."

The application should encourage curiosity.

A user should be able to open it casually and think:

> "Let me see where my money went this month."

Then progressively explore:

```text
September
↓
Expenses
↓
Hiking
↓
15,600 DZD
↓
4 purchases
↓
Largest purchase: Jacket
↓
Compared with August: +9,400 DZD
```

That progression is the heart of the product.

---

# 42. Claude Coding Rules

When implementing this project:

1. Understand the existing architecture before modifying it.
2. Do not rewrite working features unnecessarily.
3. Do not introduce dependencies without a reason.
4. Keep components reasonably small.
5. Keep business logic out of UI components.
6. Keep database logic in models/services.
7. Keep controllers thin.
8. Validate API inputs.
9. Handle loading/error/empty states.
10. Write reusable components where reuse is meaningful.
11. Do not duplicate business logic between frontend and backend.
12. Do not hardcode categories.
13. Do not hardcode dates.
14. Do not hardcode currency assumptions into transaction logic.
15. Do not sacrifice data integrity for UI convenience.
16. Do not create mock functionality that looks real unless clearly marked as development data.
17. Do not use placeholder lorem ipsum in the final UI.
18. Do not use generic dashboard templates.
19. Do not add AI features without a concrete user benefit.
20. Before implementing a large feature, explain the proposed data flow and architecture.

When uncertain between a complicated solution and a simple solution, prefer the simple solution that preserves future extensibility.

---

# 43. Definition of Done

A feature is not considered complete merely because it renders.

A feature is complete when:

* it works end-to-end
* data persists correctly
* validation exists
* errors are handled
* loading states exist
* empty states exist
* it works on mobile
* it respects authentication
* it does not break existing functionality
* the UI matches the project's visual language
* the relevant README/documentation is updated

---

# 44. First Task

Before writing a large amount of code:

1. Inspect the repository.
2. Determine whether an application already exists or this is a fresh project.
3. Propose the initial architecture.
4. Define the MongoDB schemas.
5. Define the API structure.
6. Define the initial frontend routes.
7. Define the visual direction.
8. Explain the implementation phases.

Then implement Phase 1.

Do not build the entire application in one pass.

The goal is a maintainable personal finance product that can evolve for years.


By the way the name of the project and the website is:  # PawLedger
PawLedger
Your money, leaving a trail.
A private, long-term personal finance observatory built with the MERN stack.