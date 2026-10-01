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

describe("onboarding flag", () => {
  it("starts false and becomes true once the welcome flow is finished", async () => {
    const a = await signedIn("ob1@example.com");
    expect((await a.get("/api/auth/me")).body.user.onboarded).toBe(false);
    expect((await a.post("/api/settings/onboarded").expect(200)).body.user.onboarded).toBe(true);
    expect((await a.get("/api/auth/me")).body.user.onboarded).toBe(true);
    await request(app).post("/api/settings/onboarded").expect(401);
  });
});

describe("example data", () => {
  it("loads into an empty ledger, fills every page's data, and is marked as example", async () => {
    const a = await signedIn("d1@example.com");
    expect((await a.get("/api/demo")).body).toMatchObject({ loaded: false, canLoad: true });
    const r = (await a.post("/api/demo").expect(201)).body;
    expect(r.transactions).toBeGreaterThan(50);
    expect((await a.get("/api/demo")).body).toMatchObject({ loaded: true, canLoad: false });

    const list = (await a.get("/api/transactions?limit=100")).body;
    expect(list.total).toBe(r.transactions);
    expect(list.items.every((t: { demo?: boolean }) => t.demo === true)).toBe(true);
    const s = (await a.get("/api/analytics/summary")).body;
    expect(s.transactionCount).toBeGreaterThan(5);
    expect((await a.get("/api/analytics/observations")).body.observations.length).toBeGreaterThan(0);
  });

  it("loads into a ledger that only has categories, reusing matching ones and leaving them alone on removal", async () => {
    const a = await signedIn("d7@example.com");
    const mine = (await a.post("/api/categories").send({ name: "groceries", kind: "expense" })).body.category.id;
    expect((await a.get("/api/demo")).body.canLoad).toBe(true);
    await a.post("/api/demo").expect(201);
    const cats = (await a.get("/api/categories")).body.categories;
    expect(cats.filter((c: { name: string }) => c.name.toLowerCase() === "groceries")).toHaveLength(1); // reused, not duplicated
    expect((await a.get("/api/transactions?limit=100")).body.items.some((t: { categoryId?: string }) => t.categoryId === mine)).toBe(true);
    await a.delete("/api/demo").expect(200);
    expect((await a.get("/api/categories")).body.categories.map((c: { name: string }) => c.name)).toEqual(["groceries"]);
  });

  it("refuses to mix with real entries, and refuses a second load", async () => {
    const a = await signedIn("d2@example.com");
    await a.post("/api/transactions").send({ type: "expense", amount: 1000, date: "2026-09-15", description: "Mine" }).expect(201);
    await a.post("/api/demo").expect(409);
    const b = await signedIn("d3@example.com");
    await b.post("/api/demo").expect(201);
    await b.post("/api/demo").expect(409);
  });

  it("removes only example entries; edited entries and categories built on stay", async () => {
    const a = await signedIn("d4@example.com");
    await a.post("/api/demo").expect(201);
    const cats = (await a.get("/api/categories")).body.categories;
    const groceries = cats.find((c: { name: string }) => c.name === "Groceries").id;
    const list = (await a.get("/api/transactions?limit=100")).body.items;

    // the user edits one example entry and adds a real one under an example category
    const edited = list.find((t: { categoryId?: string }) => t.categoryId === groceries);
    await a.put(`/api/transactions/${edited.id}`).send({ type: "expense", amount: edited.amount, date: edited.date.slice(0, 10), description: "Edited groceries", categoryId: groceries }).expect(200);
    const hiking = cats.find((c: { name: string }) => c.name === "Hiking").id;
    await a.post("/api/transactions").send({ type: "expense", amount: 5000, date: "2026-09-01", description: "Real hike", categoryId: hiking }).expect(201);

    const removed = (await a.delete("/api/demo").expect(200)).body;
    expect(removed.transactions).toBeGreaterThan(50);

    const left = (await a.get("/api/transactions?limit=100")).body;
    expect(left.items.map((t: { description: string }) => t.description).sort()).toEqual(["Edited groceries", "Real hike"]);
    const names = (await a.get("/api/categories")).body.categories.map((c: { name: string }) => c.name).sort();
    expect(names).toEqual(["Groceries", "Hiking"]); // the two categories in real use survive; the rest are gone
    expect((await a.get("/api/categories")).body.categories.every((c: { demo?: boolean }) => !c.demo)).toBe(true);
    expect((await a.get("/api/demo")).body).toMatchObject({ loaded: false, canLoad: false });
  });

  it("is private to each user", async () => {
    const a = await signedIn("d5@example.com");
    const b = await signedIn("d6@example.com");
    await a.post("/api/demo").expect(201);
    expect((await b.get("/api/demo")).body).toMatchObject({ loaded: false, canLoad: true });
    await b.delete("/api/demo").expect(200);
    expect((await a.get("/api/demo")).body.loaded).toBe(true);
    await request(app).get("/api/demo").expect(401);
  });
});
