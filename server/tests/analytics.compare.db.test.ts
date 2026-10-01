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
const add = (a: Agent, over = {}) => a.post("/api/transactions").send({ type: "expense", amount: 1000, date: "2026-09-15", description: "Thing", ...over }).expect(201);

describe("comparison", () => {
  it("requires a session", async () => {
    await request(app).get("/api/analytics/comparison").expect(401);
  });

  it("compares two months per category, income and net", async () => {
    const a = await signedIn("c1@example.com");
    const hiking = (await a.post("/api/categories").send({ name: "Hiking", kind: "expense" })).body.category.id;
    const edu = (await a.post("/api/categories").send({ name: "Education", kind: "expense" })).body.category.id;
    await add(a, { amount: 250000, date: "2026-07-10", categoryId: hiking });
    await add(a, { amount: 800000, date: "2026-07-12", categoryId: edu });
    await add(a, { type: "income", amount: 3800000, date: "2026-07-20", description: "Freelance" });
    await add(a, { amount: 1560000, date: "2026-09-28", categoryId: hiking });
    await add(a, { amount: 450000, date: "2026-09-02", categoryId: edu });
    await add(a, { type: "income", amount: 4200000, date: "2026-09-14", description: "Freelance" });

    const c = (await a.get("/api/analytics/comparison?a=2026-07&b=2026-09")).body;
    expect(c.income).toMatchObject({ change: 400000 });
    expect(c.expenses).toMatchObject({ change: 1560000 + 450000 - 250000 - 800000 });
    expect(c.categories[0]).toMatchObject({ name: "Hiking", change: 1310000 });
    expect(c.categories[1]).toMatchObject({ name: "Education", change: -350000 });
    expect(c.firstMonth).toBe("2026-07");
  });

  it("supports custom date ranges and the no-parameter default", async () => {
    const a = await signedIn("c2@example.com");
    await add(a, { amount: 111, date: "2026-07-05" });
    await add(a, { amount: 222, date: "2026-07-20" });
    const c = (await a.get("/api/analytics/comparison?aFrom=2026-07-01&aTo=2026-07-10&bFrom=2026-07-11&bTo=2026-07-31")).body;
    expect(c.expenses.a.total).toBe(111);
    expect(c.expenses.b.total).toBe(222);
    const d = (await a.get("/api/analytics/comparison")).body;
    expect(d.b.month).toBe(d.currentMonth);
  });

  it("rejects incomplete queries and never mixes users' data", async () => {
    const a = await signedIn("c3@example.com");
    const b = await signedIn("c4@example.com");
    await a.get("/api/analytics/comparison?a=2026-07").expect(400);
    await add(a, { amount: 999, date: "2026-07-05" });
    const c = (await b.get("/api/analytics/comparison?a=2026-07&b=2026-09")).body;
    expect(c.expenses.a.total).toBe(0);
    expect(c.firstMonth).toBeNull();
  });
});
