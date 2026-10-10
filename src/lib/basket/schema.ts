import { z } from "zod";

/** Reference to the customer's artwork. The artwork itself never leaves the browser in this build. */
export const ArtworkRefSchema = z.object({
  hash: z.string().regex(/^[a-f0-9]{16,64}$/),
  name: z.string().min(1).max(200),
  kind: z.enum(["vector", "raster"]),
  widthPx: z.number().int().positive().max(100_000),
  heightPx: z.number().int().positive().max(100_000),
  hasAlpha: z.boolean(),
});

export const DesignSchema = z.object({
  widthMm: z.number().positive().max(2000),
  offsetYmm: z.number().min(-1000).max(1000),
});

export const ProofSchema = z.object({
  approvedAt: z.string().datetime(),
  version: z.literal(1),
  lowResolutionAcknowledged: z.boolean().optional(),
});

/**
 * One basket line. Unknown keys (including any client-side price fields) are stripped by zod,
 * so the server can never be told what to charge.
 */
export const BasketLineSchema = z.object({
  id: z.string().min(6).max(64),
  productId: z.string().min(1).max(40),
  variantId: z.string().min(1).max(40),
  colourId: z.string().min(1).max(40),
  placementId: z.string().min(1).max(40),
  qty: z.number().int(),
  design: DesignSchema,
  artwork: ArtworkRefSchema,
  proof: ProofSchema,
});

export const BasketRequestSchema = z.object({
  lines: z.array(BasketLineSchema).min(1).max(50),
});

export type ArtworkRef = z.infer<typeof ArtworkRefSchema>;
export type Design = z.infer<typeof DesignSchema>;
export type BasketLine = z.infer<typeof BasketLineSchema>;
export type BasketRequest = z.infer<typeof BasketRequestSchema>;
