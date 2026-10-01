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

describe("observations", () => {
  it("requires a session and validates the month", async () => {
    await request(app).get("/api/analytics/observations").expect(401);
    const a = await signedIn("o0@example.com");
    await a.get("/api/analytics/observations?month=nope").expect(400);
  });

  it("says nothing for a month with too little in it", async () => {
    const a = await signedIn("o1@example.com");
    await add(a, { amount: 5000 });
    const r = (await a.get("/api/analytics/observations?month=2026-09")).body;
    expect(r).toMatchObject({ month: "2026-09", expenseCount: 1, observations: [] });
  });

  it("finds a rise against the previous month and a category that grew", async () => {
    const a = await signedIn("o2@example.com");
    const hiking = (await a.post("/api/categories").send({ name: "Hiking", kind: "expense" })).body.category.id;
    await add(a, { amount: 10000, date: "2026-08-10" });
    await add(a, { amount: 10000, date: "2026-08-11" });
    await add(a, { amount: 10000, date: "2026-08-12" });
    await add(a, { amount: 40000, date: "2026-09-05", categoryId: hiking });
    await add(a, { amount: 20000, date: "2026-09-06", categoryId: hiking });
    await add(a, { amount: 10000, date: "2026-09-07" });
    const r = (await a.get("/api/analytics/observations?month=2026-09")).body;
    const kinds = r.observations.map((o: { kind: string }) => o.kind);
    expect(kinds).toContain("spending_change");
    expect(kinds).toContain("category_increase");
    expect(r.observations.find((o: { kind: string }) => o.kind === "spending_change")).toMatchObject({ current: 70000, previous: 30000 });
    expect(r.comparedWith).toMatchObject({ month: "2026-08", partial: false });
  });

  it("compares the running month with the same days of last month, and never with other users' data", async () => {
    const a = await signedIn("o3@example.com");
    const b = await signedIn("o4@example.com");
    await add(a, { amount: 1000 });
    const cur = (await a.get("/api/analytics/observations")).body;
    expect(cur.comparedWith.partial).toBe(true);
    expect(cur.month).toBe(cur.currentMonth);
    expect((await b.get("/api/analytics/observations?month=2026-09")).body.expenseCount).toBe(0);
  });
});
