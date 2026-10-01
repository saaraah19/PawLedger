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

const creds = { email: "sarah@example.com", password: "a-long-enough-password" };

describe("auth", () => {
  it("registers, keeps the session in a cookie, reads /me, and logs out", async () => {
    const agent = request.agent(app);
    const reg = await agent.post("/api/auth/register").send(creds);
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe(creds.email);
    expect(reg.body.user).not.toHaveProperty("passwordHash");
    expect(String(reg.headers["set-cookie"])).toContain("HttpOnly");

    expect((await agent.get("/api/auth/me")).body.user.currency).toBe("DZD");

    await agent.post("/api/auth/logout").expect(204);
    await agent.get("/api/auth/me").expect(401);
  });

  it("rejects duplicate emails and short passwords", async () => {
    await request(app).post("/api/auth/register").send(creds).expect(409);
    await request(app).post("/api/auth/register").send({ email: "b@example.com", password: "short" }).expect(400);
  });

  it("gives the same message for a wrong password and an unknown email", async () => {
    const wrong = await request(app).post("/api/auth/login").send({ ...creds, password: "wrong-password-here" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "whatever-pass" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it("blocks private routes without a session", async () => {
    await request(app).get("/api/auth/me").expect(401);
  });
});
