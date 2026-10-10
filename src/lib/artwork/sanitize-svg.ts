import type { DOMPurify as DOMPurifyInstance } from "dompurify";

/**
 * SVG intake. Anything active or external is rejected outright rather than silently altered,
 * because quietly changing someone's brand artwork is worse than asking for a clean export.
 * What passes is then sanitised with DOMPurify's SVG profile as defence in depth.
 */

export type SvgResult =
  | { ok: true; svg: string; rasterSvg: string; width: number; height: number; warnings: string[] }
  | { ok: false; message: string };

const REJECT_PATTERNS: { re: RegExp; why: string }[] = [
  { re: /<!ENTITY/i, why: "entity declarations" },
  { re: /<!DOCTYPE[^>]*\[/i, why: "an embedded document type definition" },
  { re: /<\s*([a-z0-9_.-]+:)?script\b/i, why: "scripts" },
  { re: /<\s*([a-z0-9_.-]+:)?foreignObject\b/i, why: "embedded HTML" },
  { re: /<\s*([a-z0-9_.-]+:)?(iframe|embed|object|audio|video|canvas)\b/i, why: "embedded media" },
  { re: /<\s*xi:include|xmlns:xi\s*=/i, why: "external includes" },
  { re: /\son[a-z]+\s*=/i, why: "event handlers" },
  { re: /javascript\s*:/i, why: "script links" },
  { re: /@import/i, why: "external stylesheets" },
  { re: /url\(\s*['"]?\s*(?!#)/i, why: "external references in styles" },
];

const ALLOWED_DATA_IMAGE = /^data:image\/(png|jpe?g);base64,[a-z0-9+/=\s]+$/i;

function hrefIsSafe(value: string): boolean {
  const v = value.trim();
  return v.startsWith("#") || ALLOWED_DATA_IMAGE.test(v);
}

function parseLength(v: string | null): number | null {
  if (!v) return null;
  const m = /^\s*([0-9]*\.?[0-9]+)\s*(px)?\s*$/i.exec(v);
  return m ? parseFloat(m[1]) : null;
}

export const RASTER_LONG_SIDE = 2048;

export interface SvgEnv {
  purify: DOMPurifyInstance;
  parser: DOMParser;
  serializer: XMLSerializer;
}

export function sanitizeSvg(text: string, env: SvgEnv): SvgResult {
  const { purify, parser, serializer } = env;
  for (const { re, why } of REJECT_PATTERNS) {
    if (re.test(text)) {
      return { ok: false, message: `This SVG contains ${why}, which we can't accept. Please export a plain SVG, or a PNG.` };
    }
  }
  // Every href/xlink:href must be an internal fragment or an embedded PNG/JPEG.
  const hrefRe = /(?:xlink:)?href\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(text))) {
    const value = m[2] ?? m[3] ?? "";
    if (!hrefIsSafe(value)) {
      return { ok: false, message: "This SVG links to external files, which we can't accept. Please embed or outline everything and export again." };
    }
  }

  const withoutDoctype = text.replace(/<!DOCTYPE[^>]*>/gi, "");
  purify.removeAllHooks();
  purify.addHook("uponSanitizeAttribute", (_node, data) => {
    if ((data.attrName === "href" || data.attrName === "xlink:href") && !hrefIsSafe(data.attrValue)) {
      data.keepAttr = false;
    }
  });
  const clean = purify.sanitize(withoutDoctype, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["use"],
    RETURN_TRUSTED_TYPE: false,
  }) as unknown as string;
  purify.removeAllHooks();

  const doc = parser.parseFromString(clean, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length > 0) {
    return { ok: false, message: "We couldn't read that SVG. Please export it again." };
  }

  let width: number | null = null;
  let height: number | null = null;
  const viewBox = root.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      width = parts[2];
      height = parts[3];
    }
  }
  if (width === null || height === null) {
    width = parseLength(root.getAttribute("width"));
    height = parseLength(root.getAttribute("height"));
    if (width && height) root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  if (!width || !height) {
    return { ok: false, message: "This SVG has no size. Please export it with a viewBox or a width and height." };
  }
  if (!root.getAttribute("xmlns")) root.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const warnings: string[] = [];
  if (doc.getElementsByTagName("text").length > 0) {
    warnings.push("This SVG contains live text. Fonts may not match; outlined text prints exactly as designed.");
  }
  if (root.querySelector("*") === null) {
    return { ok: false, message: "This SVG is empty." };
  }

  const svg = serializer.serializeToString(root);
  const scale = RASTER_LONG_SIDE / Math.max(width, height);
  root.setAttribute("width", String(Math.round(width * scale)));
  root.setAttribute("height", String(Math.round(height * scale)));
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const rasterSvg = serializer.serializeToString(root);
  return { ok: true, svg, rasterSvg, width, height, warnings };
}
