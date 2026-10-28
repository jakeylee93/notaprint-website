# 10 · Product rail rebuild and the real-3D plan (27 Oct 2026)

Jake's brief: a much more minimal site, a better header, then straight into a carousel of **real** products with filters. It should look like the reference reel (garments hung in a row on a plain wall, a thin selection frame on the item in focus, its name underneath, tap to zoom in). The products are rendered in 3D (Tripo), carry the customer's logo with per-product positions (centre chest, left chest and so on), and offer real colour changes.

## Built in this checkpoint
- **Header:** the genuine Nota mark plus small uppercase links (Shop, Trade, Add your logo, Basket). The large pill button is gone.
- **Homepage:** the header is followed directly by category filters (All, Hoodies, Sweatshirts, Tees, Caps, Mugs) and the **rail**.
  - Native horizontal scroll with snapping, plus arrow buttons, arrow keys and swipe.
  - The centred item gets the reel's thin blue selection frame with corner handles. Its name, brand/model and colour swatches sit underneath.
  - **Customise** shows the product's real Printful placements and sizes, plus the logo state.
- **Catalogue:** `scripts/sync-printful.mjs` pulls confirmed facts from Printful's public catalogue API into `src/lib/catalog/printful-catalog.json`. Only UK/EU-fulfilled variants are kept.

| Printful ID | Product | Blank | Colours (UK/EU) |
|---|---|---|---|
| 380 | Premium Pullover Hoodie | Cotton Heritage M2580 | 23 |
| 892 | Oversized Heavyweight Hoodie | Bella + Canvas 4719 | 11 |
| 897 | Oversized Heavyweight Sweatshirt | Bella + Canvas 4711 | 10 |
| 586 | Garment-Dyed Heavyweight Tee | Comfort Colors 1717 | 50 |
| 713 | Oversized Faded Tee | AS Colour 5082 | 8 |
| 1663 | Sunwashed Cap | Comfort Colors CCSC0 | 9 |
| 19 | White Glossy Mug | Printful | 1 |

  - Excluded because they are US-fulfilment only: Copper Vacuum Insulated Bottle (935) and the Comfort Colors Carry-All Tote (1683).
- **Imagery:** each colour shows Printful's own catalogue photograph for that colour (hotlinked from Printful's CDN). Most are lifestyle shots on models, so the rail doesn't yet look like the reel. These are interim images.
- **3D and logo:** the mug opens in its calibrated in-browser 3D model ("Open in 3D"). **The logo is not drawn on the garments yet.** Doing that accurately needs Printful's print templates, and guessing positions on lifestyle photos would be exactly the "random mockup" Jake doesn't want.
- The old hero, product grid and proof showcase were removed from the homepage. The basket, proof, quote and mug pages are unchanged.
- **Security:** Next.js 16.4.0 → 16.4.3. The build refused to run 16.4.0 because of a known vulnerability.

## Real-3D pipeline (ready to run once access is added)
1. **Reference images:** with a read-only `PRINTFUL_API_TOKEN`, fetch Printful's flat or ghost product images and mockup templates for each product. The templates also give the **exact print-area rectangle for each placement** (left chest, centre chest, back and so on).
2. **3D models:** with `TRIPO_API_KEY`, run Tripo image-to-3D **once per product** (not per customer, not per colour) from a neutral or white blank. Record each task ID, the credits used, and failed tasks and retries. Each GLB is checked against the reference photos at full size before use. Anything that drifts is rejected.
3. **In the browser:**
   - GLBs load lazily in the existing three.js viewer.
   - Colours come from Printful's hex values, applied as a tint on the neutral base texture.
   - The customer's logo is projected as a decal at the template-calibrated position for the chosen placement.
   - No AI call per customer, per colour or per rotation.
4. **Rail:** consistent studio renders of each GLB (same camera, light and scale) replace the lifestyle photos, giving the reel's clean, hung-in-a-row look. The logo appears on every item once uploaded.
5. **Supplier products** (bottles, pens and so on from Jake's trade suppliers) use the same pipeline from the supplier's own photos, with confirmed facts only.

## Blockers
- `TRIPO_API_KEY` and `PRINTFUL_API_TOKEN` are not available in this environment. There is no connector for either.
  - Add both as environment secrets: cloud environment settings → Edit → Network secrets.
  - Tripo spend stays within Jake's existing credits. No top-ups.
- Real-phone checking of swipe on the rail.

## Printful access check (28 Oct 2026, preview `5265522`, `dpl_8yUBhspm4gaWV9v6bg93LX6Mnez1`)
- **How it's wired:**
  - The single-store Notaprint token is stored as `PRINTFUL_API_TOKEN` on the Vercel project, scoped to branch `claude/zen-newton-he9byr`. Jake added it; it never appears in the repo, chat or container.
  - It is read only by the server-only route `GET /api/printful/check`. That route answers only on preview deployments (behind Vercel Authentication) and returns 404 everywhere else.
  - It makes GET requests only. The token is never echoed. Store-scoped reads report a status code only.

| Read | Result |
|---|---|
| Print files, Premium Pullover Hoodie (380) | ✅ 200. Front 1800×1800 px @ 150 dpi (12 × 12 in), back 1800×2400 @ 150 (12 × 16 in), sleeves 450×1800 @ 150, labels, wrists |
| Mockup templates, 380 (v1) | ✅ 200. 207 templates with exact print-area rectangles, e.g. front: 1049×1049 at (985, 565) on a 3000×3000 template |
| Print files and templates, White Glossy Mug (19) | ✅ 200. Print file 2700×1050 px @ 300 dpi = **228.6 × 88.9 mm**. Template print area 671×261 at (29, 163) on 728×728 |
| v2 catalogue mockup templates (380, 19) | ✅ 200 |
| Stores list | ✅ 200 (contents not read or shown) |
| Store products (`/store/products`) | ❌ 400. Only applies to Manual Order / API platform stores, and Notaprint isn't one. Not needed for the rail |
| File library (v1 `/files`) | ❌ 410. Permanently removed by Printful; v2 `/v2/files` replaces it. Not needed for reading |

**Findings**
- **Chest placements need a technique filter.** The default print-file listing for 380 doesn't include the embroidered chest placements. Those must be requested with the embroidery technique filter, which is the next read to add.
- **The mug's provisional print area is wrong.** It was 200 × 80 mm. Printful's real print file is **228.6 × 88.9 mm**, which must be corrected before any production proof.
