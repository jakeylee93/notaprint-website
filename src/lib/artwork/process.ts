import DOMPurify from "dompurify";
import { checkIntake, type ArtworkType } from "./intake";
import { sanitizeSvg, RASTER_LONG_SIDE } from "./sanitize-svg";
import { PLACEHOLDER_ID, PLACEHOLDER_SVG } from "./placeholder";

export interface ProcessedArtwork {
  id: string;
  name: string;
  kind: "vector" | "raster";
  type: ArtworkType;
  /** Pixel size of the trimmed artwork. For raster files these are real source pixels (used for DPI). */
  widthPx: number;
  heightPx: number;
  hasAlpha: boolean;
  warnings: string[];
  /** Trimmed preview (PNG with alpha, max 2048 px). Web preview only — never the print master. */
  previewBlob: Blob;
  /** The original raster file or the sanitised SVG. Kept on this device; never uploaded in this build. */
  sourceBlob: Blob;
  createdAt: string;
}

export type ProcessResult = { ok: true; artwork: ProcessedArtwork } | { ok: false; message: string };

const MAX_PREVIEW = 2048;
const ANALYSIS = 1024;

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/png"));
}

/** Find the bounding box of visible pixels (alpha > 8) on a downscaled copy, mapped back to full size. */
function analyse(source: CanvasImageSource, w: number, h: number): { hasAlpha: boolean; box: { x: number; y: number; w: number; h: number } } {
  const scale = Math.min(1, ANALYSIS / Math.max(w, h));
  const aw = Math.max(1, Math.round(w * scale));
  const ah = Math.max(1, Math.round(h * scale));
  const c = canvas(aw, ah);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, aw, ah);
  const data = ctx.getImageData(0, 0, aw, ah).data;
  let minX = aw,
    minY = ah,
    maxX = -1,
    maxY = -1,
    translucent = false;
  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      const a = data[(y * aw + x) * 4 + 3];
      if (a < 250) translucent = true;
      if (a > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { hasAlpha: true, box: { x: 0, y: 0, w: 0, h: 0 } };
  const pad = 1;
  const x0 = Math.max(0, Math.floor((minX - pad) / scale));
  const y0 = Math.max(0, Math.floor((minY - pad) / scale));
  const x1 = Math.min(w, Math.ceil((maxX + 1 + pad) / scale));
  const y1 = Math.min(h, Math.ceil((maxY + 1 + pad) / scale));
  return { hasAlpha: translucent, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}

function cropToPreview(source: CanvasImageSource, box: { x: number; y: number; w: number; h: number }): HTMLCanvasElement {
  const scale = Math.min(1, MAX_PREVIEW / Math.max(box.w, box.h));
  const c = canvas(box.w * scale, box.h * scale);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
  return c;
}

function loadSvgImage(svgText: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg render failed"));
    };
    img.src = url;
  });
}

async function rasteriseSvg(rasterSvg: string, width: number, height: number): Promise<HTMLCanvasElement> {
  const img = await loadSvgImage(rasterSvg);
  const scale = RASTER_LONG_SIDE / Math.max(width, height);
  const c = canvas(width * scale, height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export async function processArtworkFile(file: File): Promise<ProcessResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const intake = checkIntake(bytes);
  if (!intake.ok) return { ok: false, message: intake.message };
  const id = (await sha256Hex(bytes)).slice(0, 32);
  const name = file.name.replace(/[^\w.\- ()]+/g, "_").slice(0, 120) || "logo";
  const warnings: string[] = [];

  if (intake.type === "svg") {
    const text = new TextDecoder("utf-8").decode(bytes);
    const result = sanitizeSvg(text, { purify: DOMPurify, parser: new DOMParser(), serializer: new XMLSerializer() });
    if (!result.ok) return { ok: false, message: result.message };
    warnings.push(...result.warnings);
    let raster: HTMLCanvasElement;
    try {
      raster = await rasteriseSvg(result.rasterSvg, result.width, result.height);
    } catch {
      return { ok: false, message: "We couldn't draw that SVG. Please export it again, or upload a PNG." };
    }
    const { box } = analyse(raster, raster.width, raster.height);
    if (box.w < 2 || box.h < 2) return { ok: false, message: "That SVG looks empty." };
    const preview = cropToPreview(raster, box);
    return {
      ok: true,
      artwork: {
        id,
        name,
        kind: "vector",
        type: "svg",
        widthPx: box.w,
        heightPx: box.h,
        hasAlpha: true,
        warnings,
        previewBlob: await toBlob(preview),
        sourceBlob: new Blob([result.svg], { type: "image/svg+xml" }),
        createdAt: new Date().toISOString(),
      },
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: intake.type === "png" ? "image/png" : "image/jpeg" }), { imageOrientation: "from-image" });
  } catch {
    return { ok: false, message: "We couldn't read that image. Is the file complete?" };
  }
  const { hasAlpha, box } = analyse(bitmap, bitmap.width, bitmap.height);
  if (box.w < 2 || box.h < 2) {
    bitmap.close();
    return { ok: false, message: "That image looks completely transparent." };
  }
  if (intake.type === "jpeg") {
    warnings.push("JPEG has no transparency, so its background will print as a solid box. A PNG or SVG with a transparent background usually looks better.");
  } else if (!hasAlpha) {
    warnings.push("This PNG has no transparent background, so the background will print as a solid box.");
  }
  const preview = cropToPreview(bitmap, box);
  bitmap.close();
  return {
    ok: true,
    artwork: {
      id,
      name,
      kind: "raster",
      type: intake.type,
      widthPx: box.w,
      heightPx: box.h,
      hasAlpha,
      warnings,
      previewBlob: await toBlob(preview),
      sourceBlob: new Blob([bytes], { type: intake.type === "png" ? "image/png" : "image/jpeg" }),
      createdAt: new Date().toISOString(),
    },
  };
}

export async function buildPlaceholderArtwork(): Promise<ProcessedArtwork> {
  const raster = await rasteriseSvg(PLACEHOLDER_SVG, 680, 240);
  const { box } = analyse(raster, raster.width, raster.height);
  const preview = cropToPreview(raster, box.w > 2 ? box : { x: 0, y: 0, w: raster.width, h: raster.height });
  return {
    id: PLACEHOLDER_ID,
    name: "Your logo here (placeholder)",
    kind: "vector",
    type: "svg",
    widthPx: preview.width,
    heightPx: preview.height,
    hasAlpha: true,
    warnings: [],
    previewBlob: await toBlob(preview),
    sourceBlob: new Blob([PLACEHOLDER_SVG], { type: "image/svg+xml" }),
    createdAt: new Date(0).toISOString(),
  };
}
