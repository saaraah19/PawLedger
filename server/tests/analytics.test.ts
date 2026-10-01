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
const tx = (over = {}) => ({ type: "expense", amount: 1000, date: "2026-09-15", description: "Thing", ...over });

describe("analytics summary", () => {
  it("requires a session", async () => {
    await request(app).get("/api/analytics/summary").expect(401);
  });

  it("totals a month, splits at month boundaries, and rolls categories up", async () => {
    const a = await signedIn("sum@example.com");
    const hiking = (await a.post("/api/categories").send({ name: "Hiking", kind: "expense" })).body.category.id;
    const gear = (await a.post("/api/categories").send({ name: "Gear", kind: "expense", parentId: hiking })).body.category.id;

    await a.post("/api/transactions").send(tx({ amount: 850000, description: "Jacket", categoryId: gear })).expect(201);
    await a.post("/api/transactions").send(tx({ amount: 20000, date: "2026-09-01", categoryId: hiking })).expect(201);
    await a.post("/api/transactions").send(tx({ amount: 5000, date: "2026-09-30" })).expect(201);
    await a.post("/api/transactions").send(tx({ amount: 999999, date: "2026-08-31" })).expect(201); // previous month
    await a.post("/api/transactions").send(tx({ amount: 999999, date: "2026-10-01" })).expect(201); // next month
    await a.post("/api/transactions").send({ type: "income", amount: 4200000, date: "2026-09-10", description: "Freelance" }).expect(201);

    const s = (await a.get("/api/analytics/summary?month=2026-09")).body;
    expect(s.expenses).toEqual({ total: 875000, count: 3 });
    expect(s.income).toEqual({ total: 4200000, count: 1 });
    expect(s.net).toBe(4200000 - 875000);
    expect(s.transactionCount).toBe(4);
    expect(s.largestExpenses[0].description).toBe("Jacket");
    expect(s.categories[0]).toMatchObject({ name: "Hiking", total: 870000, count: 2 });
    expect(s.categories[0].children[0]).toMatchObject({ name: "Gear", total: 850000 });
    expect(s.categories[1]).toMatchObject({ name: "No category", total: 5000 });
    expect(s.topCategory.name).toBe("Hiking");
  });

  it("returns zeros for an empty month and supports custom ranges", async () => {
    const a = await signedIn("empty@example.com");
    const empty = (await a.get("/api/analytics/summary?month=2020-01")).body;
    expect(empty).toMatchObject({ net: 0, transactionCount: 0, categories: [], topCategory: null });

    await a.post("/api/transactions").send(tx({ date: "2026-07-05" })).expect(201);
    await a.post("/api/transactions").send(tx({ date: "2026-09-10" })).expect(201);
    const range = (await a.get("/api/analytics/summary?from=2026-07-01&to=2026-09-30")).body;
    expect(range.expenses.count).toBe(2);
    await a.get("/api/analytics/summary?month=nope").expect(400);
  });

  it("never counts another user's transactions", async () => {
    const a = await signedIn("mine@example.com");
    const b = await signedIn("theirs@example.com");
    await a.post("/api/transactions").send(tx({ amount: 12345 })).expect(201);
    const s = (await b.get("/api/analytics/summary?month=2026-09")).body;
    expect(s.transactionCount).toBe(0);
  });
});

describe("settings", () => {
  it("saves currency and timezone and rejects bad values", async () => {
    const a = await signedIn("settings@example.com");
    const ok = await a.put("/api/settings").send({ currency: "EUR", timezone: "Europe/Paris" }).expect(200);
    expect(ok.body.user).toMatchObject({ currency: "EUR", timezone: "Europe/Paris" });
    expect((await a.get("/api/auth/me")).body.user.currency).toBe("EUR");
    await a.put("/api/settings").send({ currency: "XYZ", timezone: "Europe/Paris" }).expect(400);
    await request(app).put("/api/settings").send({ currency: "EUR", timezone: "UTC" }).expect(401);
  });
});
