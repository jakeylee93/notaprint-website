import type { Placement, PrintArea } from "../catalog/types";
import { composePrintArea } from "./compose";

export interface ProofInput {
  area: PrintArea;
  placement: Placement;
  image: CanvasImageSource;
  aspect: number;
  widthMm: number;
  offsetYmm: number;
  /** Background colour of the product (so contrast is judged on the real colour). */
  productHex: string;
}

/**
 * Draws the flat proof: the print area at true aspect on paper, the zone outside the safe margin
 * shaded, the logo with its real dimensions, and millimetre rulers. This is a web proof for
 * approval, not a production print file.
 */
export function drawProof(canvas: HTMLCanvasElement, input: ProofInput, widthPx = 1200): { boxes: { x: number; y: number; w: number; h: number }[] } {
  const { area } = input;
  const ruler = Math.round(widthPx * 0.06);
  const pad = Math.round(widthPx * 0.02);
  const scale = (widthPx - ruler - pad * 2) / area.widthMm;
  const areaW = area.widthMm * scale;
  const areaH = area.heightMm * scale;
  const heightPx = Math.round(areaH + ruler + pad * 2 + ruler * 0.9);
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d")!;
  const ox = ruler + pad;
  const oy = ruler + pad;

  ctx.fillStyle = "#f5f4f0";
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Print area in the product colour, with the unsafe margin gently shaded.
  ctx.fillStyle = input.productHex;
  ctx.fillRect(ox, oy, areaW, areaH);
  const s = area.safeMm * scale;
  ctx.fillStyle = "rgba(17,17,17,0.07)";
  ctx.fillRect(ox, oy, areaW, s);
  ctx.fillRect(ox, oy + areaH - s, areaW, s);
  ctx.fillRect(ox, oy + s, s, areaH - 2 * s);
  ctx.fillRect(ox + areaW - s, oy + s, s, areaH - 2 * s);

  // The artwork itself, composed exactly as on the product.
  const composed = composePrintArea({
    area,
    placement: input.placement,
    image: input.image,
    aspect: input.aspect,
    widthMm: input.widthMm,
    offsetYmm: input.offsetYmm,
    pxPerMm: scale,
    maxSidePx: 8192,
  });
  ctx.drawImage(composed.canvas, ox, oy, areaW, areaH);

  // Logo extents and dimensions.
  ctx.font = `${Math.round(widthPx * 0.021)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  for (const b of composed.boxes) {
    const x = ox + b.x * scale;
    const y = oy + b.y * scale;
    ctx.strokeStyle = "rgba(0,114,181,0.85)";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = Math.max(1, widthPx / 900);
    ctx.strokeRect(x, y, b.w * scale, b.h * scale);
    ctx.setLineDash([]);
    const label = `${b.w.toFixed(1)} × ${b.h.toFixed(1)} mm`;
    const tw = ctx.measureText(label).width + 12;
    const ly = Math.min(y + b.h * scale + 6, oy + areaH - Math.round(widthPx * 0.021) - 12);
    ctx.fillStyle = "rgba(0,114,181,0.92)";
    ctx.fillRect(x, ly, tw, Math.round(widthPx * 0.021) + 10);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + 6, ly + 5);
  }

  // Rulers: a tick every 5 mm, labelled every 10 or 50 mm depending on scale.
  ctx.fillStyle = "#55565b";
  ctx.strokeStyle = "#8a8b90";
  ctx.lineWidth = 1;
  const labelEvery = area.widthMm > 120 ? 50 : 10;
  ctx.font = `${Math.round(widthPx * 0.019)}px ui-sans-serif, system-ui, sans-serif`;
  for (let mm = 0; mm <= area.widthMm + 0.01; mm += 5) {
    const x = ox + mm * scale;
    const long = mm % labelEvery === 0;
    ctx.beginPath();
    ctx.moveTo(x, oy - pad * 0.5);
    ctx.lineTo(x, oy - pad * 0.5 - (long ? ruler * 0.42 : ruler * 0.2));
    ctx.stroke();
    if (long) ctx.fillText(String(mm), x + 3, pad * 0.4);
  }
  for (let mm = 0; mm <= area.heightMm + 0.01; mm += 5) {
    const y = oy + mm * scale;
    const long = mm % labelEvery === 0 || (labelEvery === 50 && mm % 10 === 0);
    ctx.beginPath();
    ctx.moveTo(ox - pad * 0.5, y);
    ctx.lineTo(ox - pad * 0.5 - (long ? ruler * 0.42 : ruler * 0.2), y);
    ctx.stroke();
    if (long && mm > 0) ctx.fillText(String(mm), pad * 0.3, y + 2);
  }
  ctx.fillText("mm", pad * 0.3, pad * 0.4);

  ctx.fillStyle = "#55565b";
  ctx.fillText(`Print area ${area.widthMm} × ${area.heightMm} mm${area.provisional ? " (provisional)" : ""} · shaded edge = keep-clear margin`, ox, oy + areaH + ruler * 0.25);
  return { boxes: composed.boxes };
}
