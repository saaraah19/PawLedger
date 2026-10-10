import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { isWakingError, loadingNote, retryWhileWaking, unavailableMessage } from "./wake";

const asleep = () => new ApiError(0, "Can't reach the server.");

describe("isWakingError", () => {
  it("recognises no answer and gateway statuses, and nothing else", () => {
    for (const s of [0, 502, 503, 504]) expect(isWakingError(new ApiError(s, "x"))).toBe(true);
    for (const s of [400, 401, 404, 500]) expect(isWakingError(new ApiError(s, "x"))).toBe(false);
    expect(isWakingError(new Error("x"))).toBe(false);
  });
});

describe("retryWhileWaking", () => {
  it("returns at once when the server answers", async () => {
    const attempt = vi.fn(async () => "ok");
    await expect(retryWhileWaking(attempt)).resolves.toBe("ok");
    expect(attempt).toHaveBeenCalledTimes(1);
  });
  it("keeps trying while the server is asleep, then returns its answer", async () => {
    let calls = 0;
    const attempt = async () => { if (++calls < 4) throw asleep(); return "awake"; };
    const sleep = vi.fn(async () => {});
    await expect(retryWhileWaking(attempt, { sleep })).resolves.toBe("awake");
    expect(calls).toBe(4);
    expect(sleep).toHaveBeenCalledTimes(3);
  });
  it("does not retry a real answer such as 'not signed in'", async () => {
    const attempt = vi.fn(async () => { throw new ApiError(401, "no"); });
    await expect(retryWhileWaking(attempt, { sleep: async () => {} })).rejects.toMatchObject({ status: 401 });
    expect(attempt).toHaveBeenCalledTimes(1);
  });
  it("gives up once the time is spent, with the last error", async () => {
    let t = 0;
    const attempt = vi.fn(async () => { t += 45_000; throw asleep(); });
    await expect(retryWhileWaking(attempt, { giveUpMs: 150_000, pauseMs: 2000, now: () => t, sleep: async () => {} })).rejects.toMatchObject({ status: 0 });
    expect(attempt).toHaveBeenCalledTimes(4); // 45, 90, 135 s and then the next pause would pass 150 s
  });
  it("stops when the page that asked has gone", async () => {
    const attempt = vi.fn(async () => { throw asleep(); });
    await expect(retryWhileWaking(attempt, { cancelled: () => true, sleep: async () => {} })).rejects.toMatchObject({ status: 0 });
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});

describe("loadingNote", () => {
  it("says nothing during a normal, quick load", () => {
    expect(loadingNote(0, true)).toBeNull();
    expect(loadingNote(5, true)).toBeNull();
  });
  it("explains the wait on a hosted server, and that the records are safe", () => {
    const n = loadingNote(10, true)!;
    expect(n.title).toBe("The server is waking up.");
    expect(n.detail).toMatch(/under a minute/);
    expect(n.detail).toMatch(/records are safe/);
    expect(n.detail).toMatch(/open by itself/);
  });
  it("admits when it is taking longer than usual", () => {
    expect(loadingNote(75, true)!.title).toBe("Still waking up.");
  });
  it("keeps the terminal advice for a local server", () => {
    expect(loadingNote(10, false)!.detail).toMatch(/terminal/);
  });
  it("never alarms or blames", () => {
    for (const s of [10, 90]) {
      const n = loadingNote(s, true)!;
      expect(`${n.title} ${n.detail}`).not.toMatch(/error|failed|problem|broken|sorry/i);
    }
  });
});

describe("unavailableMessage", () => {
  it("points a hosted app at Render's logs after a failed wake-up", () => {
    expect(unavailableMessage(asleep(), true)).toMatch(/didn't wake up in time.*Logs/);
  });
  it("keeps the original message locally, and for non-waking errors", () => {
    expect(unavailableMessage(asleep(), false)).toBe("Can't reach the server.");
    expect(unavailableMessage(new ApiError(500, "Boom"), true)).toBe("Boom");
    expect(unavailableMessage(new Error("x"), true)).toBe("The server isn't answering.");
  });
});
