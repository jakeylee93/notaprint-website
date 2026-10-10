import type { BasketLine } from "@/lib/basket/schema";

export function mugLine(overrides: Partial<BasketLine> = {}): BasketLine {
  return {
    id: "line-test-0001",
    productId: "mug",
    variantId: "11oz",
    colourId: "white",
    placementId: "front",
    qty: 2,
    design: { widthMm: 50, offsetYmm: 0 },
    artwork: { hash: "a1b2c3d4e5f60718293a4b5c6d7e8f90", name: "logo.svg", kind: "vector", widthPx: 400, heightPx: 200, hasAlpha: true },
    proof: { approvedAt: "2026-10-10T12:00:00.000Z", version: 1 },
    ...overrides,
  };
}

/** Minimal PNG header (signature + IHDR) with the given dimensions. */
export function pngHeader(width: number, height: number, totalBytes = 64): Uint8Array {
  const b = new Uint8Array(totalBytes);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.set([0, 0, 0, 13], 8);
  b.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
  const v = new DataView(b.buffer);
  v.setUint32(16, width);
  v.setUint32(20, height);
  return b;
}

/** Minimal JPEG with SOI, an APP0 segment and a SOF0 frame header. */
export function jpegHeader(width: number, height: number): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, (height >> 8) & 0xff, height & 0xff, (width >> 8) & 0xff, width & 0xff, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9]);
}
