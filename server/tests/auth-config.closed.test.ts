import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let app: import("express").Express;
beforeAll(async () => {
  vi.stubEnv("ALLOW_REGISTRATION", "false"); // read once at startup, so set before the app is imported
  app = (await import("../src/app")).app;
});
afterAll(() => vi.unstubAllEnvs());

describe("registration switch: closed", () => {
  it("tells the sign-in page that accounts cannot be created", async () => {
    expect((await request(app).get("/api/auth/config").expect(200)).body).toEqual({ registrationOpen: false });
  });
  it("refuses registration, even for a perfectly valid request", async () => {
    const r = await request(app).post("/api/auth/register").send({ email: "new@example.com", password: "a-long-enough-password" }).expect(403);
    expect(r.body.message).toMatch(/closed/i);
  });
});
