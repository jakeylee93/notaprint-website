import { expect, test } from "@playwright/test";
import { currentArtworkId, expectLogoReady, freshStart, shot, uploadLogo } from "./helpers";

const isDesktop = (name: string) => name === "desktop";

test.describe("upload once → every product → 3D → proof → basket", () => {
  test("core flow with persistence", async ({ page }, info) => {
    await freshStart(page);
    await expect(page.getByTestId("rail")).toBeVisible();
    await expect(page.getByTestId("rail-name")).not.toBeEmpty();
    await shot(page, info, "01-home");

    // Upload once (PNG with transparency).
    await uploadLogo(page, "logo-transparent.png");
    await expectLogoReady(page);
    const artworkId = await currentArtworkId(page);
    expect(artworkId).toMatch(/^[a-f0-9]{32}$/);

    // The mug is the product with a calibrated 3D model: open it from the rail.
    await page.getByTestId("filter-drinkware").click();
    await page.getByTestId("rail-open").click();
    await page.getByRole("link", { name: "Open in 3D" }).click();

    // Real 3D mug: rotate with keyboard and with the on-screen buttons.
    const viewer = page.getByTestId("viewer");
    await expect(viewer).toHaveAttribute("data-state", "ready", { timeout: 45_000 });
    await page.waitForTimeout(1200);
    const before = await viewer.screenshot();
    await viewer.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1500);
    const afterKeys = await viewer.screenshot();
    expect(Buffer.compare(before, afterKeys)).not.toBe(0);
    await page.getByRole("button", { name: "Rotate left" }).click();
    await page.waitForTimeout(1200);
    const afterButton = await viewer.screenshot();
    expect(Buffer.compare(afterKeys, afterButton)).not.toBe(0);
    if (isDesktop(info.project.name)) {
      const box = (await viewer.boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(1500);
      expect(Buffer.compare(afterButton, await viewer.screenshot())).not.toBe(0);
    }
    await shot(page, info, "03-mug-3d");

    // Only real variants and colours: 11 oz / 15 oz, white only.
    await expect(page.getByRole("group", { name: "Size" }).getByRole("button")).toHaveText(["11 oz", "15 oz"]);
    await expect(page.getByRole("group", { name: "Colour" }).getByRole("button")).toHaveCount(1);
    await page.getByRole("group", { name: "Size" }).getByRole("button", { name: "15 oz" }).click();
    await page.getByTestId("placement-both").click();

    // Print bounds: pushing the slider past the end stays inside the printable area.
    const slider = page.getByTestId("logo-width");
    await slider.focus();
    await page.keyboard.press("End");
    const max = Number(await slider.getAttribute("max"));
    const sizeText = await page.getByTestId("logo-size").innerText();
    const widthMm = Number(sizeText.split("×")[0]);
    expect(widthMm).toBeLessThanOrEqual(max + 0.01);
    expect(max).toBeLessThanOrEqual(80);
    await expect(page.getByTestId("dpi-status")).toHaveAttribute("data-rating", /sharp|good/);

    // Proof and approval gate.
    await page.getByTestId("review-proof").click();
    const dialog = page.getByTestId("proof-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("proof-size")).toContainText("mm (× 2)");
    await expect(dialog.getByTestId("add-to-basket")).toBeDisabled();
    await dialog.getByTestId("approve").check();
    await expect(dialog.getByTestId("add-to-basket")).toBeEnabled();
    await shot(page, info, "04-proof");
    await dialog.getByTestId("add-to-basket").click();
    await expect(dialog.getByTestId("added-notice")).toBeVisible();

    // Basket: server-confirmed prices, checkout honestly disabled without Stripe test keys.
    await page.goto("/basket");
    await expect(page.getByTestId("basket-line")).toHaveCount(1);
    await expect(page.getByTestId("server-price-status")).toContainText("Prices confirmed by the server");
    await expect(page.getByTestId("checkout-disabled")).toBeDisabled();
    await expect(page.getByTestId("checkout-status")).toContainText("Stripe test keys haven't been added");
    await shot(page, info, "05-basket");

    // Reload: basket and logo persist on this device.
    await page.reload();
    await expect(page.getByTestId("basket-line")).toHaveCount(1);
    await expectLogoReady(page);
    expect(await currentArtworkId(page)).toBe(artworkId);
    await page.goto("/products/white-glossy-mug");
    await expect(page.getByRole("group", { name: "Size" }).getByRole("button", { name: "15 oz" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("placement-both")).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("artwork intake safety", () => {
  test("rejects unsupported, hostile, oversized and over-pixel files", async ({ page }, info) => {
    await freshStart(page);
    const toast = page.locator(".toast.alert");
    await uploadLogo(page, "fake.png");
    await expect(toast).toContainText("Please upload a PNG, JPEG or SVG file.");
    await uploadLogo(page, "hostile.svg");
    await expect(toast).toContainText("contains scripts");
    await uploadLogo(page, "huge-dimensions.png");
    await expect(toast).toContainText("too many pixels");
    // 26 MB PNG generated at test time (not stored in git).
    const header = Buffer.from("89504e470d0a1a0a0000000d49484452000007d0000007d00806000000", "hex");
    await page.setInputFiles('[data-testid="logo-input"]', { name: "big.png", mimeType: "image/png", buffer: Buffer.concat([header, Buffer.alloc(26 * 1024 * 1024)]) });
    await expect(toast).toContainText("over the 25 MB limit");
    await expect(page.getByTestId("logo-chip")).toHaveCount(0);
    await shot(page, info, "06-invalid-file");
  });

  test("low-resolution artwork warns, needs acknowledgement, and blocks when unprintable", async ({ page }, info) => {
    test.skip(!isDesktop(info.project.name) && info.project.name !== "mobile-390", "covered on desktop and one phone");
    await freshStart(page);
    await uploadLogo(page, "logo-lowres.png");
    await expectLogoReady(page);
    await page.goto("/products/white-glossy-mug");
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-state", /ready|fallback/);
    await expect(page.getByTestId("dpi-status")).toHaveAttribute("data-rating", "low");
    await page.getByTestId("review-proof").click();
    const dialog = page.getByTestId("proof-dialog");
    await dialog.getByTestId("approve").check();
    await expect(dialog.getByTestId("add-to-basket")).toBeDisabled();
    await dialog.getByTestId("ack-low").check();
    await expect(dialog.getByTestId("add-to-basket")).toBeEnabled();
    await dialog.getByRole("button", { name: "Close proof" }).click();
    const slider = page.getByTestId("logo-width");
    await slider.focus();
    await page.keyboard.press("End");
    await expect(page.getByTestId("dpi-status")).toHaveAttribute("data-rating", "too-low");
    await expect(page.getByTestId("review-proof")).toBeDisabled();
    await shot(page, info, "07-low-res-blocked");
  });

  test("JPEG keeps its aspect ratio and warns about its solid background; logo can be replaced and removed", async ({ page }, info) => {
    test.skip(!isDesktop(info.project.name), "desktop only");
    await freshStart(page);
    await uploadLogo(page, "logo-white.jpg");
    await expectLogoReady(page);
    await page.goto("/products/white-glossy-mug");
    await expect(page.getByText("JPEG has no transparency")).toBeVisible();
    const size = await page.getByTestId("logo-size").innerText();
    const [w, h] = size.replace(" mm", "").split("×").map(Number);
    expect(w / h).toBeCloseTo(1200 / 500, 1);
    // Replace with a vector logo, then remove it entirely.
    await uploadLogo(page, "logo.svg");
    await expect(page.getByTestId("dpi-status")).toHaveAttribute("data-rating", "vector");
    await page.getByTestId("remove-logo").first().click();
    await expect(page.getByTestId("logo-chip")).toHaveCount(0);
    await expect(page.getByTestId("upload-to-continue")).toBeVisible();
  });
});

test.describe("catalogue, trade quotes, motion and fallbacks", () => {
  test("rail: filters, real colours and placements", async ({ page }, info) => {
    test.skip(!isDesktop(info.project.name) && info.project.name !== "mobile-390", "covered on desktop and one phone");
    await freshStart(page);
    const items = page.getByTestId("rail").locator(".rail-item");
    await expect(items).toHaveCount(7);
    await page.getByTestId("filter-tees").click();
    await expect(items).toHaveCount(2);
    await page.getByTestId("filter-caps").click();
    await expect(items).toHaveCount(1);
    await expect(page.getByTestId("rail-name")).toHaveText("Sunwashed Cap");
    const img = items.first().locator("img");
    const before = await img.getAttribute("src");
    await page.getByRole("group", { name: "Colour" }).getByRole("button").nth(2).click();
    await expect(img).not.toHaveAttribute("src", before!);
    await page.getByTestId("rail-open").click();
    await expect(page.getByRole("group", { name: "Logo position" }).getByRole("button")).toHaveText(["Front (embroidered)", "Left side", "Right side", "Back"]);
    await page.getByTestId("filter-hoodies").click();
    await page.getByTestId("rail").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("rail-name")).toHaveText("Oversized Heavyweight Hoodie");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("rail-name")).toHaveText("Premium Pullover Hoodie");
    await shot(page, info, "02-rail");
  });

  test("trade item → proof → prepared quote (never sent)", async ({ page }, info) => {
    test.skip(!isDesktop(info.project.name) && info.project.name !== "mobile-375", "covered on desktop and one phone");
    await freshStart(page);
    await uploadLogo(page, "logo.svg");
    await expectLogoReady(page);
    await page.goto("/products/ballpoint-pen");
    await expect(page.getByTestId("qty")).toHaveValue("25");
    await page.getByTestId("review-proof").click();
    const dialog = page.getByTestId("proof-dialog");
    await dialog.getByTestId("approve").check();
    await dialog.getByTestId("add-to-basket").click();
    await expect(dialog.getByTestId("added-notice")).toContainText("trade quote");
    await page.goto("/quote");
    await page.getByTestId("prepare-quote").click();
    await expect(page.getByTestId("prepared-quote")).toContainText("not a quote");
    await expect(page.getByTestId("prepared-quote")).toContainText("prepared not sent");
    await shot(page, info, "08-trade-quote");
  });

  test("reduced motion: rail items do not animate", async ({ browser }, info) => {
    test.skip(!isDesktop(info.project.name) && info.project.name !== "mobile-390", "covered on desktop and one phone");
    const context = await browser.newContext({ ...info.project.use, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const duration = await page.locator(".rail-item").first().evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe("0s");
    await context.close();
  });

  test("without WebGL the site still works and says so", async ({ browser }, info) => {
    test.skip(!isDesktop(info.project.name), "desktop only");
    const context = await browser.newContext({ ...info.project.use });
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, ...args: unknown[]) => unknown;
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        value: function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
          if (String(type).startsWith("webgl")) return null;
          return original.call(this, type, ...rest);
        },
      });
    });
    const page = await context.newPage();
    await page.goto("/products/white-glossy-mug");
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-state", "fallback");
    await expect(page.getByText("3D preview isn't available on this device")).toBeVisible();
    await context.close();
  });
});

test.describe("server trust boundaries", () => {
  test("APIs price on the server, reject bad baskets and keep checkout disabled", async ({ request }, info) => {
    test.skip(!isDesktop(info.project.name), "desktop only");
    const line = {
      id: "line-e2e-0001",
      productId: "mug",
      variantId: "11oz",
      colourId: "white",
      placementId: "front",
      qty: 2,
      design: { widthMm: 50, offsetYmm: 0 },
      artwork: { hash: "a1b2c3d4e5f60718293a4b5c6d7e8f90", name: "logo.svg", kind: "vector", widthPx: 400, heightPx: 200, hasAlpha: true },
      proof: { approvedAt: "2026-10-10T12:00:00.000Z", version: 1 },
    };
    const priced = await request.post("/api/price", { data: { lines: [{ ...line, unitPence: 1 }], context: "checkout" } });
    expect(priced.ok()).toBe(true);
    const body = await priced.json();
    expect(body.lines[0].unitPence).toBe(1400);
    expect(body.totalPence).toBe(2800 + 495);

    const trade = await request.post("/api/checkout", { data: { lines: [{ ...line, productId: "pen", variantId: "standard", colourId: "black", placementId: "barrel", qty: 100, design: { widthMm: 13, offsetYmm: 0 } }] } });
    expect(trade.status()).toBe(422);

    const checkout = await request.post("/api/checkout", { data: { lines: [line] } });
    expect(checkout.status()).toBe(503);
    expect((await checkout.json()).code).toBe("checkout_not_configured");

    const status = await request.get("/api/checkout");
    expect(await status.json()).toMatchObject({ enabled: false, mode: "disabled" });

    const webhook = await request.post("/api/stripe/webhook", { data: "{}", headers: { "stripe-signature": "t=1,v1=forged" } });
    expect(webhook.status()).toBe(503);

    const success = await request.get("/checkout/success?session_id=cs_test_fake");
    expect(await success.text()).toContain("Checkout isn");
  });
});
