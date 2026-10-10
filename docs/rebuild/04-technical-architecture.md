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
| Scroll choreography | GSAP ScrollTrigger (scrub on native scroll). GSAP has been **free for commercial use, including all plugins, since 3.13 (Apr 2025)**; the licence excludes only competing no-code builders [V] | gsap 3.15.0 |
| MVP fallback | Google `<model-viewer>`. It offers variants, canvas textures, built-in keyboard and screen-reader prompts, Neutral tone mapping and iOS AR via USDZ [V]. It's a fallback if the R3F build slips; R3F is preferred for the custom placement UI and the scroll hero | model-viewer 4.4.0 |
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

- glTF conventions [V]: metres, `+Y` up, front facing `+Z`. Origin at the base centre.
- Named nodes: `body`, `PrintArea_<placement>`, plus `handle`, `lid` and so on where they exist.
- **Each placement has its own print-area primitive and material**, or a second UV set selected with `texture.channel` (glTF `texCoord` maps to `channel` [V]).
- Each placement has a dedicated 0–1 UV island whose **aspect ratio equals the physical print area**. The island maps linearly onto the supplier's print template, with known **mm per UV unit**.
  - Mug: an exact cylindrical unwrap, where *u* is the angle across the printable arc and *v* is the height. The handle gap is masked.
  - Pen barrel and bottle wall: the same approach.
  - T-shirt front: a flattened panel island.
- Material variants: one PBR material per real colour SKU (base colour, roughness, metalness), plus glaze or clear-coat where the product has it.
- Budgets:
  - The Khronos 3D Commerce target for a single-item mobile 3D view is **3 MB, 150k triangles, under 20 draw calls, 2K textures** [V].
  - Ours, tighter: 10–50k triangles per SKU, textures 2K at most (KTX2), GLB ≤ 1.5 MB with a 300–800 kB target.
- Materials: clear-coat for glazed mugs, sheen for cotton, transmission + volume only for clear bottles (a volume mesh must be manifold) [V]. `MeshPhysicalMaterial` costs more per pixel, so use it only where needed [V].
- Colourways:
  - A fixed set of real SKU colours lives in our JSON or variants and is applied via `material.color`.
  - `KHR_materials_variants` is designed for premade variants and needs a plugin in three.js [V].
- Validation gates:
  - Khronos glTF-Validator passes with 0 errors.
  - `gltf-transform inspect` reports GPU size within budget.
  - A scripted UV check confirms each island's aspect ratio matches its print area, with stretch < 1%.
  - Physical dimensions match the supplier's specification within ±1 mm.
  - A licence record is attached ([§6](#6-imagery-pipeline-and-provenance)).
- **Compression caveat (verified by test):** `gltf-transform optimize` defaults **delete UV sets that are only textured at runtime and flatten the node hierarchy**. Use:

  ```
  gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2 \
    --join false --flatten false --palette false --simplify false --prune-attributes false
  ```

  - Meshopt quantises UVs to 12 bits by default, so check print-area precision after compression.
  - KTX2 needs KTX-Software installed.
  - The meshopt decoder is about 8 kB gzipped, against about 100 kB for Draco [V].
- **Licensing:**
  - **Commission bespoke meshes with a written, signed copyright assignment** (UK CDPA s.90 [V]).
  - Stock royalty-free licences are unlikely to fit. TurboSquid requires proprietary formats for real-time web use; CGTrader limits use to an "Incorporated Product"; Sketchfab Standard bars making assets extractable as stand-alone files [V]. A GLB fetched by the browser is an open, downloadable file, so stock models need written permission.
  - Supplier dimensions are facts. Use supplier drawings or photos only with permission.
  - Poly Haven HDRIs are CC0 [V].

### 3.2 Logo on the product

- **Logo composition happens in UV space, not by projected decal.**
  - The Three.js docs warn: *"decal projections can be distorted when used around corners"* [V]. The linked issue has been open since 2021, and the maintainer calls it "a limitation of the used approach".
  - `DecalGeometry` assigns flat-projected UVs inside a projector box [V], so the logo stretches wherever a mug, bottle or pen curves away from the projector. One projection can't produce a 360° wrap.
  - drei `<Decal>` wraps the same technique [V]. Decals are kept only for small, nearly flat spots.
  - The client instead draws the logo into a print-area canvas sized to the supplier's print rectangle (e.g. N px per mm), preserving aspect ratio and applying the customer's scale and position in **millimetres**.
  - That canvas is used as a `CanvasTexture` on the print-area material, layered over the base material with the alpha mask.
  - Texture settings:
    - `colorSpace = SRGBColorSpace` [V];
    - **`flipY = false`** to match glTF UVs, whose origin is top-left [V];
    - anisotropy at `capabilities.getMaxAnisotropy()`;
    - `needsUpdate = true` after each redraw [V].
  - A texture is never resized in place: dispose it and make a new one [V].
  - The logo is rasterised once into an `ImageBitmap`, then contain-fitted per placement at about 8–12 px/mm.
  - Caps: 2048 px (1024 on low-end devices), the device `maxTextureSize`, and iOS's 4096² canvas limit [V].
  - A 2048² RGBA texture with mipmaps uses about 22 MB of GPU memory [V], so an LRU cache disposes textures it evicts.
  - Logo edges are checked for dark alpha fringes.
- **The proof uses the very same canvas.** By construction, what the 3D preview shows and what the proof shows are the same pixels mapped differently.
- **Ink appearance:** a per-technique material response. Printed ink on glaze picks up the glaze's specular. Laser engraving uses a roughness/colour shift with no ink colour. Embroidery is shown as a flat preview plus a note.
- **Caching:** composed textures are keyed by `(logoHash, printAreaVersion, placement, scale, offset)` and kept in memory and IndexedDB.

### 3.3 Viewer runtime

- **One WebGL canvas** in the whole app, mounted lazily when a product is opened or the hero enters view. Chromium force-loses the oldest context beyond 16 [V], so we never create one per card.
- Rendering:
  - `frameloop="demand"` [V].
  - DPR `[1, 1.5]` on mobile and `[1, 2]` on desktop.
  - drei `PerformanceMonitor` / `AdaptiveDpr` for downgrades [V].
  - Rendering pauses when off-screen (IntersectionObserver).
- Context loss: three.js reinitialises the renderer on restore, but our own resources must be recreated [V], so the viewer remounts from state. Tested with `forceContextLoss()`.
- **Renderer:** WebGLRenderer. The three.js manual still calls WebGPURenderer "experimental" [V].
- **Tone mapping:** set **`NeutralToneMapping`** (based on the Khronos 3D Commerce standard) instead of R3F's default ACES, for accurate product colour [V]. Use a CC0 HDRI.
- **Controls:**
  - **camera-controls** (`smoothTime` about 0.25 s, frame-rate independent via `update(delta)`, Promise-based `rotateTo`/`fitToBox` for preset views) [V].
  - Not OrbitControls: its damping is applied per `update()` call rather than scaled by frame time, so the feel changes on 120 Hz screens. It also sets `touch-action: none`, which traps page scroll [V].
  - Polar clamps and bounded zoom.
- **Accessibility of the canvas:**
  - Canvas content is invisible to assistive technology [V]. Provide HTML buttons for rotate left/right, zoom, reset and front/back/wrap views, which satisfies WCAG 2.5.7's single-pointer alternative to dragging [V].
  - Keyboard: arrows rotate, `+`/`-` zoom, `0` reset (WCAG 2.1.1 [V]).
  - An `aria-live` label announces the current view.
  - On mobile, avoid a full-width canvas so the page can still scroll.
- **Reduced motion:** use `gsap.matchMedia('(prefers-reduced-motion: reduce)')` [V]. No autoplay and no scrub; composed stills plus an explicit "Rotate in 3D" button.

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

- Three.js `DecalGeometry` and its distortion issue: https://threejs.org/docs/pages/DecalGeometry.html · https://github.com/mrdoob/three.js/issues/21187
- glTF 2.0 and the Khronos validator: https://github.com/KhronosGroup/glTF · https://github.com/KhronosGroup/glTF-Validator
- glTF-Transform: https://gltf-transform.dev/cli
- Khronos 3D Commerce publishing targets: https://github.com/KhronosGroup/3DC-Asset-Creation
- Stripe and Printify facts: see [05 · Sources](05-commerce-and-suppliers.md#sources).
- Detailed 3D pipeline and upload-pipeline sources: see [07 · Research notes](07-research-notes.md).
