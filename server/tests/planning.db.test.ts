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
const account = async (a: Agent, body: object) => (await a.post("/api/accounts").send(body).expect(201)).body.account.id as string;
const entry = (a: Agent, over = {}) => a.post("/api/transactions").send({ type: "expense", amount: 1000, date: "2026-09-10", description: "Thing", ...over }).expect(201);

describe("accounts", () => {
  it("requires a session", async () => {
    await request(app).get("/api/accounts").expect(401);
    await request(app).get("/api/inventories/overview").expect(401);
    await request(app).get("/api/plans").expect(401);
  });

  it("creates, renames, rejects duplicate names (any case), and only lets savings have a target", async () => {
    const a = await signedIn("acc1@example.com");
    const bank = await account(a, { name: "Bank", kind: "bank" });
    await a.post("/api/accounts").send({ name: "bank", kind: "cash" }).expect(409);
    await a.post("/api/accounts").send({ name: "Cash", kind: "cash", target: 5 }).expect(400);
    await account(a, { name: "Savings", kind: "savings", target: 10_000_000 });
    await a.put(`/api/accounts/${bank}`).send({ name: "Main bank", kind: "bank" }).expect(200);
    expect((await a.get("/api/accounts")).body.accounts.map((x: { name: string }) => x.name).sort()).toEqual(["Main bank", "Savings"]);
  });

  it("archives, and deletes only an account no inventory has counted", async () => {
    const a = await signedIn("acc2@example.com");
    const bank = await account(a, { name: "Bank", kind: "bank" });
    const spare = await account(a, { name: "Spare", kind: "cash" });
    await a.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1000 }] }).expect(201);
    await a.delete(`/api/accounts/${bank}`).expect(409);
    await a.delete(`/api/accounts/${spare}`).expect(204);
    await a.patch(`/api/accounts/${bank}/archive`).send({ archived: true }).expect(200);
  });
});

describe("inventories", () => {
  it("files an inventory under the month that is starting, and refuses a second for the same month", async () => {
    const a = await signedIn("inv1@example.com");
    const bank = await account(a, { name: "Bank", kind: "bank" });
    const first = await a.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1000 }] }).expect(201);
    expect(first.body.inventory.month).toBe("2026-10"); // counted at the end of September: the start of October
    await a.post("/api/inventories").send({ asOf: "2026-10-01", balances: [{ accountId: bank, amount: 2000 }] }).expect(409); // same month
    const other = await a.post("/api/inventories").send({ asOf: "2026-08-31", balances: [{ accountId: bank, amount: 900 }] }).expect(201);
    expect(other.body.inventory.month).toBe("2026-09");
  });

  it("rejects a future date, an unknown account, an archived account, and a repeated account", async () => {
    const a = await signedIn("inv2@example.com");
    const bank = await account(a, { name: "Bank", kind: "bank" });
    const old = await account(a, { name: "Old", kind: "cash" });
    await a.patch(`/api/accounts/${old}/archive`).send({ archived: true });
    await a.post("/api/inventories").send({ asOf: "2999-01-01", balances: [{ accountId: bank, amount: 1 }] }).expect(400);
    await a.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: "64b7f0c2a1b2c3d4e5f60718", amount: 1 }] }).expect(400);
    await a.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1 }, { accountId: old, amount: 1 }] }).expect(400);
    await a.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1 }, { accountId: bank, amount: 2 }] }).expect(400);
  });

  it("reconciles two inventories against the entries between them, including money that has no entry", async () => {
    const a = await signedIn("inv3@example.com");
    const bank = await account(a, { name: "Bank", kind: "bank" });
    const sav = await account(a, { name: "Savings", kind: "savings", target: 100_000 });
    await a.post("/api/inventories").send({ asOf: "2026-08-31", balances: [{ accountId: bank, amount: 1_000_000 }, { accountId: sav, amount: 500_000 }] }).expect(201);
    await entry(a, { amount: 100_000, date: "2026-09-10" });
    await a.post("/api/transactions").send({ type: "income", amount: 300_000, date: "2026-09-12", description: "Pay" }).expect(201);
    await entry(a, { amount: 7_777, date: "2026-08-31", description: "Counted in the earlier period, so outside" });
    await entry(a, { amount: 8_888, date: "2026-10-01", description: "After the second count, so outside" });
    // +300k -100k = +200k recorded; 150k moved into savings; and 50k fewer than that in the bank with no entry
    await a.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1_000_000 }, { accountId: sav, amount: 650_000 }] }).expect(201);

    const o = (await a.get("/api/inventories/overview")).body;
    expect(o.inventories).toHaveLength(2);
    expect(o.periods).toHaveLength(1);
    expect(o.periods[0]).toMatchObject({ fromMonth: "2026-09", toMonth: "2026-10", income: 300_000, expenses: 100_000, entryCount: 2, recordedChange: 200_000, change: 150_000, unexplained: -50_000, savingsChange: 150_000 });
    expect(o.savings[0]).toMatchObject({ name: "Savings", balance: 650_000, target: 100_000 });
  });

  it("updates and deletes, and offers an inventory only when one is due", async () => {
    const a = await signedIn("inv4@example.com");
    const bank = await account(a, { name: "Bank", kind: "bank" });
    const id = (await a.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1000 }] }).expect(201)).body.inventory.id;
    await a.put(`/api/inventories/${id}`).send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1500 }], notes: "Recounted" }).expect(200);
    expect((await a.get("/api/inventories/overview")).body.inventories[0]).toMatchObject({ total: 1500, notes: "Recounted" });
    expect((await a.get("/api/inventories/prompt")).body).toHaveProperty("prompt");
    await a.delete(`/api/inventories/${id}`).expect(204);
    await a.delete(`/api/inventories/${id}`).expect(404);
  });

  it("is private to each user", async () => {
    const a = await signedIn("inv5@example.com");
    const b = await signedIn("inv6@example.com");
    const bank = await account(a, { name: "Bank", kind: "bank" });
    const id = (await a.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1000 }] }).expect(201)).body.inventory.id;
    expect((await b.get("/api/accounts")).body.accounts).toHaveLength(0);
    expect((await b.get("/api/inventories/overview")).body.inventories).toHaveLength(0);
    await b.put(`/api/inventories/${id}`).send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1 }] }).expect(404); // the inventory is not b's
    await b.delete(`/api/inventories/${id}`).expect(404);
    await b.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 1 }] }).expect(400);
  });
});

describe("plans", () => {
  it("saves a plan and sets it against what was spent, with category lines", async () => {
    const a = await signedIn("plan1@example.com");
    const hiking = (await a.post("/api/categories").send({ name: "Hiking", kind: "expense" })).body.category.id;
    await entry(a, { amount: 156_000, date: "2026-09-10", categoryId: hiking });
    await entry(a, { amount: 30_000, date: "2026-09-12" });
    await a.put("/api/plans/2026-09").send({ expectedSpending: 300_000, expectedSaving: 80_000, categories: [{ categoryId: hiking, amount: 100_000 }] }).expect(200);

    const v = (await a.get("/api/plans?month=2026-09")).body;
    expect(v.plan).toMatchObject({ month: "2026-09", expectedSpending: 300_000 });
    expect(v.review.spending).toMatchObject({ expected: 300_000, actual: 186_000, difference: -114_000 });
    expect(v.review.categories[0]).toMatchObject({ name: "Hiking", expected: 100_000, actual: 156_000 });
    expect(v.review.saving).toMatchObject({ expected: 80_000, actual: null }); // no inventories yet
  });

  it("replaces a plan, dropping what was left out, and reports saving once two inventories exist", async () => {
    const a = await signedIn("plan2@example.com");
    const bank = await account(a, { name: "Bank", kind: "bank" });
    const sav = await account(a, { name: "Savings", kind: "savings" });
    await a.post("/api/inventories").send({ asOf: "2026-08-31", balances: [{ accountId: bank, amount: 100 }, { accountId: sav, amount: 100 }] }).expect(201);
    await a.post("/api/inventories").send({ asOf: "2026-09-30", balances: [{ accountId: bank, amount: 100 }, { accountId: sav, amount: 400 }] }).expect(201);
    await a.put("/api/plans/2026-09").send({ expectedSpending: 5000, expectedIncome: 9000, expectedSaving: 250, notes: "First draft" }).expect(200);
    await a.put("/api/plans/2026-09").send({ expectedSpending: 6000, expectedSaving: 250 }).expect(200);
    const v = (await a.get("/api/plans?month=2026-09")).body;
    expect(v.plan.expectedSpending).toBe(6000);
    expect(v.plan.expectedIncome).toBeUndefined();
    expect(v.plan.notes).toBeUndefined();
    expect(v.review.saving).toMatchObject({ expected: 250, actual: 300, difference: 50 });
  });

  it("rejects income categories, a category together with its own sub-category, and unknown categories", async () => {
    const a = await signedIn("plan3@example.com");
    const hiking = (await a.post("/api/categories").send({ name: "Hiking", kind: "expense" })).body.category.id;
    const gear = (await a.post("/api/categories").send({ name: "Gear", kind: "expense", parentId: hiking })).body.category.id;
    const pay = (await a.post("/api/categories").send({ name: "Pay", kind: "income" })).body.category.id;
    await a.put("/api/plans/2026-09").send({ expectedSpending: 100, categories: [{ categoryId: pay, amount: 5 }] }).expect(400);
    await a.put("/api/plans/2026-09").send({ expectedSpending: 100, categories: [{ categoryId: hiking, amount: 5 }, { categoryId: gear, amount: 5 }] }).expect(400);
    await a.put("/api/plans/2026-09").send({ expectedSpending: 100, categories: [{ categoryId: "64b7f0c2a1b2c3d4e5f60718", amount: 5 }] }).expect(400);
    await a.put("/api/plans/2026-09").send({ expectedSpending: 100, categories: [{ categoryId: gear, amount: 5 }] }).expect(200); // a sub-category alone is fine
    await a.put("/api/plans/2026-13").send({ expectedSpending: 100 }).expect(400);
  });

  it("deletes a plan, and returns the previous month's plan so it can be copied", async () => {
    const a = await signedIn("plan4@example.com");
    await a.put("/api/plans/2026-08").send({ expectedSpending: 5000 }).expect(200);
    expect((await a.get("/api/plans?month=2026-09")).body.previousPlan).toMatchObject({ month: "2026-08", expectedSpending: 5000 });
    await a.delete("/api/plans/2026-08").expect(204);
    await a.delete("/api/plans/2026-08").expect(404);
  });

  it("feeds the plan into 'things worth noticing', and is private to each user", async () => {
    const a = await signedIn("plan5@example.com");
    const b = await signedIn("plan6@example.com");
    for (const d of ["2026-09-05", "2026-09-06", "2026-09-07"]) await entry(a, { amount: 10_000, date: d });
    await a.put("/api/plans/2026-09").send({ expectedSpending: 50_000 }).expect(200);
    const kinds = (await a.get("/api/analytics/observations?month=2026-09")).body.observations.map((o: { kind: string }) => o.kind);
    expect(kinds[0]).toBe("plan_spending");
    expect((await b.get("/api/plans?month=2026-09")).body.plan).toBeNull();
  });
});
