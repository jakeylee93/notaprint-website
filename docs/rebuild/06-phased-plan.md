# 06 · Phased plan with acceptance criteria

**Depth before breadth.** Phase 1 delivers **one complete working path** (*upload a real logo → true 3D mug with colour and placement → print proof → Stripe test checkout*) before anything else widens.

Every phase runs on branches and **SSO-protected Vercel Preview** only. Four things stay off until Jake explicitly approves each one separately: production deployment, the DNS change at 123-reg, live Stripe, and real supplier orders.

Effort figures are indicative ranges for one experienced full-stack/3D developer with AI assistance. They are estimates, not commitments.

## Phase 0 · Decisions, access, skeleton (2–4 days)

**Inputs needed:** decisions D1–D12 and the access items in [02](02-access-and-requirements.md).

**Work**
- Create a fresh Next.js 16 app on a feature branch (the legacy app stays recoverable at `27d56a0`).
- Add lint, typecheck, unit tests and Playwright to CI.
- Add design tokens from [03](03-design-direction.md).
- Add a feature-flag module with `SUPPLIER_SUBMISSION=off` and `STRIPE_MODE=test`.
- Add the live-key boot guard.
- Set up Preview environment variables (test keys only).

**Acceptance criteria**
- [ ] CI is green on the branch, and `main` is unchanged unless Jake chooses a merge strategy.
- [ ] The app refuses to boot with any `sk_live_`, `rk_live_` or `pk_live_` key (automated test).
- [ ] A Preview deployment is reachable only with Vercel Authentication.
- [ ] Recommended for Jake: branch protection on `main` (no force-push), since `main` was overwritten once already ([01](01-current-state-audit.md)).

## Phase 1 · Vertical slice: the mug, end to end (2–3 weeks)

**Scope**
1. **Upload a real logo** (SVG, PNG or PDF) using the artwork pipeline in [04 · §5](04-technical-architecture.md#5-artwork-pipeline-upload-once-use-everywhere). The logo then persists across pages.
2. **One mug family.**
   - Recommended for **D7**: Printful **White Glossy Mug, 11 oz** (15 oz as a second size). A live public-catalogue check shows it is UK-fulfillable [V].
   - A black variant is shown **only if a real black SKU is confirmed UK-fulfillable** with a token in Phase 0.
   - It uses one validated GLB with a calibrated cylindrical wrap UV.
   - The exact wrap print-area pixel spec is read from Printful's authenticated printfile endpoint in Phase 0.
3. **Live 3D viewer** with damped orbit and inertia, bounded zoom, keyboard and touch controls, and reduced-motion parity.
4. **Colour and placement:** material variants per real SKU; the supplier's real print areas (e.g. wrap or one side); scale and position in **mm**.
5. **Proof:** a 1:1 flat print area with DPI and transparency checks, the colour caveat, explicit approval, and a **proof PDF** saved with the order line.
6. **Pricing:** computed on the server from supplier cost data plus a margin config, with quantity tiers and VAT shown inc/ex.
7. **Basket and Stripe test checkout:** a server-built Checkout Session, a verified webhook moving the order to `paid` / `payment_pending`, and a delayed-confirmation success page.
8. **Supplier hand-off, dry run:**
   - Generate the print master at the supplier's exact spec (Printful: sRGB PNG at the printfile pixel size [V]).
   - Build the order payload and validate it with **cost estimation and shipping-rate calls only** (Printful v1 `/orders/estimate-costs`, `/shipping/rates` [V]). These create no order.
   - **Create no supplier order, not even an uncharged Printful draft**, without Jake's explicit approval. The submission flag stays off and is tested.

**Acceptance criteria**
- [ ] **A1 Upload safety.** A corpus of at least 15 hostile SVGs (`<script>`, `foreignObject`, `on*` handlers, external `href`, CSS `url()`, entity bombs) is neutralised or rejected. Files whose magic bytes don't match are rejected. Files over 25 MB are rejected on both client and server.
- [ ] **A2 Logo fidelity.**
  - Aspect ratio is preserved within 0.5%.
  - Transparency is preserved on white and black mugs.
  - The preview never shows a regenerated or redrawn logo.
  - On an sRGB test chart, preview colour is within ΔE00 ≤ 2 of the source file.
- [ ] **A3 Geometry truth.**
  - The GLB passes glTF-Validator with 0 errors and is ≤ 1.5 MB.
  - Wrap UV stretch is under 1%.
  - A logo set to 50 mm wide measures **50 ± 1 mm** on the proof and in the print-master metadata.
- [ ] **A4 Feel and performance.**
  - Damped orbit with inertia; zoom and polar clamps.
  - Keyboard rotate, zoom and reset.
  - One WebGL context.
  - 60 fps on desktop and ≥ 30 fps on the reference phone.
  - Product page LCP ≤ 2.5 s (lab, mid-tier mobile profile).
- [ ] **A5 Proof gate.**
  - Add-to-basket is impossible without approval.
  - The proof PDF hash is stored with the order line.
  - The proof shows physical size, print area, DPI status and the colour caveat.
- [ ] **A6 Server-trusted totals.**
  - A tampered client price or quantity is ignored, and the server recomputes it (automated test).
  - Tier, VAT and shipping maths have unit tests.
- [ ] **A7 Stripe test.**
  - The session is created server-side with `price_data`.
  - The signature is verified on the raw body.
  - The same event replayed 3× causes exactly 1 state change.
  - Card success, decline and 3DS cards behave as expected.
  - A delayed method (Bacs test) holds the order `payment_pending` and then moves it to `paid`.
  - An expired session leaves the order `expired`.
  - A refund in test mode works.
- [ ] **A8 Supplier dry run.**
  - The print master matches the supplier's print-area pixel size and DPI.
  - The payload is validated.
  - **0 supplier orders are created** (asserted by test and log).
- [ ] **A9 Accessibility.**
  - axe-core reports no serious or critical issues.
  - The whole flow can be completed by keyboard alone.
  - The viewer, price changes and checks are announced to screen readers.
- [ ] **A10 Evidence.** A Playwright end-to-end recording of the full flow on Preview, plus a test report, is committed to the branch.

## Phase 2 · Hero, grid and the trade route (2–3 weeks)

**Work**
- **Hero:** Concept A's engine (mug first, then pen and bottle once their models validate).
- **Concept B plate test:** one GPT Image plate via OpenArt, **after Jake approves the spend**.
- **Grid:** the render-pass pipeline and UV-pass compositing, so the customer's logo appears on every slice product without per-card WebGL ([04 · §4](04-technical-architecture.md#4-grid-thumbnails-without-a-webgl-context-per-card)).
- **Pen and water bottle as trade products via the Laltex route** ([05 · Laltex](05-commerce-and-suppliers.md#laltex)), with **no Laltex API assumed**. The route is configurator → proof → **Request a trade quote** → quote record → a supplier-ready brief for manual ordering → Stripe Quote/Invoice tested in a sandbox.

**Acceptance criteria**
- [ ] Hero: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Fully reversible on native scroll with no scroll-jacking. The reduced-motion version shows the same information with no scrub.
- [ ] Grid: once the logo is processed, every compatible slice product shows it within 300 ms (cached), with 0 extra WebGL contexts.
- [ ] Trade quote: the brief contains supplier product code, quantity, colours, print method and position, artwork master, proof PDF, delivery postcode and requested date. **No call is made to any Laltex endpoint** unless documented access has been granted.
- [ ] Every campaign image has a provenance record and a signed-off fidelity checklist.

## Phase 3 · T-shirt, flat print, catalogue scale (3–4 weeks)

**Work**
- T-shirt as POD, with front and back placements.
- Flat print / POS. The supplier is still open (**D8**).
- Supplier adapters with scheduled, versioned catalogue sync.
- 30–60 SKUs, each with a mesh-sourcing and licence record. The honest fallback covers any SKU without a validated mesh.
- Filters, search and sort, and lead times from supplier data.

**Acceptance criteria**
- [ ] Sync is idempotent. A supplier change to a print area or cost creates a **new mapping or price version**, and existing orders keep theirs.
- [ ] Every displayed lead time, MOQ and price traces to a stored supplier snapshot.
- [ ] Every 3D model in production has a licence record. Any SKU without one uses the labelled fallback.

## Phase 4 · Commerce hardening (2–3 weeks)

**Work**
- Shipping rules.
- VAT treatment confirmed by Jake's accountant (promotional printed goods are not clear-cut; see [05](05-commerce-and-suppliers.md)).
- Mixed-supplier split orders.
- Cancellation and refund flows.
- Daily reconciliation (Stripe ↔ orders ↔ supplier charges).
- Transactional email (provider to be chosen; nothing is sent until approved).
- Ops console and monitoring.
- Legal pages: T&Cs (for personalised goods, the cancellation-right position must be confirmed by a legal adviser), privacy notice (artwork retention), cookies, and company trading disclosures.

**Acceptance criteria**
- [ ] Reconciliation balances over a 50-order synthetic test set covering split, refunded, disputed and expired orders.
- [ ] Failure injection passes: supplier 5xx and timeouts, webhook delay and reordering, and a duplicate submission produce no double order and no lost order.

## Phase 5 · Launch readiness (each step gated by Jake's explicit approval)

- Final content and campaign art, SEO and analytics, a security review, a performance audit.
- **Live Stripe activation**, done by Jake.
- **Real supplier submission enabled.**
- **Domain cutover:** replace the leftover Shopify DNS at 123-reg with Vercel records. The exact record changes are reviewed first.
- MX, SPF and DMARC set up for the chosen mailbox provider.

**Acceptance:** a go/no-go checklist signed by Jake.

## Recommended first slice (summary)

> **Mug, end to end, in test mode.** It is the product that best proves the hardest promise: a true UV wrap that rotates convincingly and matches the printed proof to the millimetre. Both POD suppliers offer it, so the supplier stays swappable behind the adapter. And it is the centrepiece of every hero concept. Pen and bottle follow in Phase 2 as the first **trade (Laltex) quote** products. T-shirt and flat print follow in Phase 3.
