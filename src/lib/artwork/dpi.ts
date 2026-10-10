export type DpiRating = "vector" | "sharp" | "good" | "low" | "too-low";

export function effectiveDpi(sourcePx: number, printedMm: number): number {
  if (printedMm <= 0) return Infinity;
  return sourcePx / (printedMm / 25.4);
}

/**
 * Thresholds follow common supplier guidance (Printful: 300 DPI for paper, 150 DPI for other
 * products; avoid under 150). Below 100 DPI we block, because the print would visibly blur.
 */
export function rateDpi(dpi: number, isVector: boolean): DpiRating {
  if (isVector) return "vector";
  if (dpi >= 300) return "sharp";
  if (dpi >= 150) return "good";
  if (dpi >= 100) return "low";
  return "too-low";
}

export const DPI_MESSAGES: Record<DpiRating, string> = {
  vector: "Vector artwork. Prints sharp at any size.",
  sharp: "Sharp at this size.",
  good: "Good at this size.",
  low: "Low resolution at this size. It may look soft when printed.",
  "too-low": "Too low resolution to print at this size. Make it smaller or upload a larger file.",
};
