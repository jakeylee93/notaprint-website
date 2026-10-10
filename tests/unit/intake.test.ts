import { describe, expect, it } from "vitest";
import { checkIntake, jpegDimensions, LIMITS, pngDimensions, sniffType } from "@/lib/artwork/intake";
import { effectiveDpi, rateDpi } from "@/lib/artwork/dpi";
import { defaultWidthFor, fitLogo, maxWidthFor } from "@/lib/artwork/fit";
import { jpegHeader, pngHeader } from "./helpers";

const enc = (s: string) => new TextEncoder().encode(s);

describe("type sniffing ignores names and MIME types", () => {
  it("detects PNG, JPEG and SVG by content", () => {
    expect(sniffType(pngHeader(800, 600))).toBe("png");
    expect(sniffType(jpegHeader(800, 600))).toBe("jpeg");
    expect(sniffType(enc('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe("svg");
    expect(sniffType(enc("﻿  <svg viewBox='0 0 1 1'></svg>"))).toBe("svg");
  });
  it("rejects other formats and disguised files", () => {
    expect(sniffType(enc("GIF89a....."))).toBeNull();
    expect(sniffType(enc("%PDF-1.7 ..."))).toBeNull();
    expect(sniffType(enc("<html><body><svg></svg></body></html>"))).toBeNull();
    expect(sniffType(enc("just text pretending to be a .png"))).toBeNull();
    expect(checkIntake(enc("RIFF....WEBPVP8 ")).ok).toBe(false);
  });
});

describe("header dimensions and limits", () => {
  it("reads PNG and JPEG dimensions without decoding", () => {
    expect(pngDimensions(pngHeader(1234, 567))).toEqual({ width: 1234, height: 567 });
    expect(jpegDimensions(jpegHeader(3000, 2000))).toEqual({ width: 3000, height: 2000 });
  });
  it("enforces byte, pixel and minimum-size limits", () => {
    const big = pngHeader(1000, 1000, LIMITS.bytes.png + 1);
    expect(checkIntake(big)).toMatchObject({ ok: false, code: "too_large" });
    expect(checkIntake(pngHeader(10000, 9000))).toMatchObject({ ok: false, code: "too_many_pixels" });
    expect(checkIntake(pngHeader(30, 30))).toMatchObject({ ok: false, code: "too_small" });
    expect(checkIntake(new Uint8Array())).toMatchObject({ ok: false, code: "empty" });
    expect(checkIntake(pngHeader(2000, 1000))).toEqual({ ok: true, type: "png", width: 2000, height: 1000 });
  });
});

describe("print-size maths", () => {
  it("computes effective DPI and ratings", () => {
    expect(effectiveDpi(2362, 200)).toBeCloseTo(300, 0);
    expect(rateDpi(300, false)).toBe("sharp");
    expect(rateDpi(160, false)).toBe("good");
    expect(rateDpi(120, false)).toBe("low");
    expect(rateDpi(90, false)).toBe("too-low");
    expect(rateDpi(10, true)).toBe("vector");
  });
  it("keeps the logo inside its slot at its own aspect ratio", () => {
    const slot = { cx: 50, cy: 40, maxW: 65, maxH: 74 };
    expect(maxWidthFor(slot, 2)).toBe(65); // width-limited
    expect(maxWidthFor(slot, 0.5)).toBe(37); // height-limited (74 × 0.5)
    const fitted = fitLogo(slot, 2, 500, 999);
    expect(fitted.widthMm).toBe(65);
    expect(fitted.heightMm).toBe(32.5);
    expect(fitted.offsetYmm).toBeCloseTo((74 - 32.5) / 2, 2);
    expect(fitted.clamped).toBe(true);
    expect(defaultWidthFor(slot, 2)).toBe(52);
  });
});
