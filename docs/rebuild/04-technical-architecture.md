# 04 · Technical architecture (proposal)

Two rules hold everywhere:

1. **No AI compute for any customer interaction.** Rotation, colour, logo placement, thumbnails and proofs are all deterministic rendering from validated assets.
2. **Separate the preview from the print.** The browser preview is for confidence. The supplier gets a print master generated from the customer's original file.

Facts marked **[V]** have a source in [§12](#12-sources) or [05](05-commerce-and-suppliers.md). Everything else is a design proposal.

## 1. System shape

```
Browser (Next.js RSC pages + one client 3D island)
  ├─ Storefront pages (static/ISR): home, catalogue, product, help
  ├─ Configurator island: R3F canvas (lazy, single instance) + 2D proof view
  └─ Uploads: direct-to-storage client upload (signed token)
Next.js route handlers (Node runtime, Vercel Functions)
  ├─ /api/uploads/token        → issue scoped upload token
  ├─ /api/artwork/:id/process  → validate, sanitise, derive preview + master
  ├─ /api/price                → server-trusted quote for (variant, qty, placement)
  ├─ /api/checkout             → create Stripe Checkout Session from DB prices
  ├─ /api/stripe/webhook       → verify signature, dedupe, enqueue
  └─ /api/suppliers/:p/webhook → verify (e.g. Printify HMAC), dedupe, enqueue
Background jobs (cron + idempotent job table)
  ├─ catalogue sync per supplier (versioned snapshots)
  ├─ render-pass generation for grid thumbnails (offline, per SKU × colour × view)
  ├─ print-file generation per order line (from vector master where available)
  ├─ supplier submission outbox (disabled by flag until launch)
  └─ reconciliation (Stripe ↔ orders ↔ supplier charges)
Data: Postgres (catalogue, orders, events) · Object storage (artwork, print files, GLB, render passes)
```

## 2. Stack (versions checked on npm, 10 Oct 2026)

| Concern | Choice | Version |
|---|---|---|
| App | Next.js App Router, React, TypeScript strict | next 16.4.0 · react 19.3.0 |
| Styling | Tailwind CSS (tokens from [03 · §3](03-design-direction.md#3-type-and-colour-initial-tokens-tested-in-phase-1)) | tailwindcss 4.3.3 |
| 3D | three.js + @react-three/fiber + drei; camera-controls for transitions | three 0.186.1 · fiber 9.8.1 · drei 10.7.9 · camera-controls 3.1.2 |
| Scroll choreography | GSAP ScrollTrigger (scrub on native scroll) | gsap 3.15.0 |
| UI motion | Motion (successor package to framer-motion) | motion 14.1.0 |
| Validation | zod | 4.6.5 |
| DB | Postgres + Drizzle ORM. The provider is open (Neon via the Vercel Marketplace, or Supabase); see **D9**. | drizzle-orm 0.45.4 |
| Storage | Vercel Blob: **private store in `lhr1` (London)** for artwork and print files; public for GLBs and render passes. Private Blob has been GA on all plans since 30 Jun 2026 [V]. | @vercel/blob 2.8.1 |
| Images | sharp (Node runtime only). SVG rasterising goes through **sharp/librsvg from a Buffer**: no scripting, no http loads [V]. DOMPurify on the latest jsdom sanitises SVG. **Not resvg-js:** 2.6.2 pins an old resvg, and its default resolver reads local paths [V]. | sharp 0.35.5 · dompurify 3.4.16 |
| PDF previews | sharp's prebuilt binaries **cannot read PDF** [V]. Use the latest `pdfjs-dist` (never versions affected by CVE-2024-4367) with `@napi-rs/canvas`, or MuPDF in a Vercel Sandbox (AGPL licence implications) | pdfjs-dist 6.4.299 |
| Hosting plan | **Vercel Hobby is non-commercial only** [V]. The project needs **Pro** before any commercial launch (Decision D10). | n/a |
| 3D asset tooling | glTF-Transform CLI, Khronos glTF-Validator | @gltf-transform/cli 4.5.1 |
| Payments | Stripe, test mode / sandboxes only during the build | stripe 23.0.0 (pins API `2026-09-30.endive`) [V] |

**Build fresh; keep the legacy app as reference.** The legacy app (Next 14, framer-motion) has no reusable functionality. It stays recoverable at `27d56a0` ([01 · §3](01-current-state-audit.md#3-repository-githubcomjakeylee93notaprint-website)).

## 3. The 3D product system

### 3.1 Asset contract per product geometry (GLB)

- Real-world scale in metres, `+Y` up, origin at the base centre.
- Named nodes: `body`, `print_surface_<placement>`, plus `handle`, `lid` and so on where they exist.
- **Each placement has its own print-surface mesh with a dedicated UV island.** The island maps linearly onto the supplier's print rectangle, with known **mm per UV unit**.
  - Mug: an exact cylindrical unwrap, where *u* is the angle across the printable arc and *v* is the height. The handle gap is masked.
  - Pen barrel and bottle wall: the same approach.
  - T-shirt front: a flattened panel island.
- Material variants: one PBR material per real colour SKU (base colour, roughness, metalness), plus glaze or clear-coat where the product has it.
- Budgets (proposal):
  - 20–60k triangles per hero product and 10–30k per catalogue product.
  - Textures 2k at most (KTX2).
  - GLB ≤ 1.5 MB, targeting 300–800 kB with meshopt + KTX2.
- Validation gates:
  - Khronos glTF-Validator passes with 0 errors.
  - A custom check confirms each UV island is rectangular and undistorted (stretch < 1% across the island).
  - Physical dimensions match the supplier's specification within ±1 mm.
  - A licence record is attached ([§6](#6-imagery-pipeline-and-provenance)).

### 3.2 Logo on the product

- **Logo composition happens in UV space, not by projected decal.**
  - Three.js documents that `DecalGeometry` projections stretch on curved or cornered surfaces. That rules them out for mug wraps, bottle labels and pen barrels.
  - The client instead draws the logo into a print-area canvas sized to the supplier's print rectangle (e.g. N px per mm), preserving aspect ratio and applying the customer's scale and position in **millimetres**.
  - That canvas is used as a `CanvasTexture` (sRGB colour space, mipmaps, anisotropy) on the print-surface material, layered over the base material with the alpha mask.
- **The proof uses the very same canvas.** By construction, what the 3D preview shows and what the proof shows are the same pixels mapped differently.
- **Ink appearance:** a per-technique material response. Printed ink on glaze picks up the glaze's specular. Laser engraving uses a roughness/colour shift with no ink colour. Embroidery is shown as a flat preview plus a note.
- **Caching:** composed textures are keyed by `(logoHash, printAreaVersion, placement, scale, offset)` and kept in memory and IndexedDB.

### 3.3 Viewer runtime

- **One WebGL canvas** in the whole app, mounted lazily when a product is opened or the hero enters view.
- `frameloop="demand"` once interaction settles.
- DPR clamped to [1, 1.75], with an adaptive downgrade on slow frames.
- Context-loss handler that remounts and restores state.
- Controls:
  - camera-controls or OrbitControls with damping (inertia without a physics engine);
  - polar clamps and bounded zoom;
  - keyboard: arrows rotate, `+`/`-` zoom, `0` reset;
  - touch: one-finger orbit, pinch zoom.
- Reduced motion: no autoplay and no scrub. Composed stills plus an explicit "Rotate in 3D" button.

### 3.4 Honest fallback per SKU

If a SKU has no validated mesh yet, its product page shows the **flat proof plus the supplier's own product photo**, clearly labelled *"Illustrative photo — your proof shows the exact print"*. It never shows a fake 3D view, and never an AI image passed off as the product.

## 4. Grid thumbnails without a WebGL context per card

For each `SKU × colour × view`, render offline from the same GLB and HDRI as the viewer:

| Pass | Contents |
|---|---|
| Beauty | Product with no logo, on white with contact shadow (WebP/AVIF) |
| UV pass | Print-surface UV coordinates encoded in 16-bit RG |
| Shading pass | Lighting and specular over the print surface |
| Mask | Print-surface coverage and occlusion |

In the browser, one tiny shared WebGL2 program (or a CPU worker on low-end devices) remaps the customer's composed print-area texture through the UV pass, multiplies by the shading and composites over the beauty pass. **That puts the same logo on every compatible product instantly, at photographic quality, with no live 3D per card and no AI.** Results are cached per logo hash. The same technique powers Concept B's hero photo ([03 · §4](03-design-direction.md#4-three-hero-concepts)).

## 5. Artwork pipeline (upload once, use everywhere)

1. **Client upload direct to private Blob.**
   - Vercel Function bodies are capped at **4.5 MB** [V], so uploads go straight to Blob via `upload()` and a token route using `handleUpload` / `handleUploadPresigned`. The docs require **authenticating in `onBeforeGenerateToken`** [V].
   - Token constraints:
     - the server builds the pathname as `quarantine/{session}/{uuid}.{ext}`;
     - `allowedContentTypes` is limited to SVG, PNG and PDF (JPG accepted with a warning);
     - size caps: **SVG 5 MB · PNG 25 MB · PDF 20 MB**;
     - `validUntil` 10 min, `allowOverwrite: false`.
2. **Server processing** (Node runtime route; `onUploadCompleted` only records status, because it doesn't fire on localhost [V]):
   - Check the magic bytes against the extension, then store a SHA-256 content hash. Per OWASP, `Content-Type` is never trusted [V].
   - **SVG:**
     - **Reject rather than silently alter** brand artwork if it contains any of: an internal DTD or `<!ENTITY`, `xi:include`, `script`, `foreignObject`, `on*` attributes, `javascript:`, non-fragment links, external `<image>`, or CSS `url(` / `@import`.
     - Then run DOMPurify (`USE_PROFILES: {svg: true, svgFilters: true}`). It drops `use` by default, so re-allow it with a hook for `#` links only [V].
     - Rasterise previews with sharp/librsvg (`limitInputPixels` ≈ 50 MP).
     - Warn when the file contains live `<text>`, because server fonts differ; ask for outlined text.
     - Keep the sanitised SVG as the **vector master**.
   - **PNG/JPG:**
     - sharp metadata gives dimensions, `hasAlpha`, colour space and ICC; `stats().isOpaque` detects real transparency [V].
     - Re-encode previews to sRGB.
     - Never upscale silently.
   - **PDF:**
     - Single page only. Reject encrypted files.
     - **Hold for manual review** if `hasJSActions()` reports JavaScript actions or the file has attachments [V].
     - Render the preview with the latest pdf.js (or in a Vercel Sandbox).
     - Keep the original byte-for-byte as the vector master.
3. **Derived files:** a 2048 px preview (sRGB PNG with alpha), a 512 px thumbnail, the content hash, and the trimmed bounding box (transparent margins removed, so the logo fills the print area correctly).
4. **Quality checks shown in plain words:**
   - **Effective DPI** = pixels ÷ (print size mm ÷ 25.4), computed per print area. The file's DPI header is never trusted.
     - Printful's guidance: **300 DPI for paper, 150 DPI for other products**, avoid under 150 or over 600 [V].
     - Proposal: block below 150, warn below 300.
   - Vector vs raster.
   - Transparent background yes/no.
   - Very thin lines (engraving and embroidery risk).
5. **Persistence:**
   - A signed, httpOnly "logo session" cookie holds only an opaque ID, which counts as strictly necessary under PECR [V]. It references the artwork ID, so the **same logo follows the customer across every product and page**.
   - An optional account can save it permanently.
   - Previews are served through `/api/logo/[id]` with an ownership check, `nosniff`, `CSP: default-src 'none'; sandbox` and `Cache-Control: private, no-cache`. They are displayed only via `<img>` and **never inlined into the page** [V].
   - Proposed retention:
     - quarantined or failed uploads: 24 h;
     - uploads not attached to an order: 30 days;
     - ordered artwork: about 12 months after fulfilment.
   - The UK GDPR sets no fixed periods, but requires a policy and periodic review [V].
6. **Never** regenerate, redraw or "AI-vectorise" a customer's logo. The only optional tool would be deterministic "remove a white background" with a before/after preview and consent.

**Print master per order line.**
- Rendered from the vector master (or the original raster, never upscaled beyond the threshold) at the supplier's exact print-area pixel size and DPI, positioned per the customer's millimetre placement.
- Printful wants **sRGB IEC61966-2.1 PNG** (max 200 MB) [V].
- Laltex asks for "**fully editable EPS** for Adobe Illustrator" plus Pantone references [V]. Trade orders therefore carry the customer's original vector file, and a raster-only logo triggers an artwork request before the quote.
- Stored immutably with its hash. A **proof PDF** is generated from the same data and attached to the order.
- Suppliers fetch files through signed GET URLs valid for 24 h or less.

## 6. Imagery pipeline and provenance

- **Campaign plates and product beauty images are authored once**, via the connected OpenArt route to OpenAI GPT Image (image→image with real product references and our 3D renders as structure). They are never generated per customer. Every generation needs Jake's approval for credit spend.
- **A provenance record per asset** (`content/assets/<id>/provenance.json`, originals in storage) holds:
  - source references and their licence (supplier photo, our render, our photography);
  - provider and model ID (e.g. `openart:gpt-image-2`);
  - prompt, parameters, credits and date;
  - every transformation (crop, relight, colour);
  - reviewer and fidelity sign-off.
- **Product fidelity checklist:**
  - silhouette and proportions vs the spec sheet;
  - colour vs the swatch;
  - print-area position;
  - details (handle, clip, lid, seams);
  - no third-party marks.

## 7. Catalogue, pricing and orders

Normalised supplier catalogue, versioned mappings, server-trusted quantity pricing, mixed-supplier order splitting, the Laltex quote route, and the Stripe test-mode state machine are in **[05 · Commerce and suppliers](05-commerce-and-suppliers.md)**.

## 8. Performance budgets (acceptance targets)

| Metric | Target (p75, mid-tier phone on 4G) |
|---|---|
| LCP (home, product) | ≤ 2.5 s. The hero still or plate is the LCP element; 3D loads after it. |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |
| JS before 3D | ≤ 180 kB gzip |
| 3D island (three + fiber + drei subset + controls) | Lazy loaded; ≤ 250 kB gzip |
| Hero 3D payload | ≤ 3 MB total, first interactive frame ≤ 1 s after the island loads |
| Product GLB | ≤ 1.5 MB (target 300–800 kB) |
| GPU memory | ≤ 64 MB textures on mobile; one WebGL context |
| Frame rate | 60 fps desktop; ≥ 30 fps sustained on reference phones (e.g. iPhone 12, Pixel 6a) with adaptive DPR |

## 9. Accessibility (WCAG 2.2 AA)

- Keyboard-complete viewer and configurator.
- Visible focus (cyan ink, 5.2:1).
- Text alternative for every 3D view, describing the product, colour and print placement.
- Reduced-motion parity.
- No autoplaying motion over 5 s without pause.
- Colour contrast tokens are pre-measured.
- Screen-reader announcements for price changes and checks.
- Proof approval is reachable without the 3D view.

## 10. Security and privacy

- **Secrets:** server-only, and test keys only in preview environments. A boot guard **refuses live Stripe keys** in non-production environments ([05 · §6](05-commerce-and-suppliers.md#6-payments-stripe-test-mode-design)).
- **Webhooks:** signatures verified (Stripe `constructEvent` on the raw body; Printify `X-Pfy-Signature` HMAC) [V], events deduped, handlers idempotent.
- **Uploads:** private bucket, signed URLs, magic-byte checks, sanitised SVG, size limits, upload rate limits.
- **Headers:** CSP, `X-Content-Type-Options: nosniff`, and `Content-Disposition` on downloads.
- **Personal data:** artwork and addresses are personal or commercial data under UK GDPR. Retention, deletion and processor list belong in the privacy notice.
- **Supplier API calls** are server-side only (Printify does not support CORS [V]).

## 11. Testing and environments

- **Unit:** pricing and tier maths, VAT, adapter mappers (recorded supplier fixtures), state transitions.
- **Visual:** thumbnail composites and proof PDFs against golden images.
- **End-to-end (Playwright):** upload real SVG/PNG/PDF → mug → colour/placement → proof → Stripe test checkout → webhook → order `paid` → supplier payload generated (**not submitted**).
- **Webhook replay:** replaying the same event 3× produces exactly one state change.
- **Environments:** local → Vercel Preview (SSO-protected) only. **Production stays untouched** until Jake explicitly approves launch, live Stripe activation and DNS cutover.

## 12. Sources

- Three.js `DecalGeometry`: https://threejs.org/docs/#examples/en/geometries/DecalGeometry
- glTF 2.0 and the Khronos validator: https://github.com/KhronosGroup/glTF · https://github.com/KhronosGroup/glTF-Validator
- glTF-Transform: https://gltf-transform.dev/
- Stripe and Printify facts: see [05 · Sources](05-commerce-and-suppliers.md#sources).
- Detailed 3D pipeline and upload-pipeline sources: see [07 · Research notes](07-research-notes.md).
