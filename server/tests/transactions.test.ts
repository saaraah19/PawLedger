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

const expense = (over = {}) => ({ type: "expense", amount: 15600, date: "2026-09-28", description: "Decathlon", ...over });

describe("transactions", () => {
  it("requires a session", async () => {
    await request(app).get("/api/transactions").expect(401);
    await request(app).post("/api/transactions").send(expense()).expect(401);
  });

  it("creates, reads, updates and deletes", async () => {
    const a = await signedIn("crud@example.com");
    const created = await a
      .post("/api/transactions")
      .send(expense({ items: [{ name: "Jacket", amount: 8500 }, { name: "Pants", amount: 7100 }], spendingType: "good_to_have" }))
      .expect(201);
    const id = created.body.transaction.id;
    expect(created.body.transaction).not.toHaveProperty("userId");

    await a.get(`/api/transactions/${id}`).expect(200);

    const updated = await a.put(`/api/transactions/${id}`).send(expense({ amount: 999, description: "Coffee" })).expect(200);
    expect(updated.body.transaction.amount).toBe(999);
    expect(updated.body.transaction.items).toBeUndefined(); // items were removed by the update

    await a.delete(`/api/transactions/${id}`).expect(204);
    await a.get(`/api/transactions/${id}`).expect(404);
  });

  it("rejects mismatched items with a 400", async () => {
    const a = await signedIn("bad@example.com");
    await a.post("/api/transactions").send(expense({ items: [{ name: "Jacket", amount: 1 }] })).expect(400);
  });

  it("paginates, filters and sorts", async () => {
    const a = await signedIn("list@example.com");
    for (let i = 1; i <= 5; i++) await a.post("/api/transactions").send(expense({ amount: i * 100, description: `e${i}` })).expect(201);
    await a.post("/api/transactions").send({ type: "income", amount: 5000, date: "2026-09-01", description: "Freelance" }).expect(201);

    const p1 = (await a.get("/api/transactions?limit=4&sort=highest")).body;
    expect(p1.total).toBe(6);
    expect(p1.totalPages).toBe(2);
    expect(p1.items.map((t: { amount: number }) => t.amount)).toEqual([5000, 500, 400, 300]);

    const inc = (await a.get("/api/transactions?type=income")).body;
    expect(inc.total).toBe(1);
  });

  it("never lets one user touch another's data", async () => {
    const a = await signedIn("owner@example.com");
    const b = await signedIn("intruder@example.com");
    const id = (await a.post("/api/transactions").send(expense()).expect(201)).body.transaction.id;

    await b.get(`/api/transactions/${id}`).expect(404);
    await b.put(`/api/transactions/${id}`).send(expense({ amount: 1 })).expect(404);
    await b.delete(`/api/transactions/${id}`).expect(404);
    expect((await b.get("/api/transactions")).body.total).toBe(0);
    await a.get(`/api/transactions/${id}`).expect(200);
  });
});
