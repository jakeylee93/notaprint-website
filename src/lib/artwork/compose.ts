import type { Placement, PrintArea } from "../catalog/types";
import { fitLogo } from "./fit";

export interface ComposeInput {
  area: PrintArea;
  placement: Placement;
  /** Trimmed artwork bitmap (transparent margins removed). */
  image: CanvasImageSource;
  aspect: number;
  widthMm: number;
  offsetYmm: number;
  /** Pixels per millimetre for the composed canvas (capped to keep within GPU/canvas limits). */
  pxPerMm?: number;
  maxSidePx?: number;
}

export interface ComposedPrint {
  canvas: HTMLCanvasElement;
  pxPerMm: number;
  /** Where each logo landed, in millimetres within the print area. */
  boxes: { x: number; y: number; w: number; h: number }[];
}

/**
 * Compose the print area: a transparent canvas the exact aspect of the physical print rectangle,
 * with the logo drawn at its real size in millimetres. The same canvas feeds the 3D surface, the
 * grid thumbnails and the proof, so all three show identical pixels.
 * This is a web preview at screen resolution, not a print master.
 */
export function composePrintArea(input: ComposeInput, target?: HTMLCanvasElement): ComposedPrint {
  const { area, placement, image, aspect } = input;
  const maxSide = input.maxSidePx ?? 2048;
  let ppm = input.pxPerMm ?? 9;
  ppm = Math.min(ppm, maxSide / Math.max(area.widthMm, area.heightMm));
  const W = Math.round(area.widthMm * ppm);
  const H = Math.round(area.heightMm * ppm);
  const canvas = target ?? document.createElement("canvas");
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const boxes: ComposedPrint["boxes"] = [];
  for (const slot of placement.slots) {
    const fitted = fitLogo(slot, aspect, input.widthMm, input.offsetYmm);
    const x = slot.cx - fitted.widthMm / 2;
    const y = slot.cy + fitted.offsetYmm - fitted.heightMm / 2;
    ctx.drawImage(image, x * ppm, y * ppm, fitted.widthMm * ppm, fitted.heightMm * ppm);
    boxes.push({ x, y, w: fitted.widthMm, h: fitted.heightMm });
  }
  return { canvas, pxPerMm: ppm, boxes };
}
