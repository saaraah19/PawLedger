import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app"; // the test environment has ALLOW_REGISTRATION=true (see vitest.config.ts). No database needed.

describe("registration switch: open", () => {
  it("tells the sign-in page that accounts can be created, without needing a session", async () => {
    expect((await request(app).get("/api/auth/config").expect(200)).body).toEqual({ registrationOpen: true });
  });
  it("still validates input first", async () => {
    await request(app).post("/api/auth/register").send({ email: "nope", password: "short" }).expect(400);
  });
});
