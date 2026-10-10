/**
 * File intake checks that run before any decoding: type by magic bytes (never by extension or
 * the browser-reported MIME type), byte limits and pixel limits read from the file header.
 */

export type ArtworkType = "png" | "jpeg" | "svg";

export const LIMITS = {
  bytes: { png: 25 * 1024 * 1024, jpeg: 15 * 1024 * 1024, svg: 2 * 1024 * 1024 } as Record<ArtworkType, number>,
  maxPixels: 40_000_000,
  maxSide: 12_000,
  minSide: 48,
};

export const ACCEPT_ATTRIBUTE = ".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml";

export type IntakeResult =
  | { ok: true; type: ArtworkType; width?: number; height?: number }
  | { ok: false; code: "unsupported_type" | "too_large" | "too_many_pixels" | "too_small" | "empty" | "corrupt"; message: string };

const MB = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;

export function sniffType(bytes: Uint8Array): ArtworkType | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  // SVG is text: look for an <svg root near the start, allowing a BOM, XML declaration and comments.
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 4096)));
  const trimmed = head.replace(/^﻿/, "").trimStart();
  if ((trimmed.startsWith("<?xml") || trimmed.startsWith("<svg") || trimmed.startsWith("<!--") || trimmed.startsWith("<!DOCTYPE svg")) && /<svg[\s>]/i.test(head)) {
    return "svg";
  }
  return null;
}

export function pngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  // IHDR chunk must be first: bytes 12..15 === "IHDR"
  if (String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break;
    const length = view.getUint16(i + 2);
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
    i += 2 + length;
  }
  return null;
}

export function checkIntake(bytes: Uint8Array): IntakeResult {
  if (bytes.length === 0) return { ok: false, code: "empty", message: "That file is empty." };
  const type = sniffType(bytes);
  if (!type) {
    return { ok: false, code: "unsupported_type", message: "Please upload a PNG, JPEG or SVG file." };
  }
  if (bytes.length > LIMITS.bytes[type]) {
    return { ok: false, code: "too_large", message: `That ${type.toUpperCase()} is over the ${MB(LIMITS.bytes[type])} limit.` };
  }
  if (type === "svg") return { ok: true, type };
  const dims = type === "png" ? pngDimensions(bytes) : jpegDimensions(bytes);
  if (!dims || dims.width === 0 || dims.height === 0) {
    return { ok: false, code: "corrupt", message: "We couldn't read that image. Is the file complete?" };
  }
  if (dims.width * dims.height > LIMITS.maxPixels || Math.max(dims.width, dims.height) > LIMITS.maxSide) {
    return { ok: false, code: "too_many_pixels", message: "That image has too many pixels. Please keep it under 40 megapixels." };
  }
  if (Math.min(dims.width, dims.height) < LIMITS.minSide) {
    return { ok: false, code: "too_small", message: `That image is too small to print. It needs to be at least ${LIMITS.minSide} pixels on each side.` };
  }
  return { ok: true, type, width: dims.width, height: dims.height };
}
