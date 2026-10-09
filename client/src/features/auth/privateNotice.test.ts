import { describe, expect, it } from "vitest";
import { privateNotice } from "./privateNotice";

describe("privateNotice", () => {
  for (const state of [true, false, null] as const) {
    it(`says it is private and not public (registration: ${state})`, () => {
      const n = privateNotice(state);
      const text = `${n.lead} ${n.body}`;
      expect(text).toMatch(/private/i);
      expect(text).toContain("one person's personal ledger");
      expect(text).toContain("isn't a public service");
    });
  }
  it("reassures a stranger when registration is closed", () => {
    const n = privateNotice(false);
    expect(n.body).toContain("New accounts can't be created here");
    expect(n.body).toContain("you can simply close this page");
  });
  it("does not tell the owner to leave while setting up, or before the server has answered", () => {
    expect(privateNotice(true).body).not.toMatch(/close this page/);
    expect(privateNotice(null).body).not.toMatch(/close this page/);
  });
  it("never uses hostile or accusing wording", () => {
    for (const state of [true, false, null] as const) {
      const n = privateNotice(state);
      expect(`${n.lead} ${n.body}`).not.toMatch(/unauthori[sz]ed|intruder|trespass|warning|restricted|prohibited|forbidden|violat/i);
    }
  });
});
