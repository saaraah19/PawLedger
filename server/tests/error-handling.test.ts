import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app"; // no database needed: these fail before any query

describe("a caller's mistakes are not reported as server faults", () => {
  it("answers unreadable JSON with 400", async () => {
    const r = await request(app).post("/api/auth/login").set("content-type", "application/json").send('{"email": broken').expect(400);
    expect(r.body.message).toMatch(/couldn't be read/);
    expect(r.body.message).not.toMatch(/our side/);
  });
  it("answers an oversized body with 413", async () => {
    const big = JSON.stringify({ email: "a@b.co", password: "x".repeat(200_000) });
    const r = await request(app).post("/api/auth/login").set("content-type", "application/json").send(big).expect(413);
    expect(r.body.message).toMatch(/too large/);
  });
  it("still answers validation problems with 400, and unknown routes with 404", async () => {
    await request(app).post("/api/auth/login").send({ email: "nope" }).expect(400);
    await request(app).get("/api/nope").expect(404);
  });
});
