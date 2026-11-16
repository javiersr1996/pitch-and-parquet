import { expect, type Page, test } from "@playwright/test";

// P20, task 175: the home's findings. Each figure is compared with the published file it comes
// from, and each card's claim is looked up on the page the card opens, so the strip neither
// invents a number nor says more than its page.

const json = async <T,>(page: Page, path: string) => (await (await page.request.get(path)).json()) as T;

test("the two findings print their files' figures and open the pages that make the claims", async ({ page }) => {
  type Row = { sport: string; match_id: string; metric: string; value: number };
  const quality = await json<{ hook: { g_real: number }; checks: { gravity: Row[] } }>(page, "/data/quality.json");
  const basketball = quality.checks.gravity.filter((r) => r.sport === "basketball");
  const medians = basketball.filter((r) => r.metric === "g_median").map((r) => r.value);
  const flights = basketball.filter((r) => r.metric === "flights").reduce((n, r) => n + r.value, 0);
  const platform = await json<{ title: string; subtitle: string; layers: unknown[] }>(page, "/data/platform.json");

  await page.goto("/");
  const cards = page.locator("[data-finding]");
  expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-finding")))).toEqual([
    "gravity",
    "bytes",
  ]);
  const fig = (card: string, name: string) => page.locator(`[data-finding="${card}"] [data-fig="${name}"]`);

  // The gravity card counts matches (P34): every match's median against standard gravity, over all
  // of their flights, recounted here from the file's rows.
  await expect(fig("gravity", "medians_below")).toHaveText(String(medians.filter((g) => g < quality.hook.g_real).length));
  await expect(fig("gravity", "sign_n")).toHaveText(String(medians.filter((g) => g !== quality.hook.g_real).length));
  await expect(fig("gravity", "flights")).toHaveText(String(flights));
  await expect(fig("gravity", "g_real")).toHaveText(String(quality.hook.g_real));

  await expect(fig("bytes", "title")).toHaveText(platform.title);
  await expect(fig("bytes", "subtitle")).toHaveText(platform.subtitle);
  await expect(page.locator('[data-finding="bytes"] h3')).toHaveText(`One pipeline run, ${platform.layers.length} layers`);

  // Each claim is its page's own words.
  const claims: [string, string, string[]][] = [
    ["gravity", "/learn/gravity", ["Most flights in every match curve less than gravity says they should."]],
    ["bytes", "/engineering", [`One pipeline run, ${platform.layers.length} layers`]],
  ];
  for (const [card, href, words] of claims) {
    await expect(page.locator(`[data-finding="${card}"] h3 a`)).toHaveAttribute("href", href);
    await expect(page.locator(`[data-finding="${card}"] h3`)).toHaveText(words[0].replace(/\.$/, ""));
    const html = (await (await page.request.get(href)).text()).replace(/<!-- -->/g, "").replace(/\s+/g, " ");
    for (const w of words) expect(html, `${href} says "${w}"`).toContain(w);
  }
  // The whole card opens its page.
  await page.locator('[data-finding="gravity"]').scrollIntoViewIfNeeded();
  const box = (await page.locator('[data-finding="gravity"] .finding-about').boundingBox())!;
  await page.mouse.click(box.x + 4, box.y + 4);
  await expect(page).toHaveURL(/\/learn\/gravity$/);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`at ${viewport.width} px the findings fit, text 16 px or more`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator(".findings").scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const small = await page.locator(".findings").evaluate((ul) =>
      [...ul.querySelectorAll("*")]
        .filter((el) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== ""))
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => el.textContent),
    );
    expect(small).toEqual([]);
    for (const card of await page.locator("[data-finding]").all()) {
      const b = (await card.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(viewport.width);
    }
  });
}
