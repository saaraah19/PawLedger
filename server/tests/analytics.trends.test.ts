import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function signedIn(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ email, password: "a-long-enough-password" }).expect(201);
  return agent;
}
type Agent = Awaited<ReturnType<typeof signedIn>>;
const tx = (over = {}) => ({ type: "expense", amount: 1000, date: "2026-09-15", description: "Thing", ...over });
const add = (a: Agent, over = {}) => a.post("/api/transactions").send(tx(over)).expect(201);

describe("monthly", () => {
  it("requires a session and validates the range", async () => {
    await request(app).get("/api/analytics/monthly").expect(401);
    const a = await signedIn("m0@example.com");
    await a.get("/api/analytics/monthly?from=2026-09").expect(400);
  });

  it("zero-fills gaps, splits income from spending, and reports the first month", async () => {
    const a = await signedIn("m1@example.com");
    await add(a, { amount: 3000, date: "2026-06-30" });
    await add(a, { amount: 2000, date: "2026-08-01" });
    await add(a, { type: "income", amount: 9000, date: "2026-08-20", description: "Freelance" });
    const r = (await a.get("/api/analytics/monthly?from=2026-06&to=2026-09")).body;
    expect(r.months.map((m: { month: string }) => m.month)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
    expect(r.months[0]).toMatchObject({ expenses: 3000, income: 0, net: -3000 });
    expect(r.months[1]).toMatchObject({ expenses: 0, income: 0, count: 0 });
    expect(r.months[2]).toMatchObject({ expenses: 2000, income: 9000, net: 7000 });
    expect(r.firstMonth).toBe("2026-06");
  });

  it("isolates users", async () => {
    const a = await signedIn("m2@example.com");
    const b = await signedIn("m3@example.com");
    await add(a, { amount: 777 });
    const r = (await b.get("/api/analytics/monthly?from=2026-09&to=2026-09")).body;
    expect(r.months[0].expenses).toBe(0);
    expect(r.firstMonth).toBeNull();
  });
});

describe("breakdown", () => {
  it("groups spending types and merchants without losing money", async () => {
    const a = await signedIn("b1@example.com");
    await add(a, { amount: 5000, spendingType: "necessity", merchant: "Decathlon" });
    await add(a, { amount: 3000, spendingType: "impulse", merchant: "decathlon " });
    await add(a, { amount: 700, merchant: "Pharmacy" });
    await add(a, { amount: 200 });
    const b = (await a.get("/api/analytics/breakdown?from=2026-09&to=2026-09")).body;

    expect(b.expenses.total).toBe(8900);
    expect(b.spendingTypes.reduce((s: number, t: { total: number }) => s + t.total, 0)).toBe(8900);
    expect(b.spendingTypes.find((t: { type: string | null }) => t.type === null).total).toBe(900); // not set
    expect(b.merchants[0]).toMatchObject({ total: 8000, count: 2 }); // case-insensitive grouping
    expect(b.merchants).toHaveLength(2); // no merchant = not listed
    expect(b.largestExpenses[0].amount).toBe(5000);
  });

  it("returns zeros for a period with nothing in it", async () => {
    const a = await signedIn("b2@example.com");
    const b = (await a.get("/api/analytics/breakdown?from=2020-01&to=2020-12")).body;
    expect(b).toMatchObject({ transactionCount: 0, categories: [], spendingTypes: [], merchants: [], largestExpenses: [] });
  });
});

describe("category trend", () => {
  it("includes sub-categories, zero-fills, and rejects other users' categories", async () => {
    const a = await signedIn("t1@example.com");
    const b = await signedIn("t2@example.com");
    const hiking = (await a.post("/api/categories").send({ name: "Hiking", kind: "expense" })).body.category.id;
    const gear = (await a.post("/api/categories").send({ name: "Gear", kind: "expense", parentId: hiking })).body.category.id;
    await add(a, { amount: 2000, date: "2026-07-10", categoryId: hiking });
    await add(a, { amount: 6000, date: "2026-09-10", categoryId: gear });
    await add(a, { amount: 999, date: "2026-09-11" }); // uncategorised, must not count

    const r = (await a.get(`/api/analytics/category-trend?categoryId=${hiking}&from=2026-07&to=2026-09`)).body;
    expect(r.months.map((m: { total: number }) => m.total)).toEqual([2000, 0, 6000]);
    await b.get(`/api/analytics/category-trend?categoryId=${hiking}`).expect(404);
    await a.get("/api/analytics/category-trend").expect(400);
  });
});
