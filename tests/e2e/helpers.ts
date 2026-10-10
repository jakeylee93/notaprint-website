import { expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";

export const FIXTURES = path.join(__dirname, "..", "fixtures");
export const fixture = (name: string) => path.join(FIXTURES, name);

export async function shot(page: Page, info: TestInfo, name: string) {
  const file = path.join(__dirname, ".artifacts", "evidence", `${info.project.name}-${name}.png`);
  await page.screenshot({ path: file });
}

export async function freshStart(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("nota-print");
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  });
  await page.reload();
}

export async function uploadLogo(page: Page, file: string) {
  await page.setInputFiles('[data-testid="logo-input"]', fixture(file));
}

export async function expectLogoReady(page: Page) {
  await expect(page.getByTestId("logo-chip").first()).toBeVisible();
}

export async function waitForHero3D(page: Page) {
  await expect(page.getByTestId("hero-stage")).toHaveAttribute("data-mode", /3d|fallback/, { timeout: 45_000 });
}

/** Wait until the grid thumbnails for the given products were baked with the given artwork. */
export async function waitForPersonalisedGrid(page: Page, products: string[], artworkId?: string) {
  for (const id of products) {
    const img = page.getByTestId(`card-${id}`).locator("img");
    await expect(img).toBeVisible({ timeout: 60_000 });
    if (artworkId) await expect(img).toHaveAttribute("data-artwork", artworkId, { timeout: 60_000 });
  }
}

export async function currentArtworkId(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem("np.artwork.current"));
}
