# 08 · Build status: first working slice

**Status:** working preview build (10 Oct 2026). Branch `claude/zen-newton-he9byr`.

- **`main` and production are untouched.** The production deployment `dpl_3nHRhTXuiJSc3LbQNhvCUxXR2wfp` and `notaprint.co.uk` DNS have not changed.
- **Not a live shop.** Every price is a demo estimate, checkout is disabled until Stripe **test** keys are added, and supplier fulfilment is a dry run.

**Preview:** see [Preview deployment](#preview-deployment) below.

## What you can do on the preview

1. **Upload a logo once.**
   - PNG, JPEG or SVG; drop it anywhere or use the button.
   - The same file then appears in the hero, every product thumbnail, the 3D viewer, the proof and the basket.
   - It survives reloads and navigation.
   - Replace and Remove sit in the header chip.
2. **Watch it land on products.**
   - The hero is a deterministic 3D scene driven only by native scroll; nothing is hijacked.
   - A sample logo (or yours) transfers onto a mug, turns with it, then appears on a pen and a bottle.
   - It settles straight into a white-background product grid.
3. **Browse the grid.** Search, category, made-to-order vs trade, colour family, quantity price-points (1, 25, 100, 500) and sort. Thumbnails are baked from the 3D models using your logo.
4. **Configure the mug in real 3D.**
   - Drag or swipe to rotate. Ctrl+wheel or pinch zooms; plain wheel and vertical swipes still scroll the page.
   - Keyboard: arrows, +/−, 0 to reset. There are also buttons for rotate, view front/back/centre, zoom and reset.
   - Settings: 11 oz or 15 oz; white only (the only colour Printful's mug comes in); placement front, back, both sides or centre wrap.
   - Logo width and vertical offset are clamped to the print area. Resolution is rated live and quantity tiers are priced.
5. **Proof and approve.**
   - A flat proof at real proportions, with mm rulers, the keep-clear margin and the logo box dimensioned.
   - An explicit approval checkbox, plus a separate acknowledgement for low-resolution artwork.
   - The download is labelled as a *web* proof, not a print file.
6. **Basket.**
   - Persists across reloads, with quantity edits and removal.
   - The server re-prices every line on load ("Prices confirmed by the server").
   - Checkout shows a clear *not connected* state: "Checkout isn't connected yet. Stripe test keys haven't been added to this preview."
7. **Trade items** (pen, bottle, tote, notebook, business cards).
   - Same upload, preview and proof, with MOQs and indicative tiers.
   - They go to a *trade quote* that can be prepared, downloaded or copied. It is marked "prepared, not sent" and nothing is transmitted.

## Honest labels (what is demo or provisional)

| Area | State | Where to change it |
|---|---|---|
| Prices and shipping | **Demo estimates**, labelled as such on every price. Mug 11 oz: £14 / £12.50 / £11 / £10 at 1 / 10 / 25 / 50. Shipping: £4.95, free over £75 | `src/lib/pricing/config.ts`, tiers in `src/lib/catalog/products.ts` |
| Mug catalogue | Printful product 19, variants 1320 (11 oz) and 4830 (15 oz), both UK-fulfilled, read 10 Oct 2026. 20 oz is excluded because it isn't UK-fulfilled | `src/lib/catalog/printful-snapshot.ts` |
| Mug print area | **Provisional**: 200 × 80 mm (11 oz) and 210 × 100 mm (15 oz), 3 mm safe margin. Must be calibrated against Printful's print-file template before production | `products.ts` |
| Trade items | **Prototype previews**: procedural shapes, unverified colours, provisional print areas, "Trade quote · Indicative" | `products.ts` |
| 3D models | Original procedural meshes at published dimensions, **not supplier geometry**. Each product page says so | `src/three/models.ts` |
| Proof vs print master | The composed canvas is a **web preview** (≤ 2048 px, 9 px/mm). **No print master is generated yet.** The proof says it is not the production file | `src/lib/artwork/compose.ts` |
| Brand | Typographic interim wordmark "Nota *Print*" until a vector master exists | `src/components/Header.tsx` |
| Indexing | `robots: noindex, nofollow` on every page | `src/app/layout.tsx` |

## How it is built

- **Stack:**
  - Next.js 16.4 (App Router) with React 19.3 and TypeScript;
  - plain three.js 0.186;
  - zod for every boundary;
  - DOMPurify for SVG;
  - the Stripe SDK 23 (test mode only).
  - No database, no paid services. Exact versions are pinned in `package.json`.
- **Artwork intake** (`src/lib/artwork/`):
  - The file type is detected from magic bytes, not the extension.
  - Size limits: PNG 25 MB, JPEG 15 MB, SVG 2 MB, ≤ 40 MP, sides 48–12,000 px.
  - EXIF orientation is applied; transparency is detected and empty edges trimmed.
  - SVG goes through a reject list first (scripts including namespaced ones, `foreignObject`, entities, event handlers, external refs, `javascript:`, `@import`), then DOMPurify, then a fixed-size raster.
  - Artwork is identified by its SHA-256.
- **Persistence:**
  - artwork in IndexedDB, keyed by hash;
  - the current design, basket and quote in `localStorage`, validated with zod on read;
  - the repository interface (`src/lib/persistence/`) is ready for a server store.
- **3D:**
  - Each print surface is a separate mesh whose UVs map 1:1 to the print rectangle in mm. The *same* composed canvas therefore drives the 3D view, the grid thumbnails and the proof.
  - There is one lazy viewer, which renders on demand, pauses off-screen and falls back on WebGL context loss.
  - Grid thumbnails come from one shared offscreen renderer that is released when idle.
  - Reduced motion shows a static composed frame. Without WebGL, the site still works and says so.
- **Server trust boundary:**
  - `/api/price` and `/api/checkout` ignore any client price fields and re-validate every line: product, variant, colour, placement, quantity range, artwork inside the print bounds (±0.6 mm), and minimum resolution with its acknowledgement.
- **Stripe (test only):**
  - Keys that aren't `sk_test_`/`rk_test_` are refused; live keys are refused explicitly.
  - Checkout Sessions are idempotent, keyed by a hash of the server-priced basket.
  - The webhook (`/api/stripe/webhook`) verifies the raw-body signature, ignores live events and deduplicates events.
  - A paid session writes a dry-run marker on the PaymentIntent and **never contacts a supplier**.
- **Fulfilment** (`src/lib/fulfilment/printful-dry-run.ts`):
  - Builds the Printful order body it *would* send, using the `pending://print-master/<hash>` placeholder and listing blockers.
  - `submitToPrintful()` always throws. There is no network code.

## Verification (local production build, synthetic test logos only)

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run build` | OK: 11 routes, product pages statically generated |
| `npm test` (Vitest) | **56 / 56 passed**: pricing and basket validation, intake limits, 18 hostile SVGs (namespaced script, entities, `foreignObject`, external refs and more), Stripe config, checkout params, idempotency, webhook signature, duplicates, live-event refusal, Printful dry run, quote preparation |
| `npm run e2e` (Playwright, Chromium with software WebGL) | **18 passed, 0 failed, 18 skipped by design**: desktop runs all 9 specs; phones run the core flow plus a subset |

End-to-end coverage by viewport:

| Spec | desktop 1440 | 375 | 390 | 430 |
|---|---|---|---|---|
| Core flow: upload → personalised grid (6 products carry the same artwork hash) → 3D mug rotates by keys and buttons, plus mouse drag on desktop → real variants only → print bounds → proof gate → basket → **reload persistence** → server price → checkout disabled | ✅ | ✅ | ✅ | ✅ |
| Invalid files: unsupported type, hostile SVG, 26 MB PNG, over-pixel PNG | ✅ | ✅ | ✅ | ✅ |
| Low-resolution artwork: warns, needs acknowledgement, blocks when unprintable | ✅ | – | ✅ | – |
| JPEG keeps its aspect ratio and warns about its solid background; replace and remove | ✅ | – | – | – |
| Filters, sort and quantity pricing | ✅ | – | – | – |
| Trade item → proof → prepared quote (never sent) | ✅ | ✅ | – | – |
| Reduced motion: static stage | ✅ | – | ✅ | – |
| No WebGL: site still works and says so | ✅ | – | – | – |
| API trust: client prices ignored, bad baskets rejected, checkout 503 without keys | ✅ | – | – | – |

- All four widths had no horizontal overflow and no uncaught page errors.
- **Not yet verified:**
  - Real phones (iOS Safari, Android Chrome) and real GPUs. Every run used headless Chromium with software WebGL.
  - Touch rotation. It was exercised through emulated pointer events, not real touch, and the `pan-y` scroll-vs-rotate split needs a check on a device.

**Evidence** (`evidence/build/`, synthetic logos only):

- Screenshots for desktop and for 375, 390 and 430 px.
- Two motion contact sheets sampled from screen recordings of the full flow: `motion-desktop-contact-sheet.jpg` (one frame every 4 s) and `motion-mobile-390-contact-sheet.jpg` (one every 3.2 s).
- The recordings themselves (MP4) were shared in the session rather than committed.
- Software WebGL renders slower than a real GPU, so the frame rate in the recordings understates the real experience.

## Preview deployment

| | |
|---|---|
| **Preview (this branch, always the latest build)** | https://notaprint-website-git-claude-zen-newton-he9byr-anyos.vercel.app |
| Verified deployment | `dpl_5KXaUK5rJmAKZaNecqaNNsPrZr1m`: https://notaprint-website-m1r4urfc0-anyos.vercel.app (commit `5e03856`, **READY**, target *preview*, region iad1) |
| Access | Vercel Authentication is on for previews. Log in with the Vercel account that owns the project, or create a temporary share link from the deployment page. Pages are `noindex`. |
| Build | Vercel CLI 62.7, Node 24.x, `npm` install, then `next build` (Turbopack) in 21 s. The only warning is about the open-ended `engines.node` range |
| Smoke checks | `/api/checkout` returns `{"enabled":false,"mode":"disabled"}` with the not-connected message. Headers present: HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `x-robots-tag: noindex`. Product pages are served prerendered |
| **E2E against the preview** | Full suite run against `dpl_5KXaUK5rJmAKZaNecqaNNsPrZr1m` through Vercel Authentication, using a temporary share link: **18 passed, 0 failed, 0 flaky, 18 skipped by design**, in 6.9 min. The same matrix as the local run: desktop 9/9; 375: 3 run; 390: 4 run; 430: 2 run. Vercel logged no runtime errors during the run |
| Note | The small round dark button on the right edge of previews is **Vercel's preview toolbar**, shown to signed-in team members. It isn't part of the site and doesn't appear in production |

## Turning things on

| To enable | Do this | Code behaviour |
|---|---|---|
| Stripe **test** checkout | In Vercel → Project → Environment Variables (Preview): set `STRIPE_SECRET_KEY=sk_test_…`, then redeploy | Button becomes "Checkout"; hosted Stripe page; success page shows only what Stripe confirms |
| Signed webhooks | Add endpoint `https://<preview>/api/stripe/webhook` in the Stripe sandbox for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` and `checkout.session.expired`. Set `STRIPE_WEBHOOK_SECRET=whsec_…` | Without the secret the webhook answers 503. With it, events are verified, deduplicated and recorded as dry runs |
| Absolute return URLs | `SITE_URL` (optional) | Otherwise inferred from the request |

Live keys are refused by design: enabling live payments is a deliberate code change, not a config switch.

## Remaining dependencies before a live launch

1. **Stripe.**
   - A sandbox with test keys and a webhook secret, to exercise the full test checkout.
   - For live: business verification, live keys and a code change to allow them. Refunds and disputes policy.
2. **Durable order store** (D9: Neon or Supabase).
   - Today the webhook dedupe ledger is in memory, per instance. The only durable record is PaymentIntent metadata.
   - Orders, proof approvals and artwork references need a database.
3. **Artwork upload and print master.**
   - Artwork never leaves the device today. Fulfilment needs:
     - upload to private storage;
     - server-side rendering of the print file at the provider's DPI, from the source artwork;
     - validation against **Printful's print-file template** for the 11 oz and 15 oz mug;
     - calibrating the provisional print areas to that template.
4. **Printful.**
   - An API store token, re-verifying variants, availability and shipping rates.
   - Then switching from dry run to **draft orders** confirmed by a person. That needs approval because it can create charges.
5. **Pricing policy (D11).**
   - Real costs, margin, rounding, shipping rules and VAT treatment.
   - Accountant sign-off. Prices stay labelled "demo" until then.
6. **Legal pages.** Terms, privacy, returns for personalised goods, and company details. The app sets no cookies of its own (it uses local storage on the device only), but this needs confirming once analytics or Stripe are added.
7. **Brand master (D3).** A vector logo to replace the interim wordmark and favicon.
8. **Trade route (Laltex).**
   - A trade account, verified price tiers and permission to use product data and images.
   - A channel to send quotes, such as email or a CRM. Quotes are prepared, not sent.
9. **Product 3D beyond the mug.** Licensed or commissioned meshes, or keep the procedural prototypes clearly labelled. The mug is procedural but built to the published dimensions.
10. **Hosting plan.** Vercel Hobby is for non-commercial use, so check the team's plan before taking orders. Previews stay behind Vercel Authentication.
11. **Domain and email.**
    - Approve the DNS cutover of `notaprint.co.uk` at 123-reg to this project.
    - A mailbox and MX for order and quote notifications. Customer emails are not built yet.
12. **Repo visibility (D17).** The repository is public, so make it private before commercial details land. This build contains no secrets and no customer artwork.
