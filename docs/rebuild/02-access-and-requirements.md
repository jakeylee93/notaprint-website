# 02 · Access preflight and remaining requirements

All checks below were run on 10 Oct 2026 and were **read-only**. No secrets were printed. No subscriptions, top-ups, generations, orders, emails or DNS changes were made.

## 1. Access table

| Capability | Status | Evidence | Gap / next action |
|---|---|---|---|
| GitHub repo `jakeylee93/notaprint-website` | ✅ Read, plus write to `claude/zen-newton-he9byr` | git and GitHub connector. `main` @ `dc7c7f0`, **unprotected**, no PRs | Recommended for Jake: protect `main` (no force-push) |
| Legacy source recovery | ✅ | All 12 commits fetched by SHA. Kept reachable by merge commit `d718fd6` on this branch | None |
| Vercel, both teams | ✅ Read-only | Connector as `jakeylee93` (Hobby). Project `prj_IPR8ScfqECzQfglVzy95QLANPZuq`. **No env vars** | **Hobby is non-commercial only** [V]. Move to Pro before launch (**D10**) |
| Live URLs | ✅ | `notaprint-website.vercel.app` returns 200 (public). Deployment URLs are SSO-protected | None |
| Domain registry and DNS (read) | ✅ | Nominet RDAP and DNS-over-HTTPS ([01 · §5](01-current-state-audit.md#5-domain-notaprintcouk-registered-at-123-reg)) | No 123-reg account access here. **DNS changes are out of scope** until launch approval |
| Shopify | ❓ Unknown | DNS still points at Shopify. A Shopify 404 page turned up as a legacy "image" | Jake: does a Shopify store or account still exist? (**D2**) |
| **OpenAI image** (via OpenArt) | ✅ **Available** | OpenArt connector, Jake's **Plus** plan. Models listed: **`gpt-image-2`**, **`gpt-image-2-5-flare`** and **`gpt-image-2-5-sunburst`** (OpenAI GPT Image), each with text→image and image→image / reference edit. All marked affordable at check time | Not an access blocker. **No generation was run.** Each use needs Jake's approval (**D6**). A direct OpenAI API key isn't needed while this route works |
| OpenAI video (Sora) | ❌ Not exposed | OpenArt's list has **no OpenAI video model**. Its video models are Google Veo 3.1 and Gemini Omni, Kling 3, Seedance 2.x, Wan 2.7/3.0, MiniMax H3, Grok Imagine 1.5 and PixVerse V6 (all non-OpenAI). Nano Banana models are Google, not OpenAI | Not required: the hero is real-time 3D, not video. If video is ever wanted, the provider must be named honestly |
| Reference upload to OpenArt | ⚠️ Available, not exercised | `openart_upload_*` tools are present | Used only when a generation is approved |
| Figma | ✅ Connected | Jake Lee's team · Starter · **View** seat · Figma AI access true | A View seat may limit editing team files. Figma Weave model lookup needs the Figma account linked at weavy.ai (not needed) |
| Stripe | ❌ Not connected | No connector or keys in the environment or in Vercel (correct for now) | Phase 0: Jake creates sandboxes and restricted **test** keys |
| Printful | ❌ No token | Public v1 catalog only | Phase 0: account, "Manual order platform/API" store, private token, GBP billing. **No orders** |
| Printify | ❌ No token | Public docs only | Optional alternative. If used: an API store with approval set to **Manual** before any token use |
| Laltex | ❌ Trade status unknown | Public pages only. **No public API** [NF] | Jake: trade account, a request for API key and docs, and written image permission |
| Supabase | Not inspected | Connector present | Only if chosen as the database (**D9**) |
| Email for `hello@notaprint.co.uk` | ❌ Not configured | No MX, SPF or DMARC records published. Delivery **not tested** | Choose a mailbox provider before launch (**D13**) |

## 2. Remaining access requirements, by phase

**Before Phase 0/1 (the mug slice)**
1. **Stripe:** a UK account with two **general sandboxes** (`dev`, `ci`), plus restricted **test** keys added to Vercel *Preview* environment variables only.
2. **Printful:** an account, an API store and a private token. In Phase 0 we read the **mug printfile spec**, the UK availability of white and black mugs, and GBP prices. **No drafts or orders.**
3. **NotAPrint vector logo** (SVG, PDF or AI; commit `214be92` says it was saved to Google Drive) (**D3**).
4. **Company details** for trading disclosures and VAT setup: legal name, company number, registered office, VAT number if registered (**D12**).

**Before Phase 2 (hero, grid, trade route)**
5. **Laltex:**
   - an authorised trade account;
   - **written permission** covering product images and data on a public site;
   - confirmation of artwork specs, carriage, origination charges and lead times;
   - a request for the **API key and documentation**.
6. **Generation approval** for one Concept B test plate (GPT Image via OpenArt) and an overall imagery budget (**D6**).
7. **3D models:** a budget and route per SKU, commissioned or licensed (**D14**). Optional physical **samples** for reference photography and dimensions (**D15**). Samples are purchases, so they need Jake's approval.

**Before launch (Phases 4–5)**
8. **Accountant:** VAT treatment of promotional and printed goods, and a Stripe Tax registration.
9. **Legal:** T&Cs (including the cancellation-right position for personalised goods), privacy notice, cookies.
10. **Vercel Pro** (**D10**). A **mailbox provider** with MX, SPF and DMARC records (**D13**).
11. **123-reg access** for the DNS cutover, with the exact record changes approved first (**D2**).

## 3. Data requirements

- **Slice product:** confirm the Printful White Glossy Mug 11 oz (and 15 oz?), plus black if a real SKU exists.
- **Phase 2 trade products:** choose a Laltex pen code (e.g. Pencom TPC444501) and a bottle code.
- **Commercial policy (D11):** margin rules, price rounding, POD small-quantity tiers, shipping policy.
- **Supplier print specs:** read from authenticated endpoints in Phase 0 (Printful printfiles) or from Laltex catalogue and portal data.
- **Reference imagery:** real photos per SKU, from supplier images with permission or our own sample photography, for 3D modelling and campaign references.

## 4. Decisions for Jake

| # | Decision | Recommendation | Needed by |
|---|---|---|---|
| D1 | Brand spelling and casing | Choose one of "NotAPrint", "Nota Print" or "notaprint". The code currently says "NotAPrint" | Phase 0 |
| D2 | Shopify remnants: is there a store or account? | Confirm. Replace the DNS records only at launch | Launch |
| D3 | Vector logo master | Supply the original SVG/PDF/AI, or have a designer redraw it (human, not AI) | Phase 0 |
| D4 | Hero concept | **B on A's engine** ([03 · §4](03-design-direction.md#4-three-hero-concepts)) | Phase 2 |
| D5 | Type pairing | Instrument Serif + Geist | Phase 1 |
| D6 | Generation spend (GPT Image via OpenArt) | Approve one test plate first; at check time OpenArt listed 40–42 credits per image | Phase 2 |
| D7 | Slice mug supplier | **Printful White Glossy Mug 11 oz** (UK-fulfilled [V]) | Phase 0 |
| D8 | Flat print / POS supplier | A UK trade printer on the quote route, or POD posters only | Phase 3 |
| D9 | Database | Neon (Vercel Marketplace) or Supabase. Either works with Drizzle | Phase 0 |
| D10 | Vercel plan | Pro before any commercial use | Before launch |
| D11 | Margins, rounding, shipping policy | Proposal workshop in Phase 0 | Phase 0 |
| D12 | VAT registration and treatment | Accountant confirms; configure Stripe Tax | Phase 4 |
| D13 | Mailbox provider | Any reputable provider, plus SPF and DMARC | Before launch |
| D14 | 3D model route per SKU | Commission the hero SKUs, license only with real-time-web rights | Phase 1–2 |
| D15 | Physical samples | Recommended for the mug, pen and bottle (purchase approval) | Phase 1 |
| D16 | When `main` receives the rebuild | Via PR from a feature branch after Phase 1 review; `main` stays untouched until then | After Phase 1 |
| D17 | **Repository visibility.** It is currently **public**. The recovered history includes the unlicensed Laltex photos and the stock video, and future commits will hold supplier and margin logic | **Make the repo private** before commercial details are committed. Production secrets never go in git either way | Now |
