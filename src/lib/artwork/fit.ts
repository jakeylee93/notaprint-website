import type { Slot } from "../catalog/types";

/** Largest logo width (mm) that keeps the whole logo inside the slot at this aspect ratio. */
export function maxWidthFor(slot: Slot, aspect: number): number {
  if (!(aspect > 0)) return 0;
  return Math.min(slot.maxW, slot.maxH * aspect);
}

export function defaultWidthFor(slot: Slot, aspect: number): number {
  return round2(maxWidthFor(slot, aspect) * 0.8);
}

export interface Fitted {
  widthMm: number;
  heightMm: number;
  offsetYmm: number;
  clamped: boolean;
}

/** Clamp a requested size and vertical offset so the logo never leaves the printable slot. */
export function fitLogo(slot: Slot, aspect: number, requestedWidthMm: number, requestedOffsetYmm = 0): Fitted {
  const maxW = maxWidthFor(slot, aspect);
  const minW = Math.min(5, maxW);
  const widthMm = round2(clamp(requestedWidthMm, minW, maxW));
  const heightMm = round2(widthMm / aspect);
  const maxOffset = Math.max(0, (slot.maxH - heightMm) / 2);
  const offsetYmm = round2(clamp(requestedOffsetYmm, -maxOffset, maxOffset));
  const clamped = Math.abs(widthMm - requestedWidthMm) > 0.01 || Math.abs(offsetYmm - requestedOffsetYmm) > 0.01;
  return { widthMm, heightMm, offsetYmm, clamped };
}

export function maxOffsetFor(slot: Slot, heightMm: number): number {
  return Math.max(0, (slot.maxH - heightMm) / 2);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
