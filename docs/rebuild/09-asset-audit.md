# 09 · Asset audit against the project rules (13 Oct 2026)

Every visual asset in the build, checked against [PROJECT-RULES.md](PROJECT-RULES.md).

| Asset | Source | Verdict | Action |
|---|---|---|---|
| Nota mark (the "n" with an ellipse) | The only known original: a 300 × 300 px PNG from the legacy site (`docs/rebuild/evidence/legacy-logo-600px-source.png`) | Genuine | **Now used from the original source pixels** (`public/brand/nota-mark.png`, a byte-identical copy) in the header, footer and favicon. No redraw, no recolour |
| Old "Nota *Print*" serif wordmark | My interim lettering set in Instrument Serif | **Rejected**: a substitute font standing in for brand lettering | Removed. The name now appears in plain interface type next to the genuine mark. The mark has no lettering of its own, so nothing was invented to replace it |
| Old favicon `icon.svg` (white "n" on black) | My own drawing | **Rejected**: an invented mark | Deleted. The favicon is now the original mark |
| Instrument Serif headings and Geist UI text | Open-licence fonts, packaged locally | Allowed: editorial interface fonts, not brand lettering | Kept |
| Hero "Your logo / GOES HERE" placeholder emblem | My own generic placeholder, shown until a visitor uploads | Allowed: it is clearly a placeholder and imitates no real brand | Kept |
| 3D products (mug, pen, bottle, tote, notebook, cards) | Procedural geometry in code at published dimensions | Allowed: each product page states it is an original procedural model, not supplier geometry | Kept. Real supplier meshes or photography are still **pending** |
| Test logos (`tests/fixtures`) | Synthetic images used only by tests | Not shown to customers | Kept |
| Caption "Placeholder logo · live 3D preview" under the hero stage | UI text | **Rejected** under the rule against preview captions | Removed |
| Hint "Drag to rotate · pinch to zoom" over the viewer | Tooltip-style UI text | **Rejected** under the no-tooltips rule | Removed. Keyboard instructions remain in the viewer's accessible label |
| Legacy Laltex product photos and stock hero video | Third-party material with no licence on record | Not used | Still excluded |

## Generated imagery and credits
- **None.** No OpenArt or other generative jobs were run for Nota Print: 0 jobs, 0 failures, 0 credits committed.
- I found no verified Nota-specific allowance, so paid jobs stay blocked by rule. No other project's budget was assumed.

## Food, menu and venue rules
This project has **no** food, menu, venue, mural or interior imagery, so those parts of the rule set don't apply here. Coverage is **0 of 0**.

## Still pending
- **A vector master of the Nota mark** (D3). The 300 px source is fine for header and footer sizes but too small for large hero use. **Featuring the mark large is deferred until a vector or larger original is supplied**, because upscaling or tracing it myself would risk drift.

## Verification of this checkpoint (`ce63a62`)
- Deployed to the testing preview as `dpl_CZiKZMR2aVGRZN6aCZJcYpfEKJoX`: https://notaprint-website-dtzxmmqr8-anyos.vercel.app.
- Type check, build and 56/56 unit tests pass.
- Full e2e suite against that deployment: **17 passed, 1 failed, 18 skipped by design**.
  - The failure was the 390 px low-resolution test, which timed out waiting for the resolution status after upload.
  - Re-running it once on its own: **passed** (13 s).
  - The test was not changed, and it passes on desktop and in every earlier run. Treat it as a timing-sensitive test to harden; its root cause has not been confirmed.
