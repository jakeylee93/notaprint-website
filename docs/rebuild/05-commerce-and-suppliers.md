# 05 · Commerce and suppliers (proposal grounded in verified supplier facts)

Supplier facts carry **[V]** (verified), **[3P]** (third-party), **[U]** (unclear) or **[NF]** (not found). Their sources are in [07 · Research notes](07-research-notes.md). Everything else is a design proposal. **No legacy prices are reused.** Every figure below comes from current supplier sources, or is marked as an example.

## 1. Two ways to order (the old "Express vs Bespoke", revalidated)

| | **Made to order** (was "Express") | **Trade quantities** (was "Bespoke") |
|---|---|---|
| Suppliers | Printful (**slice: White Glossy Mug, UK-fulfilled** [V]), Printify (alternative POD with UK providers) | Laltex group: Pencom pens, Laltex Promo drinkware (**bottle**: Printful has no UK-fulfilled bottle [V]), Bags HQ, Fast Fit clothing |
| Quantity | From 1 | Per-product MOQ. Public catalogues show about 25 for merch, pens and bags, and 10 for clothing [V] |
| Price shape | Higher unit price; supplier cost plus margin; our own small-quantity tiers | Supplier price breaks (e.g. merch 250/500/1,000, pens 500/1,000/2,500, clothing 50/100/250 [V]) plus **origination/set-up per colour per position** [V] |
| Integration | Server-side REST APIs | **Manual quote route first.** Laltex publishes no public API [NF]; a feed exists only behind a trade account [3P] |
| Proof | Automatic proof generated from the print master | Our proof, then the supplier's confirmation |
| Payment | Stripe Checkout (cards, plus Bacs or Pay by Bank) | Stripe **Quote → Invoice** (card or UK bank transfer) after the proof is agreed |
| Lead time | From supplier data (e.g. Printify `handlingTime`) [V] | **"Confirmed at proof."** Laltex publishes no standard lead times [NF] |

The old site's figures ("3–5 day delivery", "2–3 week lead time", 50/100/500 tier prices) were placeholders and **are dropped**.

## 2. Supplier facts that shape the design

**Printful** [V]
- API v1 is stable. **v2 is "2.0.0-beta" (Open Beta, production-usable)**.
- Private Bearer tokens or OAuth. Store type "Manual order platform/API". Rate limit 120 requests per 60 s.
- **Orders are drafts until confirmed, and are charged only on confirmation.** Cost estimation exists: v1 `/orders/estimate-costs` (synchronous) and v2 estimation tasks.
- `external_id` is unique per store (v1, 32 characters).
- **v2 webhooks are HMAC-signed** (`x-pf-webhook-signature`). v1 webhooks are unsigned. Retries run at 1, 4, 16, 64, 256 and 1024 minutes.
- **UK fulfilment** comes from a West Midlands facility.
  - A live public-catalogue check shows the **White Glossy Mug 11 oz and 15 oz is UK-fulfillable** (20 oz is not).
  - The Bella+Canvas 3001 tee is UK-fulfillable for 242 of 628 variants.
  - **None of the 4 water bottles lists the UK.**
- Prices can be returned in GBP. Billing in GBP is possible. **No minimum order.** A bulk discount applies automatically from 25 units.
- **No 3D models through the API.** Mockups and templates may only be used for Printful-fulfilled products. Mockup URLs expire, so we keep our own copies.
- Exact print-area pixel specs (e.g. the mug wrap) need an authenticated call [NF publicly]. Retrieving them is a Phase 0 task once a token exists.

**Printify** [V]
- REST v1 with a Personal Access Token valid for 1 year. Server-side only (no CORS).
- **No sandbox.**
- **New stores send orders to production automatically after 24 h** unless approval is set to *Manual*.
- Costs appear only on products and orders, not in the catalog.
- On-the-fly order lines are flagged for deprecation.
- Mockups may only be used to sell Printify-fulfilled products.
- Webhooks are signed with HMAC (`X-Pfy-Signature`); failed deliveries retry 3 times and then the webhook is blocked for 1 h.
- UK-based print providers exist (e.g. Harrier, Shirt Monkey, Print Clever, T shirt and Sons).

**Laltex** [V/3P]
- Trade-only, for "Resellers of Promotional Merchandise". Pricing is authorised after portal sign-up, and a credit account needs a company number, VAT number, a bank reference and two trade references.
- **No public API or feed.** Zigaflow documents live product, availability and price feeds that need an API key from Laltex [3P].
- Artwork must be "fully editable EPS" plus Pantone references. Delivered quantity can vary by ±10%. Quotes lapse after 30 days.
- **Images are copyright, with no public reseller licence.**

**Gap: flat print and POS / large format.** Banners, pull-ups, menus and table talkers are not confirmed with any of the three suppliers. → **Decision D8**: a UK trade printer partner (quote route), or keep only posters and prints from a POD supplier.

## 3. Normalised catalogue model

| Entity | Key fields |
|---|---|
| `product` | Our canonical item: slug, name, category, specs (mm, ml, material), `model_asset_id?`, `fallback_photo_id`, status |
| `product_variant` | colour name and hex, size, active. **One row per real SKU colour.** |
| `supplier` | `printful` · `printify` · `laltex` · `manual`; type `pod`/`trade` |
| `supplier_offer` *(versioned)* | Supplier product, variant and provider refs; techniques; MOQ and quantity step; `cost_tiers[]`; `setup_costs[]` (per colour/position); currency; lead time (or `confirm_at_proof`); stock status; `source_snapshot_id`; valid from/to |
| `print_area` *(versioned)* | Canonical placement (`wrap`, `front`, `back`, `barrel`, `left_chest`…); width/height/safe area in mm; techniques; max colours; `uv_island`, `mm_per_uv`, mask |
| `print_area_mapping` *(versioned)* | Links a print area to a supplier placement code. Holds the supplier's pixel size, DPI and file spec (format, colour space), plus offsets. |
| `model_asset` / `licence` | GLB URL and version, validation report, budgets. Licence holds source, type, terms URL, permitted real-time web use, expiry and proof document. |
| `price_rule` *(versioned)* | Margin %, minimum £ margin, POD premium, rounding, tax code, shipping rule |
| `price_quote` *(immutable)* | Variant, quantity, placements, colours, unit and total (ex/inc VAT), snapshot IDs of every input, expiry |
| `artwork` · `design` · `proof` | Upload with its derived files and checks. Placement per print area in mm. **Immutable proof PDF hash** and approval record. |
| `order` · `order_line` · `fulfilment` | Each line points at its `price_quote`, `proof` and `supplier_offer` version. One fulfilment per supplier. |
| `payment` · `refund` · `webhook_event` · `outbox` · `quote_request` | Stripe objects mirrored. Webhook events deduped (unique source + event ID). Supplier submissions in an outbox (unique order + supplier). Trade quote requests. |

**Versioning rule.** When a supplier changes a cost, print area or file spec, the sync writes a **new version**. Existing baskets, quotes and orders keep the version they were priced and proofed against.

## 4. Pricing: computed on the server, never trusted from the client

```
unit_sell(q) = round_price( (unit_cost(q) + print_cost(q) + setup_total / q) × (1 + margin) + pod_premium )
```

- `unit_cost(q)` comes from the supplier tier valid at that time, converted from USD to GBP with a stored FX snapshot plus a buffer if the supplier bills in USD.
- `setup_total` is the trade origination/set-up charge, spread over the quantity.
- `round_price` is a policy choice (**D11**).
- Prices are shown **inc VAT for consumers** with an **ex VAT toggle for trade**. The VAT treatment needs an accountant (promotional printed goods are not clear-cut [U]). Stripe Tax only calculates where a UK VAT registration is configured [V] (**D12**).
- Every price shown is a `price_quote` row. Checkout **re-prices on the server**. If the price changed, the customer is asked to re-confirm, and **a client-supplied amount is never used**.

## 5. Order routing and splitting

- **Made-to-order lines** go to instant checkout. Each POD supplier becomes its own fulfilment, so the customer sees **one order with several shipments**.
- **Trade lines** become a **quote request** (not an instant charge) until firm trade prices exist.
- A mixed basket checks out its POD part and creates a linked trade quote, both shown in one order view.
- Shipping policy (flat, free over a threshold, or per fulfilment) is **D11**.

## 6. Payments: Stripe test-mode design

Built against `stripe@23` with **`apiVersion: '2026-09-30.endive'`** [V].

**Environments and keys**
- General **sandboxes** `dev` and `ci` [V].
- Restricted keys per service [V]:
  - web: Checkout Sessions write;
  - ops: PaymentIntents, Refunds, Invoices and Quotes write;
  - webhook: read.
- A **boot guard** rejects any key not containing `_test_` and ignores events with `livemode: true`.

**Creating the session** (server-side only [V])
- `ui_mode: 'hosted_page'` [V] (`'elements'` later if an embedded design is wanted), `mode: 'payment'`, `currency: 'gbp'`.
- `line_items[].price_data`:
  - `unit_amount` comes from the stored `price_quote`;
  - `tax_behavior: 'inclusive'`;
  - `product_data` carries `tax_code` and `metadata` (SKU, order line).
- `automatic_tax` (meaningful once a VAT registration exists).
- `shipping_address_collection: ['GB']` and up to 5 fixed `shipping_options` [V].
- `tax_id_collection` for trade buyers.
- `client_reference_id` and `metadata.order_id` set to our order ID. `expires_at` one hour out.
- Idempotency key `cs:{orderId}:{cartHash}` [V].
- **No** `adjustable_quantity` and **no** `payment_method_types` (removed in endive [V]).
- The expected `amount_total` is stored and asserted on completion.

**Order state machine**
```
draft → awaiting_payment → paid | payment_pending | authorized → submitted_to_supplier → fulfilled
                         ↘ payment_failed | expired | auth_canceled
paid → partially_refunded | refunded | refund_failed | disputed → dispute_won | dispute_lost
```
Every transition is a conditional update (`WHERE status = expected`).

**Webhooks** at `/api/stripe/webhook` (Node runtime)
1. Verify with `constructEvent(await req.text(), sig, secret)` [V].
2. Insert into `webhook_event`, ignoring duplicates (`ON CONFLICT DO NOTHING`) [V].
3. Enqueue the work and return 200 immediately.
4. A worker runs an idempotent `fulfillCheckout(sessionId)`. The success page calls the same function, which covers a slow webhook ("Confirming your payment…").

**Which event moves which state** [V]

| Event | Effect |
|---|---|
| `checkout.session.completed` | Re-fetch the session: `paid`, `payment_pending` (async) or `authorized` |
| `checkout.session.async_payment_succeeded` / `failed` | → `paid` / `payment_failed` |
| `checkout.session.expired` | → `expired` |
| `refund.updated`, `refund.failed` | Refund states |
| `charge.dispute.created` / `closed` | Pause, then resolve, supplier work |

**Supplier submission** goes through the outbox with `external_id` set to our order-line ID. Printify rejects duplicates with 409/8503 [V]. **The flag stays OFF until launch approval.** Before any real use, set Printify approval to *Manual* [V].

**Trade quotes**
1. Stripe Quote, then accept, which creates a draft Invoice [V].
2. `send_invoice` with card plus `customer_balance` (UK bank transfer) [V].
3. `invoice.paid` triggers a manual purchase order in the Laltex portal.
4. Quotes need Invoicing Plus in live mode, but **work in a sandbox** [V].

**Refunds** use idempotent keys (`refund:{orderId}:{n}`). Bacs payments are refunded only after they settle [V].

**Reconciliation.** A daily job matches balance transactions (`reporting_category`) to orders by `metadata.order_id`, and supplier charges by `external_id`. Mismatches are reported.

**Test matrix** [V]
- Cards: 4242… (success), 4000002760003184 (3DS), 4000000000009995 (decline), 4000000000005126 (refund fails later).
- Bacs: sort code 108800 with 90012345, 92222227, 55555559.
- Pay by Bank: authorise and fail buttons.
- Bank transfer: `fund_cash_balance`.
- Disputes: 4000000000000259 with winning or losing evidence.
- Duplicates: `stripe events resend`.
- Expiry: a 30-minute `expires_at`.

<a id="laltex"></a>

## 7. Laltex route (no invented API)

**Now (Phases 1–2): manual and honest**
1. Jake's team selects a small set of Laltex products, for example Pencom **TPC444501** Bamboo Basic Ball Pen and a Laltex Promo bottle.
2. **Product data:**
   - Print areas in mm are taken from the public catalogue [V].
   - Methods, MOQ and price breaks come from the **trade portal once Jake's account is authorised**. Nothing is scraped and no gated prices are extracted.
   - Lead time is shown as "confirmed at proof".
3. **Images.** Use our own renders from validated models, or **Laltex images only with written permission** [V: copyright]. The four legacy Laltex photos are withdrawn until then.
4. **Customer flow:**
   1. Configure (3D where a validated mesh exists, otherwise the labelled fallback).
   2. Proof.
   3. **Request a trade quote** (quantity, colours, method, position, delivery postcode, date needed).
   4. A quote record is created.
   5. Ops price it using the portal and send a Stripe Quote.
   6. The customer accepts and pays the invoice.
   7. Ops place the order in the Laltex portal and relay Laltex's proof if one is issued.
5. **Artwork:**
   - Laltex requires editable EPS [V]. Vector uploads (SVG/PDF) are converted deterministically to EPS/PDF for the supplier, with the original kept.
   - **Raster-only logos trigger an artwork request.** They are never auto-traced or redrawn by AI.

**Later (Phase 3+), only if Laltex grants access**
- Ask Laltex for an API key plus documentation (format, fields, stock, price tiers, print areas, set-up charges, lead times, update cadence, whether orders can be placed). Then build a `laltex` adapter: nightly products and prices, more frequent stock, CSV/email fallback.
- Back-office tools that already connect to Laltex (Zigaflow [3P]; PrintXpand [3P, low confidence]) are options to evaluate, not assumptions.

## Sources

Every [V]/[3P] above links to its source in [07 · Research notes](07-research-notes.md): Stripe (A), Printify (B), Laltex (C), upload pipeline (D), Printful (E).
