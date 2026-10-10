# 01 · Current-state audit (verified 10 Oct 2026)

What exists today, with the evidence behind it. **Verified** means observed directly in this session. **Inferred** means a reasoned conclusion that still needs Jake to confirm. Everything here was read-only: nothing was deployed, no DNS was changed, nothing was bought or generated.

## 1. Summary

| Area | Finding | Status |
|---|---|---|
| Live domain | `notaprint.co.uk` serves **no website**. DNS points at Shopify, but HTTP returns `409 / error 1001` and HTTPS has no certificate. | Verified (that no store has it connected is inferred) |
| Last working build | `https://notaprint-website.vercel.app` is public and serves the 12 Mar 2026 build (commit `27d56a0`). | Verified |
| GitHub `main` | Overwritten on 20 Mar 2026 by one commit (`dc7c7f0`) that holds only `node_modules` symlinks. No app source. Vercel build of it: **ERROR**. | Verified |
| Original source | All 12 original commits (`e4256b9` → `27d56a0`) can still be fetched from GitHub by SHA. This branch makes them reachable again (see §3). | Verified |
| Product | One marketing page. It has no upload, product pages, basket, checkout, 3D, supplier link or payments. | Verified |
| Brand assets | A 600 px raster logo only. 4 of 5 product photos are Laltex's copyrighted photography (2 carry Laltex demo logos), with no licence on record. The hero video is unrelated stock footage. | Verified |

## 2. Identity and naming

- The code's brand string is **"NotAPrint"** (page title: *"NotAPrint — Custom Printing & Branded Merchandise"*). The brief says "Nota Print". → **Decision D1** in [README](README.md).
- The footer lists `hello@notaprint.co.uk` and `notaprint.co.uk` (`src/components/layout/Footer.tsx` @ `27d56a0`).
- This is not N2OS or The Bar People. The Vercel project, repo and domain are all separate.

## 3. Repository: `github.com/jakeylee93/notaprint-website`

| Item | Evidence |
|---|---|
| Visibility | **Public** repository (GitHub API `visibility: public`). See decision **D17**. |
| Branches on GitHub | Only `main` @ `dc7c7f0e35e48ca53caf4a31c0c4e7bd1f443cc3`, **not protected**. This work is on `claude/zen-newton-he9byr`. No PRs. |
| `main` content | 1 root commit, *"Source code backup"*, 2026-03-20 15:35 UTC, author "Margarita Bot". It tracks 1,242 entries, all `node_modules/.pnpm/**` symlinks. There is no `package.json` and no `src/`. |
| Stack fingerprint from those symlinks | next 14.2.21, react 18.3.1, framer-motion 12.35.2, tailwindcss 3.4.19, typescript 5.9.3, pnpm |
| Original history | 12 commits from 2026-03-11 18:55 to 2026-03-12 19:29 UTC. Full list: [`evidence/legacy-history.txt`](evidence/legacy-history.txt). None is reachable from `main`, but all are still fetchable by SHA. |
| Independent check | Mission Control reports that `27d56a0` contains `src/`, `public/` and the Next config, and that GitHub deployment `4054278743` succeeded. This session confirms the same tree. |
| Preservation | `main` was **not touched**. This branch adds `27d56a0` as a second merge parent (the files are unchanged), so the original history is reachable from a pushed branch and can't be garbage-collected. |

Restore the legacy site from any clone:

```bash
git fetch origin 27d56a02c51f12784be38f7acb53ec12397b541d
git switch -c legacy-27d56a0 FETCH_HEAD     # full original Next.js app
```

## 4. Vercel (both teams checked)

Authenticated as Vercel user `jakeylee93` (Hobby plan). Two teams:

| Team | Slug / ID | Nota-related projects |
|---|---|---|
| jakeylee93's projects | `anyos` / `team_eLHrVgR7hkY4PM3MKhhGgK2B` | **`notaprint-website`** (only match for "nota" or "print") |
| anyOS | `any-os` / `team_Zsf33IDD7VQay4kKGUehg2Bb` | none (6 projects, none match) |

**Project `notaprint-website`** · `prj_IPR8ScfqECzQfglVzy95QLANPZuq`

- Framework `nextjs`, Node `24.x`. Created 2026-03-11 18:55 UTC. Git-linked to `jakeylee93/notaprint-website`.
- Domains: `notaprint-website.vercel.app` (production), plus aliases `notaprint-website-anyos.vercel.app` and `notaprint-website-git-main-anyos.vercel.app`. **No custom domain attached.**
- Protection: Vercel Authentication `all_except_custom_domains`. No password protection.
- Environment variables: **none** (no payment, supplier or AI keys).
- Production alias → **`dpl_3nHRhTXuiJSc3LbQNhvCUxXR2wfp`** (commit `27d56a0`, READY, region `iad1`). The newer `dc7c7f0` build failed, so the alias stayed on the last good build.

| Deployment | UTC | State | Commit | Message |
|---|---|---|---|---|
| `dpl_8CuAxuvq59Wv9NXByWH9p3bgcbgh` | 2026-03-20 15:35 | ERROR | `dc7c7f0` | Source code backup |
| `dpl_3nHRhTXuiJSc3LbQNhvCUxXR2wfp` | 2026-03-12 19:29 | READY (live alias) | `27d56a0` | fix: video hero background, restore all sections, simpler messaging |
| `dpl_5VnrvpcRhBXZXbwvBnhEjZHphgmA` | 2026-03-12 18:33 | READY | `91fc8e0` | redesign: … pricing tiers, bento grid |
| `dpl_6x1qGMuRntpx7sHo3ZZxrQ5WdF7P` | 2026-03-12 00:49 | READY | `6546d56` | feat: full homepage redesign |
| `dpl_5Yswjb3upuPY3sCA4XyTjVqQyRTr` | 2026-03-11 21:30 | READY | `dc97f96` | Add ProductCarousel |
| `dpl_317k1BCqxnLat4RcMzD9vXQHCMf5` | 2026-03-11 21:26 | READY | `d65709d` | Add Featured Products section |
| `dpl_GX7vFHoq2GADbYv1Ef6aucBmfwBb` | 2026-03-11 20:52 | READY | `5f338d4` | Rebuild homepage with real logo |
| `dpl_GekRcVuixLryWSdYAXiei6JGEYH8` | 2026-03-11 19:57 | READY | `9a90bf7` | Products dropdown + Express vs Bespoke |
| `dpl_BbJKpL6D2NgCYzKnXbzkNArW8XGQ` | 2026-03-11 19:14 | READY | `214be92` | Add NotAPrint logo |
| `dpl_3o8Rfmp6S3aDWQxJSL3g4ynguHi5` | 2026-03-11 19:07 | READY | `10dcb03` | Initial homepage layout |
| `dpl_Bk4ioqpKaKhsCP7y4c1F2HCXj2LZ` / `dpl_Api4kC8sPuo3ATmqQhjZG59Mgh3s` | 2026-03-11 18:56 | READY | `7fe1cbc` | fix: add autoprefixer dependency |

Public access check:

- `https://notaprint-website.vercel.app` → HTTP 200, public.
- Per-deployment URLs (e.g. `notaprint-website-mss2ew0rc-anyos.vercel.app`) → 302 to Vercel login (SSO-protected).

## 5. Domain: `notaprint.co.uk` (registered at 123-reg)

| Check (10 Oct 2026, ~14:38 UTC) | Result |
|---|---|
| Registry (Nominet RDAP `rdap.nominet.uk/uk/domain/notaprint.co.uk`) | Registrar **123-Reg Limited t/a 123-reg**. Registered 2025-01-10, expires **2028-01-10**. Status: client transfer/delete/renew/update prohibited (registrar lock). |
| Nameservers | `ns75.domaincontrol.com`, `ns76.domaincontrol.com` (GoDaddy-operated DNS; 123-reg is in the GoDaddy group) |
| Apex A | `23.227.38.65` (Shopify's documented storefront IP). No AAAA. |
| `www` | CNAME `shops.myshopify.com` |
| MX / TXT | **No MX record. No TXT** records (no SPF, DMARC or site-verification records). |
| `http://notaprint.co.uk` and `http://www.` | **409 Conflict**, body `error code: 1001`, `server: cloudflare` (Shopify edge) |
| `https://` (apex and www) | TLS handshake failure (alert 40). No certificate is served for this hostname. |

- **Interpretation (verified):** nothing is served at the domain today.
- **Inference (Jake to confirm):** a Shopify store was connected once and has since been closed or unlinked, but its DNS records were left behind. The legacy file `public/products/pen-1.jpg` supports this: it is a saved *"404: Page not found — Shopify"* page from a failed image download. → **Decision D2.**
- **Mail readiness, observed:** no MX is published. Under SMTP rules a sender falls back to the apex A record (`23.227.38.65`). **Delivery to `hello@notaprint.co.uk` was not tested**, and no email was sent. With no SPF or DMARC, treat email as **not configured** until a mailbox provider is chosen.
- `notaprint.com` is a separate registration (2019-06-11, Spaceship, Inc.). There is no evidence Jake owns it. Don't assume it.

## 6. Legacy application audit (`27d56a0`, the live build)

**Stack.** Next.js 14.2.21 App Router, React 18, TypeScript, Tailwind 3.4, framer-motion 12, DM Sans via `next/font`. One route (`/`). No API routes, data layer, CMS, analytics or tests.

**Page sections, in order:** `Header` → `HeroSection` (looping background video, "Your logo on any product", 2 CTAs, stats) → `HowItWorks` (3 steps) → `Categories` (3 gradient cards) → `ProductCarousel` (8 hard-coded items) → `UploadCTA` → `TrustBar` → `Footer`.

| Problem | Evidence |
|---|---|
| No upload at all | Every "Upload" CTA links to `#upload` or `#`. There are 0 `<input>`/`<form>` elements on the page (Playwright count). |
| Dead routes | `/about`, `/contact`, `/products`, `/products/merchandise`, `/products/large-format` and `/products/print` all return **404**. Privacy and Terms link to `#`. |
| Metadata | No favicon, no Open Graph image, no sitemap or robots file. `lang="en"` is set. |
| Unsupported claims | "100+ products", "24hr turnaround", "No minimums", "Eco options", "Fast UK delivery". No catalogue or supplier backs any of them. |
| Product data | Images are reused across products (the "Custom T-Shirt" shows a lunch box; the "Custom Tote Bag" shows a cooler bag). "Bamboo Stylus Pen" appears at both £0.58 and £1.85. Prices are hard-coded with no stated source or VAT basis. |
| Accessibility | Animations ignore `prefers-reduced-motion`. The autoplay looping video has no pause control (WCAG 2.2.2). The menu button lacks `aria-expanded`. **Measured contrast fails AA:** `text-white/30` on `#0a0f1c` = 2.65:1, `text-gray-400` on white = 2.54:1, white on the `cyan-500` CTA = 2.43:1. |
| Visual language | Dark navy and cyan "SaaS template" look: pill badge, gradient text, glow shadows, card grids, stat bar. This conflicts with the new design standard. |

Screenshots: [desktop fold](evidence/live-desktop-fold.png) · [mobile fold](evidence/live-mobile-fold.png).
- The hero video can't play in headless Chromium (no H.264), so the hero appears without it. That is a limit of the test browser, not a site bug.
- Full-page captures were taken but **not committed**: they show the unlicensed Laltex product photos, and this repository is **public**. They are reproducible with Playwright against `https://notaprint-website.vercel.app/`.

## 7. Asset audit (`public/` @ `27d56a0`)

| File | Real format · size | Issue |
|---|---|---|
| `logo.png` | PNG RGBA 600×600 | **Raster only.** No vector master in the repo (commit `214be92` says the logo was saved to Google Drive). Needs SVG/PDF for print and a crisp UI. |
| `hero-bg.mp4` | H.264, **portrait 1280×2276**, 15 s, 1.46 MB | Generic palm-tree sunset stock, unrelated to print. A portrait clip cropped into a landscape hero. Source and licence unknown. |
| `products/pen.png` (= `product-1.png`) | PNG 600×600 | Grey background, pen cut off at the frame edge. |
| `products/orca-rpet-cooler.png` (= `product-2.jpg`) | **JPEG** 400×400 | **Laltex photo**: Bags HQ **QB1018** "Orca Cooler Bag", carrying Laltex's fictitious demo logo ("Hawk on the Wild Side"). |
| `products/double-stacked-bamboo.png` (= `product-3.jpg`) | **JPEG** 4000×4000 | **Laltex photo**: Laltex Promo **RC0201** "Double Stacked Lunch Box". Wrong file extension. |
| `products/unique-wood-ball.png` (= `product-4.jpg`) | **JPEG** 4000×4000 | **Laltex photo**: Pencom **TPC550001** "Unique Wood Ball Pen", carrying Laltex's demo logo ("Al Hanson Deck Suppliers"). |
| `products/bamboo-basic-ball.png` (= `product-5.jpg`) | **JPEG** 4000×4000 | **Laltex photo**: Pencom **TPC444501** "Bamboo Basic Ball Pen". Wrong file extension. |
| `products/merch-hero.jpg` / `largeformat-hero.jpg` | JPEG 800×581 / 800×533 | Unrelated stock (a smartwatch and chess pieces). Not shown in the UI. |
| `products/pen-1.jpg` | **HTML** (a Shopify 404 page) | Failed download |
| `products/print-hero.jpg` | **HTML**, 29 bytes (`404`) | Failed download |

`public/product-1…5.*` are byte-identical copies of five files in `public/products/`.

**Provenance (verified by image comparison against Laltex's own image files):**
- 4 of the 5 product photos are **Laltex photography**.
- The "Bamboo Stylus Pen" photo matches no Laltex image, so its source is unknown.
- Laltex's website terms say its pictures are copyright and must not be copied or reproduced without permission. Laltex does not publish an image licence for resellers.
- **Do not reuse these images** until Laltex grants written permission (see [05 · Laltex](05-commerce-and-suppliers.md#laltex)).
- Contact sheets of these images and of the stock video were produced for this audit but **are not committed**, to avoid republishing third-party material in a public repo.
- View the originals in the legacy commit, e.g. `git show 27d56a0:public/products/unique-wood-ball.png > /tmp/x.jpg`.
- Committed evidence: [logo (Jake's own)](evidence/legacy-logo-600px-source.png). ## 8. Prior intent worth keeping

- **"Two Ways to Order: Express vs Bespoke"** (`TwoPathsSection.tsx`, commits `9a90bf7`–`dc97f96`, removed in `6546d56`). *Express*: "Upload your logo, see instant mockups… quick turnaround". *Bespoke*: "large events, corporate gifts… volume discounts". This maps directly onto the new **made-to-order (POD) vs trade quantities (bulk)** model, so it carries forward as the core navigation idea. **Its claims ("3–5 day delivery", "2–3 week lead time") and all old tier prices (e.g. 50 / 100 / 500 units at £0.45 / £0.38 / £0.30) are unverified placeholders and are not reused.** Real figures will come from supplier data.
- **`REDESIGN-BRIEF.md`** (in `91fc8e0`, deleted in `27d56a0`) asked for pure-white product backgrounds and quantity-tier pricing. Both are kept. Its bento grids and glassmorphism are dropped under the new standard.

## 9. How to reproduce

```bash
git ls-remote origin                                   # branches
git fetch origin 27d56a02c51f12784be38f7acb53ec12397b541d && git ls-tree -r --name-only FETCH_HEAD
curl -s "https://dns.google/resolve?name=notaprint.co.uk&type=A"
curl -s -H 'Accept: application/rdap+json' https://rdap.nominet.uk/uk/domain/notaprint.co.uk
curl -sI http://notaprint.co.uk                        # 409 / error code 1001
curl -sI https://notaprint-website.vercel.app          # 200
```

The Vercel facts above came from the Vercel connector (read-only): teams, projects, deployments, domains and env var names.
