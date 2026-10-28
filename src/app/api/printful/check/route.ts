import "server-only";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Preview-only, read-only access check for the Printful API.
 * - Runs only on Vercel preview deployments (which sit behind Vercel Authentication); 404 everywhere else.
 * - Every Printful call is a GET. The token is read server-side and never echoed.
 * - Store-private endpoints report only their HTTP status; catalogue print-area geometry is returned in summary.
 */
const BASE = "https://api.printful.com";
const PRODUCTS = [380, 19];

type Json = Record<string, unknown>;

async function get(path: string, token: string): Promise<{ status: number; body: Json | null }> {
  try {
    const res = await fetch(BASE + path, { method: "GET", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    let body: Json | null = null;
    try {
      body = (await res.json()) as Json;
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

function reason(body: Json | null): string | undefined {
  const err = (body?.error ?? body?.result) as unknown;
  const msg = typeof err === "string" ? err : typeof (err as Json)?.message === "string" ? ((err as Json).message as string) : undefined;
  return msg?.replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]").slice(0, 140);
}

function summarisePrintfiles(body: Json | null) {
  const r = body?.result as Json | undefined;
  if (!r) return undefined;
  const files = new Map(((r.printfiles as Json[]) ?? []).map((f) => [f.printfile_id, f]));
  const first = ((r.variant_printfiles as Json[]) ?? [])[0];
  const placements = (first?.placements ?? {}) as Record<string, number>;
  return {
    availablePlacements: r.available_placements,
    sampleVariantId: first?.variant_id,
    printfiles: Object.fromEntries(
      Object.entries(placements).map(([pl, id]) => {
        const f = files.get(id) as Json | undefined;
        return [pl, f ? `${f.width}×${f.height}px @ ${f.dpi}dpi` : "?"];
      }),
    ),
  };
}

function summariseTemplates(body: Json | null) {
  const r = body?.result as Json | undefined;
  if (!r) return undefined;
  const templates = new Map(((r.templates as Json[]) ?? []).map((t) => [t.template_id, t]));
  const first = ((r.variant_mapping as Json[]) ?? [])[0];
  return {
    templateCount: templates.size,
    sampleVariantId: first?.variant_id,
    printAreas: ((first?.templates as Json[]) ?? []).slice(0, 12).map((m) => {
      const t = templates.get(m.template_id) as Json | undefined;
      return t
        ? {
            placement: m.placement,
            template: `${t.template_width}×${t.template_height}`,
            printArea: { left: t.print_area_left, top: t.print_area_top, width: t.print_area_width, height: t.print_area_height },
          }
        : { placement: m.placement };
    }),
  };
}

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") return new NextResponse(null, { status: 404 });
  const token = process.env.PRINTFUL_API_TOKEN?.trim();
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex" };
  if (!token) return NextResponse.json({ configured: false }, { headers });

  const report: Json = { configured: true, checkedAt: new Date().toISOString() };

  // Store-scoped reads: status only, never contents.
  for (const [key, path] of [
    ["storeProducts", "/store/products?limit=1"],
    ["fileLibrary", "/files?limit=1"],
    ["storesList", "/stores"],
  ] as const) {
    const r = await get(path, token);
    report[key] = { status: r.status, ok: r.status === 200, reason: r.status === 200 ? undefined : reason(r.body) };
  }

  // Catalogue print geometry (public product facts, fetched with the token).
  for (const id of PRODUCTS) {
    const pf = await get(`/mockup-generator/printfiles/${id}`, token);
    const tp = await get(`/mockup-generator/templates/${id}`, token);
    const v2 = await get(`/v2/catalog-products/${id}/mockup-templates?limit=5`, token);
    report[`product${id}`] = {
      printfiles: { status: pf.status, reason: pf.status === 200 ? undefined : reason(pf.body), summary: pf.status === 200 ? summarisePrintfiles(pf.body) : undefined },
      templates: { status: tp.status, reason: tp.status === 200 ? undefined : reason(tp.body), summary: tp.status === 200 ? summariseTemplates(tp.body) : undefined },
      v2MockupTemplates: { status: v2.status, reason: v2.status === 200 ? undefined : reason(v2.body), count: Array.isArray(v2.body?.data) ? (v2.body!.data as unknown[]).length : undefined },
    };
  }
  return NextResponse.json(report, { headers });
}
