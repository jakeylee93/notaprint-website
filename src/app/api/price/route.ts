import { NextResponse } from "next/server";
import { z } from "zod";
import { BasketLineSchema } from "@/lib/basket/schema";
import { priceBasket } from "@/lib/pricing/basket";

export const dynamic = "force-dynamic";

const PriceRequestSchema = z.object({
  lines: z.array(BasketLineSchema).max(50),
  context: z.enum(["display", "checkout"]).default("display"),
});

/** Server-side pricing. Client-supplied prices are never read: zod strips unknown keys. */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = PriceRequestSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_basket" }, { status: 400 });
  return NextResponse.json(priceBasket(parsed.data.lines, parsed.data.context), { headers: { "cache-control": "no-store" } });
}
