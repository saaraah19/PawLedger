import { describe, expect, it } from "vitest";

// The theme colours from styles/index.css. If the palette changes, this test says whether text is still readable.
const c = { paper: "#eceFe6", ink: "#1e2b26", moss: "#4a6440", stone: "#5a635b", white: "#ffffff" };

const lum = (hex: string) => {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("colour contrast (WCAG AA needs 4.5:1 for normal text)", () => {
  it.each([
    ["ink text on paper", c.ink, c.paper],
    ["muted text on paper", c.stone, c.paper],
    ["moss links on paper", c.moss, c.paper],
    ["white text on moss buttons", c.white, c.moss],
    ["paper text on ink buttons", c.paper, c.ink],
  ])("%s", (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
