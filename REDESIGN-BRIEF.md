# NotAPrint Homepage Redesign — Codex Brief

## Problems to Fix
1. Too much stacking — every section looks the same (heading → subheading → grid). Needs visual variety.
2. Product images have grey backgrounds (`bg-gray-50`) — must be pure white, no borders, no grey.
3. Pricing needs more detail — show per-unit pricing with quantity tiers.
4. Needs to look SUPER modern — think Apple/Stripe level clean.

## Design Direction
- **Break the grid** — use side-by-side layouts, asymmetric sections, bento-style grids
- **Pure white product backgrounds** — products float on white, no cards, no grey boxes
- **More whitespace** — let things breathe, less cramped
- **Visual variety** — not every section should be centred-heading + 3-column grid
- **Modern touches** — subtle gradients, glassmorphism on some elements, smooth scroll animations

## Specific Changes

### Hero (src/components/sections/HeroSection.tsx)
- Keep the dark hero and "Your Logo. Every Product." concept
- Make it taller, more dramatic
- Add a subtle mockup visual — maybe show a blank t-shirt/mug/pen floating with a dashed outline where the logo would go

### How It Works (src/components/sections/HowItWorks.tsx)
- Change from 3 stacked cards to a HORIZONTAL timeline/flow
- Or make it a single row with connecting lines/arrows between steps
- Less padding, more compact

### Categories (src/components/sections/Categories.tsx)
- Instead of 3 identical cards, make it asymmetric:
  - One large featured card (Merchandise) on the left taking 2/3 width
  - Two smaller cards stacked on the right (Large Format, Print)
- Or use a bento grid layout

### Product Carousel (src/components/sections/ProductCarousel.tsx)
- **REMOVE all grey backgrounds** — products on pure white
- Show pricing with tiers: "from £0.58 / unit" and on hover show "50 units: £0.45 | 100: £0.38 | 500: £0.30"
- Make product images larger
- Add "Add your logo" text or upload icon on hover over each product

### Upload CTA (src/components/sections/UploadCTA.tsx)
- Keep dark section but make it more impactful
- Add a visual element — maybe an animated upload zone mockup

### Trust Bar (src/components/sections/TrustBar.tsx)
- Fine as is, maybe add subtle icons next to each stat

## Tech Rules
- Next.js 14, TypeScript, Tailwind CSS v3
- Framer Motion for animations (already installed)
- Files in src/ directory
- Keep the existing Header and Footer mostly as-is (they work)
- pnpm for package management

## After Changes
```bash
cd /tmp/notaprint-website
pnpm run build
git add -A
git commit -m "redesign: modern layout, white product backgrounds, pricing tiers, bento grid categories"
git push origin main
```

Then run:
```bash
openclaw system event --text "Done: NotAPrint redesign complete — modern layout, white products, pricing tiers" --mode now
```
