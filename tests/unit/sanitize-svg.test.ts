// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import createDOMPurify from "dompurify";
import { sanitizeSvg } from "@/lib/artwork/sanitize-svg";

const env = () => ({ purify: createDOMPurify(window as never), parser: new DOMParser(), serializer: new XMLSerializer() });

const wrap = (inner: string, attrs = 'viewBox="0 0 100 50"') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrs}>${inner}</svg>`;

const HOSTILE: [string, string][] = [
  ["inline script", wrap('<script>alert(1)</script><rect width="10" height="10"/>')],
  ["script with namespace", wrap('<svg:script xmlns:svg="http://www.w3.org/2000/svg">alert(1)</svg:script>')],
  ["onload handler", wrap('<rect width="10" height="10"/>', 'viewBox="0 0 10 10" onload="alert(1)"')],
  ["onclick on child", wrap('<circle r="5" onclick="steal()"/>')],
  ["foreignObject HTML", wrap('<foreignObject width="100" height="50"><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>')],
  ["javascript: link", wrap('<a href="javascript:alert(1)"><rect width="5" height="5"/></a>')],
  ["xlink javascript", wrap('<a xlink:href="javascript:alert(1)"><rect width="5" height="5"/></a>')],
  ["external image", wrap('<image href="https://evil.example/track.png" width="10" height="10"/>')],
  ["external use", wrap('<use href="https://evil.example/sprite.svg#a"/>')],
  ["file reference", wrap('<image xlink:href="file:///etc/passwd" width="10" height="10"/>')],
  ["css url()", wrap('<style>rect{fill:url(https://evil.example/x)}</style><rect width="5" height="5"/>')],
  ["css @import", wrap('<style>@import "https://evil.example/x.css";</style><rect width="5" height="5"/>')],
  ["entity bomb", `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><text>&b;</text></svg>`],
  ["xinclude", wrap('<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" href="/etc/passwd" parse="text"/>')],
  ["iframe", wrap('<iframe src="https://evil.example"></iframe>')],
  ["embed", wrap('<embed src="https://evil.example/x.swf"/>')],
  ["animate to javascript", wrap('<a><animate attributeName="href" values="javascript:alert(1)"/><rect width="5" height="5"/></a>')],
  ["set handler via attribute name casing", wrap('<rect width="5" height="5" OnMouseOver="alert(1)"/>')],
];

describe("SVG sanitiser rejects hostile content", () => {
  it.each(HOSTILE)("%s", (_name, svg) => {
    const result = sanitizeSvg(svg, env());
    if (result.ok) {
      // Anything that slips past the reject list must come out inert.
      expect(result.svg).not.toMatch(/script|javascript:|onload|onclick|onmouseover|foreignObject|https?:\/\/|file:|@import/i);
    } else {
      expect(result.message).toMatch(/can't accept|couldn't read/i);
    }
  });

  it("rejects at least the high-risk cases outright rather than altering them", () => {
    const outright = HOSTILE.filter(([, svg]) => !sanitizeSvg(svg, env()).ok);
    expect(outright.length).toBeGreaterThanOrEqual(15);
  });
});

describe("SVG sanitiser keeps clean artwork intact", () => {
  it("accepts a plain logo, preserves geometry and reports intrinsic size", () => {
    const svg = wrap('<defs><linearGradient id="g"><stop offset="0" stop-color="#e6007e"/><stop offset="1" stop-color="#00a0e3"/></linearGradient></defs><rect width="100" height="50" rx="8" fill="url(#g)"/><use href="#g"/>');
    const result = sanitizeSvg(svg, env());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
    expect(result.svg).toContain("linearGradient");
    expect(result.svg).toContain('rx="8"');
    expect(result.rasterSvg).toContain('width="2048"');
    expect(result.rasterSvg).toContain('height="1024"');
  });

  it("derives a viewBox from width/height and warns about live text", () => {
    const result = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" width="300px" height="100"><text x="10" y="50">Acme</text></svg>', env());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.svg).toContain('viewBox="0 0 300 100"');
    expect(result.warnings[0]).toMatch(/live text/);
  });

  it("allows embedded PNG data but refuses SVGs without a size", () => {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    expect(sanitizeSvg(wrap(`<image href="${png}" width="10" height="10"/>`), env()).ok).toBe(true);
    expect(sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"/></svg>', env()).ok).toBe(false);
  });
});
