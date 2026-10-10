# Nota Print rebuild: audit, plan and first build

**Status:** first working slice built and deployed as a **Vercel preview** (10 Oct 2026). Branch `claude/zen-newton-he9byr`. **Start with [08 · Build status](08-build-status.md)**, which covers what's built, test results, the preview link and launch dependencies. **`main` and production are untouched**, including `main`'s node_modules-only commit `dc7c7f0`. No DNS changes.

This is a plan to rebuild Jake's print, merchandise and POS shop at **notaprint.co.uk** as a premium site. The first screen asks the customer to "Upload your logo". That one logo then appears on real products in true 3D, then the customer proofs and pays. Small orders are made to order (POD); bulk orders go through UK trade suppliers.

## What we found (verified)

1. **Nothing is live at notaprint.co.uk.**
   - The domain is registered at 123-reg until 2028-01-10.
   - Its DNS still points at Shopify, yet HTTP returns Cloudflare `409 / error 1001` and HTTPS presents no certificate. That is consistent with no Shopify store having the domain connected.
2. **The last working site** is `notaprint-website.vercel.app` (deployment `dpl_3nHRhTXuiJSc3LbQNhvCUxXR2wfp`, commit `27d56a0`).
   - It is a one-page Next.js 14 marketing site.
   - It has **no upload, products, basket, checkout or 3D**, and 6 of its links lead to 404s.
3. **GitHub `main` was overwritten** on 20 Mar 2026 with `node_modules` symlinks only, and the Vercel build of it failed.
   - **The original 12-commit source was recovered** and is kept reachable on this branch.
4. **Assets aren't reusable as-is.**
   - The logo is a 600 px raster only.
   - **4 of 5 product photos are Laltex's copyrighted photography** with no licence on record.
   - The hero video is unrelated stock footage.
5. **Suppliers, as verified:**
   - **Printful** fulfils the **white glossy mug** in the UK, and its orders stay as uncharged drafts until confirmed.
   - **Printify** has **no sandbox**, and new stores send orders to production automatically after 24 h unless approval is set to Manual.
   - **Laltex** is trade-only with **no public API**; a feed exists only behind a trade account.
   - **OpenAI GPT Image 2 / 2.5** is available through the connected OpenArt account. No OpenAI video is offered there.

## Recommended first slice

> **Upload a real logo → true 3D mug (Printful White Glossy Mug 11 oz) with colour and placement → print proof → Stripe test checkout**, with the supplier hand-off as a dry run (estimates only, no orders). Pen and bottle follow as **Laltex trade-quote** products. T-shirt and flat print come after that.

## Documents (review in this order, section by section)

| # | Document | What to decide |
|---|---|---|
| 01 | [Current-state audit](01-current-state-audit.md): repo, Vercel, domain, legacy code, assets, prior intent | Nothing (facts only) |
| 02 | [Access and requirements](02-access-and-requirements.md): access table, remaining access and data, **decision list D1–D17** | **All decisions** |
| 03 | [Design direction](03-design-direction.md): principles, art direction, type and colour, **three hero concepts**, page structure, motion | D1, D3, D4, D5, D6 |
| 04 | [Technical architecture](04-technical-architecture.md): 3D system, grid thumbnails, upload pipeline, performance, security | D9, D10, D14 |
| 05 | [Commerce and suppliers](05-commerce-and-suppliers.md): made-to-order vs trade, data model, pricing, Stripe test design, **Laltex route** | D7, D8, D11, D12 |
| 06 | [Phased plan](06-phased-plan.md): phases with **acceptance criteria**, mug slice first | D15, D16 |
| 07 | [Research notes](07-research-notes.md): verified facts and source URLs (Stripe, Printify, Laltex, uploads, Printful, 3D) | n/a |
| 08 | [Build status](08-build-status.md): the working preview, honest demo labels, verification results, how to turn on Stripe test, **remaining launch dependencies** | Launch dependencies |
| — | [Evidence](evidence/): live-site fold screenshots, the logo source, legacy commit history; [`evidence/build/`](evidence/build/) has screenshots and motion contact sheets of the new build, using synthetic logos only. No third-party images, because the repo is public | n/a |

## Decisions (status after the build go-ahead)

| | |
|---|---|
| **D1** | ✅ Brand spelling is **Nota Print** (Jake). An interim typographic wordmark is in use |
| **D3** | Open: a Nota Print vector logo file, which replaces the interim wordmark |
| **D7** | ✅ Printful White Glossy Mug approved for the first slice (11 oz and 15 oz, both UK-fulfilled) |
| **D9** | Open: database (Neon or Supabase). The build runs client-side behind a persistence adapter until then |
| **D11** | Open: margin, rounding, shipping and VAT policy. The build uses configurable, clearly labelled demo estimates |
| **D17** | Open: make this **public** repo private before commercial details land |
| **Access** | Open: Stripe sandbox test keys (checkout is disabled until set); a Printful API token (fulfilment stays a dry run) |

## Deliberately not done

- No production deployment and no DNS or domain changes.
- No live Stripe: live keys are refused by code.
- No supplier orders or drafts; fulfilment is a dry run.
- No image or video generation, and no credits spent.
- No emails sent, no subscriptions.
- No scraping of gated trade prices.

The docs-only `vercel.json` guard was **removed** once the app landed, so this branch now builds Vercel **preview** deployments. Production still follows `main`.

## Restore the legacy site (if ever needed)

```bash
git fetch origin 27d56a02c51f12784be38f7acb53ec12397b541d
git switch -c legacy-27d56a0 FETCH_HEAD
```
