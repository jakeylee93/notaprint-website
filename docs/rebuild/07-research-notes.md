# 07 · Research notes (verified facts and sources)

Condensed findings from six read-only research lanes run on 10 Oct 2026. They used official documentation and public pages only, with no sign-ups, logins, tokens or orders.

**Labels**
- **[V]** verified against the cited source.
- **[3P]** verified on a third-party site.
- **[U]** unclear, or the sources conflict.
- **[NF]** not found.

Anything without a label is a proposal. Prices and plan figures change often, so re-check them before relying on them.

---

## A. Stripe (test-mode design)

**What has changed in Stripe recently**
- [V] The latest API version is **`2026-09-30.endive`**. stripe-node 23.0.0 pins it, and Node 20 is the minimum.
- [V] Checkout's `ui_mode` values were renamed in `2026-03-25.dahlia`. The new values are `hosted_page`, `embedded_page`, `elements` and `form`. The old values (`hosted`, `embedded`, `custom`) now fail.
- [V] The endive version removes `payment_method_types` from Checkout and PaymentIntent create calls. Use Dashboard dynamic payment methods, `payment_method_configuration`, or `allowed_` / `excluded_payment_method_types` instead.
- [V] The old test mode is now called the "test mode sandbox". Stripe says: "For new integrations, use a general sandbox."
- [V] Thin events are recommended for new integrations.

**Integration and webhooks**
- [V] Stripe recommends Checkout Sessions with the Payment Element over raw PaymentIntents for most integrations.
- [V] Sessions must be created server-side. Use `price_data` for dynamic prices. Stripe computes `amount_total` itself.
- [V] To verify a webhook, pass the **raw body** to `constructEvent(await req.text(), signature, secret)`. The default tolerance is 300 s.
- [V] Duplicate events are possible, so dedupe on event ID and also on object ID plus type. Event order is not guaranteed.
- [V] Retries run for up to 3 days in live mode, and 3 times over a few hours in sandboxes.
- [V] Hosted Checkout waits up to 10 s for the `checkout.session.completed` acknowledgement.
- [V] Idempotency keys can be up to 255 characters and may be pruned after 24 h. Reusing a key with different parameters returns an error. Derive keys from the cart or order ID.

**UK payment methods**
- [V] Bacs Direct Debit confirms in about 4 business days (up to 7 with a new mandate). It has no manual capture, and its disputes are final. Handle three events: `completed`, `async_payment_succeeded` and `async_payment_failed`.
- [V] Pay by Bank covers £0.50–£10,000 with no disputes. [U] The docs disagree on whether notification is immediate or delayed, so code for both.
- [V] Bank transfers (`customer_balance`) require a `customer`. Simulate them in tests with `test_helpers/customers/{id}/fund_cash_balance`.

**Manual capture**
- [V] Card authorisations last 7 days for customer-initiated payments, and about 4 days 18 hours for Visa merchant-initiated payments.
- [V] Capture with `amount_to_capture`. An uncaptured payment cannot be refunded, only cancelled.
- [V] Since `2025-09-30.clover`, Checkout supports a per-method `capture_method`.

**Tax and B2B**
- [V] Stripe Tax collects only where you have an **active registration**; without one, the tax calculation returns zero.
- [V] Stripe Tax does not support goods sold to or from Northern Ireland.
- [V] Tax codes include: Clothing `txcd_30011000`, Printing `txcd_20090028`, General goods `txcd_99999999`, Shipping `txcd_92010001`.
- [V] HMRC: the standard rate is 20%. Young children's clothing is zero-rated; adult clothing is standard-rated. Brochures and leaflets are zero-rated; posters are standard-rated. The registration threshold is £90,000.
- [U] The VAT treatment of promotional printed goods is not clear-cut. **An accountant must confirm it.**
- [V] Quotes need Invoicing Plus in live mode but can be tried in a sandbox. Accepting a quote creates a draft invoice.
- [V] Invoices can be sent (`send_invoice`) with net terms, and `customer_balance` gives each customer a UK virtual bank account.
- [V] Payment Links don't support quotes or bank transfers.

**Testing and compliance**
- [V] Test cards:
  - 4242424242424242 succeeds.
  - 4000002760003184 always requires 3DS.
  - 4000000000009995 is declined.
  - 4000000000005126 makes the refund fail later.
- [V] Bacs test sort code 108800, with account numbers 90012345 (succeeds), 92222227 (fails) and 55555559 (succeeds, then disputed).
- [V] Checkout and Elements qualify for PCI SAQ A. Use restricted keys, with one per service.

**Sources**
- https://docs.stripe.com/sandboxes
- https://docs.stripe.com/testing
- https://docs.stripe.com/keys/restricted-api-keys
- https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison
- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/changelog
- https://docs.stripe.com/changelog/dahlia/2026-03-25/updates-available-checkout-session-ui-modes
- https://docs.stripe.com/checkout/fulfillment
- https://docs.stripe.com/webhooks
- https://docs.stripe.com/webhooks/signature
- https://docs.stripe.com/event-destinations
- https://docs.stripe.com/api/idempotent_requests
- https://docs.stripe.com/payments/bacs-debit
- https://docs.stripe.com/payments/pay-by-bank
- https://docs.stripe.com/payments/bank-transfers
- https://docs.stripe.com/payments/place-a-hold-on-a-payment-method
- https://docs.stripe.com/refunds
- https://docs.stripe.com/tax/supported-countries/europe/united-kingdom
- https://docs.stripe.com/tax/tax-codes
- https://docs.stripe.com/quotes
- https://docs.stripe.com/invoicing/bank-transfer
- https://docs.stripe.com/reports/payout-reconciliation
- https://docs.stripe.com/cli/listen
- https://stripe.com/guides/pci-compliance
- https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts
- https://www.gov.uk/guidance/rates-of-vat-on-different-goods-and-services
- https://www.gov.uk/register-for-vat

## B. Printify

**Basics**
- [V] The base URL is `https://api.printify.com/v1/`. A v2 exists, but so far it only covers catalogue shipping.
- [V] Single-merchant access uses a **Personal Access Token**, valid for 1 year, with scopes. Multi-merchant platforms use OAuth 2.0; those access tokens last 6 h.
- [V] **The API does not support CORS**, so it is server-side only.
- [V] Rate limits:
  - 600 requests/min overall.
  - Catalog endpoints: 100/min.
  - Publishing: 200 per 30 min.
  - Errors must stay under 5% of requests.
- [NF] **There is no sandbox or test mode.**
- [V] The same API also serves a "Printful Enterprise" brand.

**Catalog and products**
- [V] The catalog is organised as blueprint → print providers → variants. Each variant has `placeholders[]` giving position, decoration method and pixel size.
- [V] **Costs are not exposed in the catalog.** `cost` only appears on product variants and order lines.
- [V] Shipping profiles cover GB. v2 also returns per-method `handlingTime`.
- [U] Currency: every example is in USD.
- [V] Orders can be created with **on-the-fly line items** (blueprint + provider + variant + print areas). The docs flag this route for **future deprecation**, and those products skip the standard quality check.
- [V] Mockups are returned on the product's `images[]`. **The terms restrict mockups to selling Printify-fulfilled products.** The Mockup Library is not available to "API stores".

**Uploads and orders**
- [V] Uploads accept PNG/JPG by URL or base64. Base64 over 5 MB is being dropped.
- [V] `external_id` must be unique; a duplicate returns **409 / 8503**.
- [V] Shipping methods: 1 standard, 2 priority, 3 express, 4 economy. Express and economy are US-only.
- [V] **New stores send orders to production automatically after 24 h.** To keep control, set approval to **Manual**.
- [V] An order can only be cancelled while it is `on-hold` or `payment-not-received`.

**Webhooks**
- [V] Events cover order, shipment and product changes.
- [V] If you set a secret, each request carries an HMAC-SHA256 signature in **`X-Pfy-Signature: sha256=…`**.
- [V] Failed deliveries are retried 3 times; after that the webhook is blocked for 1 h.
- [V] Payloads are thin, so you must refetch the order.

**Store type**
- [V] An "API" store type is supported for headless storefronts.

**UK**
- [V, marketing pages] UK-based providers listed: Harrier (Devon), Shirt Monkey, Print Clever, T shirt and Sons, Personalized Luggage (Leeds). Prodigi and Printful have UK sites.
- [V] Printify charges VAT on orders shipped to the UK. Goods sent from outside the UK and worth over £135 are not charged VAT by Printify; the recipient pays it instead.
- [V] Misprints and damaged items are reprinted or refunded if reported within 30 days. Placement tolerance is 0.5″.

**Plans and discounts**
- [V] Premium costs from £29/month or £265/year and gives up to 20% off.
- [V] Volume discounts run from 5% to 46%, typically from 51+ units.

**Sources**
- https://developers.printify.com/
- https://developers.printify.com/openapi.json
- https://printify.com/terms-of-service/
- https://printify.com/api-terms/
- https://printify.com/shipping-rates/
- https://printify.com/print-on-demand/uk/
- https://printify.com/custom-t-shirts/uk/
- https://printify.com/blog/new-printify-premium/
- Help centre articles under https://help.printify.com/hc/en-us/articles/:
  - 4483626447249 (tokens)
  - 4483629894289 (on-the-fly products)
  - 4483630572945 (API store)
  - 24481539677201 (Mockup Library)
  - 7435676870545, 21722692229649 (express and economy)
  - 4483617936657 (print files)

## C. Laltex (trade bulk)

**Who can buy**
- [V] Laltex is **trade-only**. Its site says it supplies "Resellers of Promotional Merchandise", and its resources are "only available to approved account holders".
- [V] After you register on the portal, pricing is authorised within about 24 h.
- [V] A credit account asks for company number, VAT number, directors, a bank reference, two trade references and a credit limit. "Web-based distributor" is one of the account types.
- [NF] No BPMA or similar membership is required.

**Brands and premises**
- [V] Brands:
  - Laltex Promo: drinkware and lunchware.
  - **Pencom**: pens, with codes starting TPC.
  - Bags HQ.
  - Source It.
  - **Fast Fit Promo**: clothing and headwear.
  - Promo Seeds.
  - Branding Studio.
- [V] HQ is in Leigh, WN7 3XH, with UK warehousing and in-house branding using 15+ techniques.

**Data access**
- [NF] **There is no public API, data feed or developer documentation** on laltex.com or laltextrade.com.
- [3P] A Zigaflow release note (18 Nov 2025) says it "Adds live product, availability, and price feeds for five Laltex Group suppliers", using an **API key obtained from Laltex**. That means an API exists behind the trade account, but its format and fields are not published.
- [3P, low confidence] PrintXpand advertises a Laltex connector, but its page still contains "[verify scope]" placeholders.
- [V] The trade portal (gated) offers quotes, images, templates, stock and samples.

**Images**
- [NF] There is no public image licence for resellers. [V] The laltex.com terms say its pictures are copyright and must not be copied or reproduced without permission.
- [3P] Images on `laltex-extranet.co.uk` can be fetched without logging in, but **being reachable is not permission to use them.**

**Catalogue, MOQs and charges** (from public, unbranded catalogues)
- [V] MOQs and price tiers:
  - Merch and bags: MOQ about 25, tiers around 250/500/1,000.
  - Pens: MOQ 25 (some 500), tiers around 500/1,000/2,500.
  - Clothing: MOQ 10, tiers around 50/100/250, with one embroidery position included.
- [V] Prices include one-colour print in one position. **Origination and set-up are charged per colour per position.**
- [V] Delivered quantity can vary by ±10%, and quotes lapse after 30 days.
- [U] Carriage: the catalogue and the terms conflict. [NF] No standard lead times are published; lead times are per product (e.g. "5 days" or "4–6 weeks").

**Artwork and payment**
- [V] Artwork must be "**fully editable EPS** format for Adobe Illustrator"; scanned artwork is not accepted. Pantone references are supplied, and "100% match cannot be guaranteed".
- [V] Payment is in cleared funds before delivery, or within 30 days on an approved credit account.

**Legacy image matches**
- [V] Four legacy site images match Laltex photography: **QB1018**, **RC0201**, **TPC550001** and **TPC444501**.

**Sources**
- https://www.laltextrade.com/
- https://www.laltextrade.com/Account/Register
- https://laltex-extranet.com/tradeaccount/?source=PRO
- https://laltex-extranet.com/tradeaccount/docs/Terms_of_Trading_for_InvoiceV5.htm
- https://www.laltex.com/promo/ (and its brand subpages)
- https://www.laltex.com/company/about-us/history/
- https://www.laltex.com/company-policies/terms-conditions/
- https://www.laltex.com/news/promo-ai-visuals-laltex-trade/
- https://www.salescat.co.uk/tpmg
- https://www.salescat.co.uk/tpbg
- https://www.salescat.co.uk/tppguide
- https://salescat.co.uk/tpcg
- https://www.zigaflow.com/release-notes/18th-november-2025
- https://www.printxpand.com/px-connect/suppliers/laltex/

## D. Upload and artwork pipeline (Vercel, Next.js, security)

**Vercel limits and storage**
- [V] Vercel Function request and response bodies are capped at **4.5 MB**; larger ones get a 413. Use **Blob client uploads**, and authenticate in `onBeforeGenerateToken`.
- [V] `onUploadCompleted` is retried 5 times and does not fire on localhost.
- [V] **Private Blob** has been GA on all plans since 30 Jun 2026, delivered through your own Function via `get()`.
- [V] Signed URLs last at most 7 days.
- [V] A store's region can't be changed after creation. `lhr1` is London.
- [V] Hobby Blob quotas are 1 GB and 2,000 advanced operations.
- [V] **The Hobby plan is for non-commercial personal use only.** Max function duration is 300 s on Hobby, and 800 s on Pro.

**SVG security**
- [V] An SVG used through `<img>` can't run scripts, but the same file opened directly or embedded via `<iframe>`/`<object>` can. OWASP covers XXE and billion-laughs attacks, and says to reject DOCTYPE.
- [V] DOMPurify needs an up-to-date **jsdom** on the server. Its SVG profiles strip `script`, `foreignObject` and `use` by default, but it is not a CSS sanitiser.
- [V] librsvg, the engine sharp uses, does no scripting and loads no http resources. A CVE before 2.56.3 could leak local files; sharp's libvips ships librsvg 2.63.2.
- [V] resvg-js 2.6.2 pins resvg 0.34 (the current crate is 0.48.1), and its default resolver reads local filesystem paths.

**Raster and PDF handling**
- [V] sharp exposes `metadata()` (density, hasAlpha, ICC) and `stats().isOpaque`. Its prebuilt binaries **can't read PDF**.
- [V] pdf.js CVE-2024-4367: `isEvalSupported` allowed JavaScript execution in versions ≤ 4.1.392. pdfjs-dist 6.4.299 needs Node ≥ 22.13.
- [V] MuPDF.js is AGPL-3.0.

**Supplier file guidance (Printful)**
- [V] Use 300 DPI for paper and 150 DPI for other products; avoid going under 150 or over 600.
- [V] Use PNG for transparency, in sRGB IEC61966-2.1, with a 200 MB maximum. Avoid PDFs.
- [V] Converting sRGB to CMYK can shift colours.

**Next.js**
- [V] Server Actions accept 1 MB bodies by default.
- [V] The Edge runtime is deprecated; Node is the default.
- [V] `next/image` blocks SVG unless you enable it, with `contentDispositionType: 'attachment'` and a sandbox CSP.

**Privacy**
- [V] The UK GDPR sets no fixed retention periods, but you need a policy, periodic review, and support for erasure.
- [V] PECR's strictly-necessary exemption covers basket and session cookies.

**Sources**
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/vercel-blob/client-upload
- https://vercel.com/docs/vercel-blob/private-storage
- https://vercel.com/changelog/vercel-private-blob-is-now-generally-available
- https://vercel.com/docs/vercel-blob/vercel-signed-urls
- https://vercel.com/docs/vercel-blob/usage-and-pricing
- https://vercel.com/docs/regions
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/fluid-compute
- https://vercel.com/kb/guide/user-uploaded-files-vercel-sandbox-and-blob
- https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image
- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html
- https://github.com/cure53/DOMPurify
- https://gnome.pages.gitlab.gnome.org/librsvg/Rsvg-2.0/class.Handle.html
- https://nvd.nist.gov/vuln/detail/CVE-2023-38633
- https://github.com/thx/resvg-js
- https://sharp.pixelplumbing.com/api-input
- https://sharp.pixelplumbing.com/install
- https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq
- https://www.printful.com/graphics-and-embroidery-guide
- https://www.printful.com/create-digital-print-file
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- https://nextjs.org/docs/app/api-reference/components/image
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/
- https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/

## E. Printful

Labels used here: **[V]** verified on an official page, a spec, or a live unauthenticated public `GET`. **[V\*]** official help-centre wording seen only in search extracts (help.printful.com returns 403 to direct fetches).

**Versions and access**
- [V] v1 is still maintained. **v2 is "2.0.0-beta" (Open Beta)**, and its endpoints "can be used in a production environment" but may change slightly.
- [V] v2 has no sync products or templates. To cancel an order, use v1 `DELETE /orders/{id}`, because v2 `DELETE` deletes the order instead.
- [V] Private Bearer tokens can be store-level or account-level (account-level needs `X-PF-Store-Id`). OAuth access tokens last 1 h and refresh tokens 90 days.
- [V] Store type is "Manual order platform/API".
- [V] Rate limits:
  - v1: 120/min.
  - v2: a leaky bucket of 120 per 60 s.
  - Shipping rates drop to 5/min for requests with more than 100 items.

**Catalog**
- [V] Live check: the v1 catalog is public and returned 564 products. The v2 catalog returns 401 (OAuth required).
- [V] v2 `catalog-products` can filter by `selling_region_name=uk`, and has per-product variants, `/prices` (`currency=GBP`), `/availability` and `/mockup-templates`.
- [V] Stock states are per region and technique.
- [V] UK fulfilment, from a live v1 check:
  - **White Glossy Mug 11 oz and 15 oz: yes. 20 oz: no.**
  - Bella+Canvas 3001: 242 of 628 variants.
  - **The 4 water bottles: no UK** (EU/Latvia or US).
- [NF publicly] Exact print-area specs (mug wrap, bottle, tee, embroidery) sit behind auth: v1 `/mockup-generator/printfiles/{id}` and v2 mockup-styles. Example values from the docs: DTG front 1800×2400 px @150 DPI; embroidery chest 1200×1200 px @300 DPI.
- [V] Techniques: dtg, digital, cut-sew, uv, embroidery, sublimation, dtfilm. "Jewelry products are not supported via API."

**Mockups**
- [V] Mockup tasks exist in both versions: v1 create-task then poll, v2 `POST /v2/mockup-tasks` with a `mockup_task_finished` webhook.
- [V] Limits: 2 tasks/min for new stores, 10/min later.
- [U] Image URLs expire after about 1 day, so we store our own copies.
- [V] Templates expose positional data, so you can build your own previews.
- [V] ToS §4: mockups, templates and images may only be used with **Printful's** products.
- [NF] **No 3D models via the API.** The 2022 3D models were Shopify-only [OLD].

**Files**
- [V] Pass file URLs when creating the order. `POST /v2/files` is asynchronous. Re-adding an identical URL returns the old file, so version your URLs.
- [V] Use PNG or JPG and avoid PDF. 150 DPI, or 300 DPI for paper. Maximum 200 MB, in sRGB IEC61966-2.1.

**Orders**
- [V] **Orders are created as drafts and charged only when confirmed** (v1 `/orders/{id}/confirm`; v2 `POST /v2/orders/{id}/confirmation`, blocked while costs are `calculating`).
- [V] Cost estimation: v1 `/orders/estimate-costs` (synchronous) and v2 `/order-estimation-tasks` (asynchronous, results kept 1 h).
- [V] Shipping rates come from v1 `/shipping/rates` or v2 `/shipping-rates` (with min/max days and `customs_fees_possible`). Call them just before ordering, because rates change.
- [V] Statuses: draft, inreview, pending, failed, canceled, inprocess, onhold, partial, fulfilled.
- [V] A draft or pending order can be cancelled with a refund. An order that is inreview or inprocess cannot.
- [V] The ToS cancels orders left on hold for 30 days, and allows "Product alternatives" for out-of-stock items unless you opt out.
- [V] v1 `external_id`: up to 32 characters, unique per store. A duplicate fails with `OR-13 EXTERNAL_ID_IN_USE`. [U] v2 doesn't document uniqueness.
- [V] Branding: per-order packing-slip overrides (logo, message, store name). Custom packing slips are free.
- [V, OLD] Return policy: misprints claimed within 30 days are "covered at our expense".

**Webhooks**
- [V] v2 webhooks are **HMAC-SHA256 signed** (`x-pf-webhook-signature`); **v1 webhooks are unsigned**.
- [V] Events include shipment_*, order_*, catalog_stock_updated, catalog_price_changed and mockup_task_finished.
- [V] Failed deliveries retry after 1, 4, 16, 64, 256 and 1024 min.

**UK**
- [V] "we run a fulfilment centre in Birmingham". [V\*] The help centre names Wolverhampton.
- [V] UK-fulfilled orders: "2–5 business day fulfilment", plus about 2-day domestic delivery. Not guaranteed.
- [V\*] VAT:
  - UK-fulfilled orders carry 20% VAT.
  - Cross-border orders without a UK VAT ID carry 20% under £135, and 0% above that (the recipient pays import VAT).
- [V\*/V] Billing in GBP is supported.

**Pricing**
- [V] **No order minimums.** The Growth plan costs $24.99/month.
- [V] An automatic bulk discount applies at 25+ of the same product in one order. v2 prices expose `discount_tiers`.
- [U] It is unclear whether per-order fees or the discounts apply to API orders.

**Headless**
- [V] "Code an app that connects your custom-built store to Printful", including "products designed on the fly by the end customers".

**Sources**
- https://developers.printful.com/docs/
- https://developers.printful.com/docs/v2-beta/
- https://www.printful.com/api
- https://www.printful.com/pricing
- https://www.printful.com/bulk-orders
- https://www.printful.com/uk/shipping
- https://www.printful.com/uk/print-on-demand
- https://www.printful.com/policies/terms-of-service
- https://www.printful.com/policies/returns
- https://www.printful.com/mockup-generator
- https://www.printful.com/graphics-and-embroidery-guide
- https://www.printful.com/create-digital-print-file
- https://www.printful.com/taxes-guide
- https://www.printful.com/news/printful-launches-3D-product-models
- Public catalog: https://api.printful.com/products (and individual products)
- [V\*] Help centre articles under https://help.printful.com/hc/en-us/articles/ (IDs 360014067239, 5819467115548, 4408221934738, 4402032573586, 23581702148764, 10293184543260, 360014007060)

## F. 3D configurator pipeline

*(Lane still running when this file was first written. Section appended below on completion.)*
