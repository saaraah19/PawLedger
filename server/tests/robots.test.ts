import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app"; // No database needed for these routes.

describe("keeping a private app out of search engines", () => {
  it("sends X-Robots-Tag on API answers, unknown routes and protected routes alike", async () => {
    for (const [url, status] of [["/api/health", 200], ["/", 404], ["/api/nope", 404], ["/api/transactions", 401]] as const) {
      const r = await request(app).get(url).expect(status);
      expect(r.headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
    }
  });
});
