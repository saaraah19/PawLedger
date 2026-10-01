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
const cat = async (a: Agent, body: object) => (await a.post("/api/categories").send(body).expect(201)).body.category.id as string;
const tx = (over = {}) => ({ type: "expense", amount: 1000, date: "2026-09-28", description: "Thing", ...over });

describe("categories", () => {
  it("requires a session", async () => {
    await request(app).get("/api/categories").expect(401);
  });

  it("builds a tree, rejects deep nesting, duplicates and kind mismatches", async () => {
    const a = await signedIn("tree@example.com");
    const hiking = await cat(a, { name: "Hiking", kind: "expense" });
    const gear = await cat(a, { name: "Gear", kind: "expense", parentId: hiking });
    await a.post("/api/categories").send({ name: "Boots", kind: "expense", parentId: gear }).expect(400); // too deep
    await a.post("/api/categories").send({ name: "hiking", kind: "expense" }).expect(409); // case-insensitive duplicate
    await a.post("/api/categories").send({ name: "Gift", kind: "income", parentId: hiking }).expect(400); // mixed kinds
    await cat(a, { name: "Gear", kind: "expense", parentId: await cat(a, { name: "Personal", kind: "expense" }) }); // same name, other parent: fine
    expect((await a.get("/api/categories")).body.categories).toHaveLength(4);
  });

  it("uses categories on transactions and filters by a parent including its children", async () => {
    const a = await signedIn("filter@example.com");
    const hiking = await cat(a, { name: "Hiking", kind: "expense" });
    const gear = await cat(a, { name: "Gear", kind: "expense", parentId: hiking });
    const food = await cat(a, { name: "Food", kind: "expense" });
    const salary = await cat(a, { name: "Salary", kind: "income" });

    await a.post("/api/transactions").send(tx({ categoryId: hiking })).expect(201);
    await a.post("/api/transactions").send(tx({ categoryId: gear })).expect(201);
    await a.post("/api/transactions").send(tx({ categoryId: food })).expect(201);
    await a.post("/api/transactions").send(tx({ categoryId: salary })).expect(400); // income category on an expense

    expect((await a.get(`/api/transactions?categoryId=${hiking}`)).body.total).toBe(2);
    expect((await a.get(`/api/transactions?categoryId=${gear}`)).body.total).toBe(1);
    const usage = (await a.get("/api/categories")).body.categories.find((c: { id: string }) => c.id === gear).usage;
    expect(usage).toBe(1);
  });

  it("archives (with children), keeps history intact, and blocks new use", async () => {
    const a = await signedIn("archive@example.com");
    const hiking = await cat(a, { name: "Hiking", kind: "expense" });
    const gear = await cat(a, { name: "Gear", kind: "expense", parentId: hiking });
    const t = (await a.post("/api/transactions").send(tx({ categoryId: gear })).expect(201)).body.transaction;

    await a.patch(`/api/categories/${hiking}/archive`).send({ archived: true }).expect(200);
    const all = (await a.get("/api/categories")).body.categories;
    expect(all.every((c: { archived: boolean }) => c.archived)).toBe(true);

    await a.post("/api/transactions").send(tx({ categoryId: gear })).expect(400); // archived: no new use
    await a.put(`/api/transactions/${t.id}`).send(tx({ categoryId: gear, description: "Renamed" })).expect(200); // history stays editable
    expect((await a.get(`/api/transactions/${t.id}`)).body.transaction.categoryId).toBe(gear);

    await a.patch(`/api/categories/${gear}/archive`).send({ archived: false }).expect(409); // parent first
    await a.patch(`/api/categories/${hiking}/archive`).send({ archived: false }).expect(200);
  });

  it("renames without touching transactions, and only deletes unused categories", async () => {
    const a = await signedIn("rename@example.com");
    const c = await cat(a, { name: "Hikng", kind: "expense" });
    const t = (await a.post("/api/transactions").send(tx({ categoryId: c })).expect(201)).body.transaction;
    await a.put(`/api/categories/${c}`).send({ name: "Hiking" }).expect(200);
    expect((await a.get(`/api/transactions/${t.id}`)).body.transaction.categoryId).toBe(c);

    await a.delete(`/api/categories/${c}`).expect(409);
    const unused = await cat(a, { name: "Unused", kind: "income" });
    await a.delete(`/api/categories/${unused}`).expect(204);
  });

  it("never lets one user see or use another's categories", async () => {
    const a = await signedIn("own@example.com");
    const b = await signedIn("other@example.com");
    const c = await cat(a, { name: "Private", kind: "expense" });
    expect((await b.get("/api/categories")).body.categories).toHaveLength(0);
    await b.put(`/api/categories/${c}`).send({ name: "Mine now" }).expect(404);
    await b.delete(`/api/categories/${c}`).expect(404);
    await b.post("/api/transactions").send(tx({ categoryId: c })).expect(400);
  });
});
