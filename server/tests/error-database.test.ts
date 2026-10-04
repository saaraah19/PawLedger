import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../src/middleware/error";

// A tiny app that throws whatever it is given, so the real error handler can be checked without a database.
const throwing = (err: Error) => {
  const a = express();
  a.get("/x", () => { throw err; });
  a.use(errorHandler);
  return a;
};
const named = (name: string, message = "boom") => Object.assign(new Error(message), { name });

describe("an unreachable database is reported as such", () => {
  it.each(["MongoServerSelectionError", "MongooseServerSelectionError", "MongoNetworkError", "MongoNetworkTimeoutError", "MongoNotConnectedError", "MongoTopologyClosedError"])(
    "%s becomes a 503 that says what to check", async (name) => {
      const r = await request(throwing(named(name))).get("/x").expect(503);
      expect(r.body.message).toMatch(/database isn't reachable/);
      expect(r.body.message).toMatch(/Network Access/);
      expect(r.body.message).toMatch(/Nothing has been changed/);
    });
  it("treats a buffering timeout the same way", async () => {
    await request(throwing(named("MongooseError", "Operation `users.findOne()` buffering timed out after 10000ms"))).get("/x").expect(503);
  });
  it("never leaks connection details", async () => {
    const r = await request(throwing(named("MongoServerSelectionError", "connect to cluster0-shard-00-00.abc.mongodb.net user:pw"))).get("/x").expect(503);
    expect(JSON.stringify(r.body)).not.toMatch(/shard|mongodb\.net|pw/);
  });
  it("still treats an ordinary bug as a 500", async () => {
    await request(throwing(new Error("some bug"))).get("/x").expect(500);
  });
});
