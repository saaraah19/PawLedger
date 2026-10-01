import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, setUnauthorizedHandler } from "./api";

const reply = (status: number, body?: unknown) => vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); setUnauthorizedHandler(null); });

describe("api: when the server can't be reached", () => {
  it("gives up after 20 seconds with a message that says what to check", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) => new Promise((_ok, fail) => {
      init.signal!.addEventListener("abort", () => fail(Object.assign(new Error("aborted"), { name: "AbortError" })));
    }));
    const result = expect(api("/x")).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/taking too long.*npm run doctor/) });
    await vi.advanceTimersByTimeAsync(20_001);
    await result;
  });
  it("explains a refused connection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(api("/x")).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/Can't reach the server.*terminal/) });
  });
  it("keeps the server's own message when it sends one, such as the database being down", async () => {
    vi.stubGlobal("fetch", reply(503, { message: "The database isn't reachable right now." }));
    await expect(api("/x")).rejects.toMatchObject({ status: 503, message: "The database isn't reachable right now." });
  });
  it("explains an empty 5xx, which is what the dev proxy sends when the server is down", async () => {
    vi.stubGlobal("fetch", reply(500));
    await expect(api("/x")).rejects.toMatchObject({ status: 500, message: expect.stringMatching(/isn't answering properly/) });
  });
  it("uses a calm fallback for other failures", async () => {
    vi.stubGlobal("fetch", reply(404));
    await expect(api("/x")).rejects.toMatchObject({ message: expect.stringMatching(/Your data has not been changed/) });
  });
});

describe("api: sessions", () => {
  it("tells the app when a signed-in request is refused as unauthorised", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", reply(401, { message: "Please sign in to continue." }));
    await expect(api("/transactions")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it("does not, for sign-in itself or for the who-am-I check", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", reply(401, { message: "Email or password is incorrect." }));
    await expect(api("/auth/login", { method: "POST", body: {} })).rejects.toBeInstanceOf(ApiError);
    await expect(api("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
  it("returns an empty object for 204", async () => {
    vi.stubGlobal("fetch", reply(204));
    expect(await api("/auth/logout", { method: "POST" })).toEqual({});
  });
});
