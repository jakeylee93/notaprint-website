# 03 · Design direction (proposal for review)

This is a proposal for review. Nothing visual gets built until Jake agrees the direction. After that, work goes section by section: **brand basics → hero → product grid → mug configurator → proof → checkout → campaign sections → footer and legal**.

## 1. Principles (from Jake's design standard)

1. **The customer's logo is the hero; the product is the stage.** The first screen asks for the logo and nothing else competes with it.
2. **Full-width images alternate with generous white.** Each campaign image gets the whole width; each white section holds one idea.
3. **Striking, elegant type with concise copy.** One idea per screen, and no stacks of sub-headings.
4. **No clutter.** That means no divider lines, card mosaics, badge pills, glow shadows, gradient text, trust-stat bars, tooltips or "implementation chatter".
5. **Honesty.** A campaign image is marketing. The configurator and proof show exactly what will be printed. A placeholder always says it is a placeholder.
6. **Motion that serves the product.** Damped, physical and reversible on native scroll. Full parity under reduced motion.

## 2. Art direction

**Product stage (configurator and grid).**
- True white `#FFFFFF`, with one soft contact shadow under each product and no reflections or floor line.
- One camera language for every product:
  - 3/4 view, about 20° elevation, a long-lens look (about 70 mm equivalent).
  - The product fills 62–68% of the frame height, so different products read at consistent scale.
- One lighting rig: a large soft key from upper left, a gentle fill, and a faint rim to separate white products from the white background.
- The same environment map (HDRI) is used by the live 3D viewer and the pre-rendered thumbnails, so the grid and the viewer match exactly.
- **Black and white versions are shown only when that exact SKU exists.** A "black mug" is a separate supplier product, not a recolour.

**Campaign art (authored once, never per customer).**
- Three or four full-bleed editorial images of the products in believable UK use: a studio desk in morning light, a pop-up event, a reception counter. Each one carries NotAPrint's own mark or a neutral sample mark, **never a real third-party brand**.
- Authored through the connected **OpenArt → OpenAI GPT Image** route (`gpt-image-2`, or the newer `gpt-image-2-5-sunburst` for edit precision), using **real product reference photos plus our own 3D renders** so the geometry stays locked.
- Each image passes a **fidelity check** against the SKU spec before use: shape, proportions, colour, print-area position and handle or lid details.
- Provenance is retained for every image: references, prompt, model ID, settings, edits and final export (see [04 · §6](04-technical-architecture.md#6-imagery-pipeline-and-provenance)).
- As Jake allows, real product or gallery photographs may be reframed, re-angled or relit for balanced composition, **keeping true product identity and specifications**.
- Separate crops are authored per breakpoint (landscape 16:9, portrait 4:5 or 9:16) rather than auto-cropped.

## 3. Type and colour (initial tokens, tested in Phase 1)

**Type**
- Display: **Instrument Serif** (SIL OFL, free) for headlines and large prices.
- UI and text: **Geist** (SIL OFL, free), with tabular figures for prices and quantities.
- Alternative to test: Fraunces with Inter. A paid upgrade path (e.g. PP Editorial New) is optional and not required.

**Colour** (measured WCAG contrast)

| Token | Hex | Use | Contrast on white |
|---|---|---|---|
| Ink | `#111111` | Text, primary button | 18.9:1 |
| Graphite | `#55565B` | Secondary text | 7.3:1 |
| Stone | `#8A8B90` | Disabled / large captions only | 3.4:1 (large text only) |
| Paper | `#F5F4F0` | Proof-sheet surface only | n/a |
| Cyan ink | `#0072B5` | Focus ring, links, selected state | 5.2:1 |
| Magenta ink | `#C2006E` | Errors, required attention | 6.0:1 |
| Process yellow | `#FFD400` | Highlight fill behind Ink text only | Ink on it 13.2:1 |

The CMYK accents echo the logo and print heritage. They are used as functional signals, never as decoration.

## 4. Three hero concepts

All three meet the brief:
- the first screen says **"Upload your logo"**;
- campaign art is part of the experience;
- a **real 3D** scroll demonstration puts the logo on a pen, mug and water bottle;
- the hero then leads **straight into the products**.

The same customer logo is used throughout. With no upload, a tasteful **"Your logo here"** placeholder shows instead (a light grey outlined wordmark with that text).

### Concept A: Studio Relay (white stage)
- **Fold:**
  - Desktop: a huge serif "Upload your logo." on the left, a one-line promise, a black **Upload your logo** button and a quiet "or browse products" link. Dropping a file anywhere on the page also works.
  - On the right, a live 3D pen on white with "Your logo here" on its barrel.
- **Scroll beats (scrubbed and fully reversible):**
  1. The pen turns toward camera and the logo "prints" along the barrel. It is an ink reveal in UV space, not a fade.
  2. The pen drifts out and a mug arrives on the same shadow. The camera arcs about 30° and the logo travels around the cylinder as the mug turns, which proves a true wrap.
  3. A water bottle replaces the mug and a light sweep shows how the logo sits on a matte or brushed surface.
  4. All three settle into a line-up, captioned "One upload. Every product."
  5. The line-up lifts and the product grid rises underneath, already showing the same logo.
- **Campaign art:** full-bleed sections after the grid ("Made to order", "Trade quantities").
- **Effort / risk:** medium / low. This is the engine all three concepts need.

### Concept B: Photo → 3D Handoff (campaign plate first) · **recommended target**
- **Fold:**
  - A full-bleed campaign photograph with the headline and button set in its quiet area.
  - The pen, mug and bottle in the plate are **our own renders composited into an AI-authored environment plate**. A shadow catcher and matched lighting tie them in, so their geometry is exact.
  - Because we hold the render passes, **the customer's uploaded logo appears in the hero photo itself**, composited in the browser from a UV pass. There is no AI per customer.
- **Scroll beats:**
  1. A slow 2.5D push into the plate.
  2. The mug detaches into the live WebGL viewer, pose-matched to the photo.
  3. The plate dissolves to white and the relay continues as in A (mug → pen → bottle → line-up → grid).
- **Mobile:** a separately authored portrait plate. The live handoff runs only on capable devices; other devices get Concept A's still line-up.
- **Effort / risk:** high / medium. Pose and lighting matching need one test plate, which needs Jake's approval for generation spend. It is the most brand-specific and cinematic of the three.

### Concept C: Proof to Object
- **Fold:** a white page with "Upload your logo." above a **calibrated proof sheet** (paper surface, true-scale print area such as "Mug wrap · 200 × 80 mm"). After upload, the real checks appear in plain words: vector or raster, effective DPI, transparency.
- **Scroll beats:** the artwork lifts off the sheet and **bends onto the mug**. This is a vertex morph from the flat UV plane to the real mesh, so the animation literally shows the mapping. It then moves to the pen barrel and the bottle, each labelled with its print-area size, and ends on the grid.
- **Campaign art:** full-bleed images between the white sections.
- **Effort / risk:** medium / low. It is the most explanatory concept, but it has the least lifestyle glamour on the fold.

**Recommendation.**
- Build Concept **A's engine** in the vertical slice, with the mug only.
- Art-direct the opening as **Concept B** once a single pose-match test plate passes review.
- Reuse **C's proof sheet** as the proof step on every product page.
- If the B test fails, ship A. Nothing is wasted either way.

## 5. Homepage structure

1. **Header:**
   - Logo, then Products · Trade · How it works · Help on the left.
   - **Upload your logo** and the basket on the right.
   - Skip link, keyboard-complete menu, full-screen sheet on mobile.
2. **Hero** (concept above).
3. **Products:** the grid starts immediately below the hero, with a compact filter bar.
4. **Full-bleed campaign image + "Made to order":** one-offs, higher unit price, no minimums *where the supplier allows*.
5. **White: "Trade quantities":** quantity breaks, MOQs and lead times shown honestly (e.g. 1,000 pens, 100 T-shirts) via quote or trade pricing. This carries forward the old *Express vs Bespoke* idea.
6. **Full-bleed campaign image + "Proof before print":** the real proof UI.
7. **White: delivery, lead times, help.** Short answers, using verified supplier data only.
8. **Footer:**
   - Minimal.
   - Legal pages and company details. UK trading-disclosure details for a limited company are needed (**input from Jake**).

## 6. Catalogue grid ("straight into the products")

- **Layout:** pure white, no card borders, 2 columns on phones, 3–4 on desktop, generous gaps.
- **Thumbnails:**
  - Pre-rendered from the same 3D models.
  - With a logo uploaded, every compatible product shows it **instantly**, composited in 2D from cached render passes. There is no WebGL per card (see [04 · §4](04-technical-architecture.md#4-grid-thumbnails-without-a-webgl-context-per-card)).
- **Under each product:**
  - name;
  - real colour swatches;
  - **"£x per unit at N"**, priced at the chosen quantity;
  - lead time as text ("Ships in 3–5 working days", supplier-derived);
  - fulfilment as plain words ("Made to order" or "Trade · min 100").
- **Compact filter bar:**
  - Search · Category · Colour · **Quantity** (1 · 25 · 100 · 500 · 1,000+) · Lead time · Sort (price at quantity, lead time, newest).
  - Changing quantity re-prices the whole grid and greys out items below their MOQ.
  - On mobile this becomes one "Filter & sort" sheet.

## 7. Product page: the mug first

- **Viewer** (60% on desktop, top on mobile):
  - True 3D with damped orbit and inertia.
  - Bounded zoom (0.8–1.8×) and polar clamp (no looking up from beneath the mug).
  - Double-tap or `0` resets.
  - Keyboard: arrows rotate 15°, `+`/`-` zoom.
  - A **Flat proof** toggle.
- **Panel:**
  - name and verified specs;
  - **colour** (only real SKUs);
  - **placement** (the supplier's print areas, e.g. wrap or one side);
  - logo size slider bounded to the print area, with an **mm readout**;
  - position nudge;
  - quantity with a tier table;
  - unit and total price inc/ex VAT;
  - lead time and delivery estimate;
  - **Review proof**.
- **Proof** (sheet from Concept C):
  - a 1:1 print-area view with safe area;
  - DPI result;
  - a colour note ("screen colours vary; printed colour may differ");
  - an explicit **"I approve this artwork"** step that creates an immutable proof record attached to the order.
- **Basket and checkout:**
  - Proof thumbnails per line.
  - A plain-words note when items ship separately (mixed suppliers).
  - Stripe Checkout (test mode during build).
  - The success page shows "Confirming your payment…" until the webhook confirms.

## 8. Motion and interaction spec

| Element | Behaviour |
|---|---|
| Orbit | Damping about 0.08–0.12, rotate speed about 0.6, inertia from damping only (no physics engine). Auto-rotate off. |
| Object transitions | 600–900 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, shadow continuity, no bounce |
| Colour change | 250 ms material crossfade |
| Logo apply | 300 ms ink reveal along the print surface |
| Scroll hero | Native scroll with scrubbed timelines, fully reversible, no scroll-jacking, no smooth-scroll hijack |
| Reduced motion | No scrub. Composed still frames (with the customer's logo composited) and a **"Rotate in 3D"** button. Fades of 120 ms or less. |
| Video or long motion | Never autoplays for more than 5 s without a visible pause control |

## 9. Voice and sample copy (British English, no unverified claims)

- **"Upload your logo."** / "See it on real products, in 3D, before you buy."
- "One upload. Every product."
- "Made to order." / "Trade quantities."
- "Proof before print."
- Never write "24hr", "100+ products" or "No minimums" unless supplier data proves them per product.

## 10. Decisions this section needs from Jake

- **D1** Brand spelling: "NotAPrint", "Nota Print" or "notaprint".
- **D3** Vector logo master: SVG, PDF or AI from Google Drive.
- **D4** Hero concept: A, B or C (recommended: B on A's engine).
- **D5** Type pairing.
- **D6** Approve one GPT Image test plate (cost as listed by OpenArt at check time: 40–42 credits per GPT Image 2 or 2.5 image). Nothing is generated until approved.
