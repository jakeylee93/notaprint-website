// Pulls confirmed product facts for the selected Printful products from the public catalogue API
// and writes src/lib/catalog/printful-catalog.json. Run: node scripts/sync-printful.mjs
// Only products with UK or EU fulfilment are kept. Prices are not imported (they are USD cost prices).
import { writeFileSync } from "node:fs";

const SELECTION = [
  { id: 380, category: "hoodies", name: "Premium Pullover Hoodie" },
  { id: 892, category: "hoodies", name: "Oversized Heavyweight Hoodie" },
  { id: 897, category: "sweatshirts", name: "Oversized Heavyweight Sweatshirt" },
  { id: 586, category: "tees", name: "Garment-Dyed Heavyweight Tee" },
  { id: 713, category: "tees", name: "Oversized Faded Tee" },
  { id: 1663, category: "caps", name: "Sunwashed Cap" },
  { id: 19, category: "drinkware", name: "White Glossy Mug" },
];

const PLACEMENT_LABELS = {
  embroidery_chest_left: "Left chest (embroidered)",
  embroidery_chest_center: "Centre chest (embroidered)",
  default: "Front (printed)",
  front_large: "Large front (printed)",
  back: "Back (printed)",
  back_large: "Large back (printed)",
  sleeve_left: "Left sleeve",
  sleeve_right: "Right sleeve",
  front_dtf_hat: "Front (printed)",
};
const HAT_LABELS = { default: "Front (embroidered)", left: "Left side", right: "Right side", back: "Back" };
const MUG_LABELS = { default: "Wrap (printed)" };
const FULFIL = ["UK", "EU", "EU_LV", "EU_ES"];

const out = [];
for (const sel of SELECTION) {
  const res = await fetch(`https://api.printful.com/products/${sel.id}`);
  if (!res.ok) throw new Error(`Printful ${sel.id}: ${res.status}`);
  const { result } = await res.json();
  const p = result.product;
  const labels = sel.category === "caps" ? HAT_LABELS : sel.category === "drinkware" ? MUG_LABELS : PLACEMENT_LABELS;
  const placements = (p.files || []).filter((f) => labels[f.id]).map((f) => ({ id: f.id, label: labels[f.id] }));
  const colours = new Map();
  for (const v of result.variants) {
    const regions = Object.keys(v.availability_regions || {});
    if (!regions.some((r) => FULFIL.includes(r))) continue;
    const c = colours.get(v.color) || { name: v.color, hex: v.color_code || "#ffffff", image: v.image, sizes: [], variantIds: [] };
    if (v.size && !c.sizes.includes(v.size)) c.sizes.push(v.size);
    c.variantIds.push(v.id);
    colours.set(v.color, c);
  }
  if (colours.size === 0) continue;
  out.push({
    printfulId: p.id,
    slug: sel.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: sel.name,
    brandModel: p.title.split("|").pop().trim() || p.model,
    category: sel.category,
    techniques: (p.techniques || []).map((t) => t.display_name),
    placements,
    colours: [...colours.values()],
  });
}
writeFileSync(
  new URL("../src/lib/catalog/printful-catalog.json", import.meta.url),
  JSON.stringify({ source: "https://api.printful.com/products/{id}", fetchedAt: new Date().toISOString().slice(0, 10), products: out }, null, 1) + "\n",
);
console.log(out.map((p) => `${p.printfulId} ${p.name}: ${p.colours.length} colours, ${p.placements.length} placements`).join("\n"));
