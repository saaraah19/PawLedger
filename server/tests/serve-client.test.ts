import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let app: import("express").Express;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pawledger-dist-"));

beforeAll(async () => {
  fs.mkdirSync(path.join(dir, "assets"));
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>PawLedger</title><div id=root></div>");
  fs.writeFileSync(path.join(dir, "robots.txt"), "User-agent: *\nDisallow: /\n");
  fs.writeFileSync(path.join(dir, "assets", "app-abc123.js"), "console.log('hi')");
  vi.stubEnv("SERVE_CLIENT", "true");
  vi.stubEnv("CLIENT_DIST", dir);
  app = (await import("../src/app")).app; // imported after the env is set: the mode is read once at startup
});
afterAll(() => {
  vi.unstubAllEnvs();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("single-service mode", () => {
  it("serves the app at / and for client-side routes, without caching the page", async () => {
    for (const url of ["/", "/history", "/welcome"]) {
      const r = await request(app).get(url).expect(200);
      expect(r.text).toContain("PawLedger");
      expect(r.headers["cache-control"]).toBe("no-cache");
    }
  });
  it("caches fingerprinted assets for a year", async () => {
    const r = await request(app).get("/assets/app-abc123.js").expect(200);
    expect(r.headers["cache-control"]).toContain("immutable");
  });
  it("keeps the API separate: JSON for API routes, including unknown ones", async () => {
    expect((await request(app).get("/api/health").expect(200)).body).toEqual({ ok: true });
    const r = await request(app).get("/api/nope").expect(404);
    expect(r.body.message).toMatch(/doesn't exist/);
    await request(app).get("/api/transactions").expect(401); // still protected
  });
  it("answers HEAD requests for the app too, as uptime monitors send them", async () => {
    const r = await request(app).head("/history").expect(200);
    expect(r.headers["cache-control"]).toBe("no-cache");
  });
  it("does not turn other methods into the app", async () => {
    await request(app).post("/anything").expect(404);
  });
  it("sends a Content-Security-Policy without upgrade-insecure-requests outside production", async () => {
    const csp = String((await request(app).get("/")).headers["content-security-policy"]);
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
  it("asks crawlers to stay out: robots.txt, and a noindex header on every kind of response", async () => {
    const r = await request(app).get("/robots.txt").expect(200);
    expect(r.headers["content-type"]).toMatch(/text\/plain/);
    expect(r.text).toContain("Disallow: /");
    for (const url of ["/robots.txt", "/", "/history", "/api/health"]) {
      expect((await request(app).get(url)).headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
    }
  });
});
