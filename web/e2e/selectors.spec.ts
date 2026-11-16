import { expect, type Locator, type Page, test } from "@playwright/test";
import { hydrated } from "./fold";

// P32, task 211: the long repeated lists outside the lessons. Tabs on /euroleague (runs, comebacks,
// by team) and on /tracking/pose (one match at a time, twice), each opening on what came first
// before and driven by the arrow keys; folds on /engineering and /engineering/history; Explore on
// the home as a row that scrolls sideways on a phone and the grid on a desktop.
const PHONE = { width: 390, height: 844 };

async function shown(tabs: Locator): Promise<string[]> {
  return tabs.locator('[role="tabpanel"]').evaluateAll((ps) => ps.filter((p) => !(p as HTMLElement).hidden).map((p) => p.getAttribute("data-panel")!));
}

// The tabs pattern: one tab selected and in the tab order, its panel the one on show; the arrows
// move and select, Home and End go to the ends.
async function arrows(page: Page, tabs: Locator, keys: string[]) {
  const tab = tabs.getByRole("tab");
  const n = await tab.count();
  expect(n).toBeGreaterThanOrEqual(2);
  await tab.first().focus();
  const at = async (i: number) => {
    await expect(tab.nth(i)).toHaveAttribute("aria-selected", "true");
    await expect(tab.nth(i)).toBeFocused();
    await expect(tab.nth(i)).toHaveAttribute("tabindex", "0");
    expect(await shown(tabs)).toEqual([keys[i]]);
    await expect(tabs.locator(`[role="tabpanel"][data-panel="${keys[i]}"]`)).toBeVisible();
  };
  await at(0);
  await page.keyboard.press("ArrowRight");
  await at(1);
  await page.keyboard.press("End");
  await at(n - 1);
  await page.keyboard.press("ArrowRight");
  await at(0);
  await page.keyboard.press("ArrowLeft");
  await at(n - 1);
  await page.keyboard.press("Home");
  await at(0);
}

test("runs and comebacks: three tabs, the runs first, driven by the arrow keys", async ({ page }) => {
  await page.goto("/euroleague");
  await hydrated(page);
  const tabs = page.locator(".el-streak-tabs");
  await expect(tabs.getByRole("tablist", { name: "Runs and comebacks" })).toBeVisible();
  await expect(tabs.getByRole("tab")).toHaveText(["Runs", "Comebacks", "By team"]);
  // What came first before the tabs is what shows on load; the rest is in the HTML, hidden.
  expect(await shown(tabs)).toEqual(["runs"]);
  await expect(tabs.getByRole("heading", { name: "Biggest runs" })).toBeVisible();
  await expect(page.locator('[data-ranking="comebacks"] > li').first()).toBeHidden();
  expect(await page.locator('[data-ranking="comebacks"] > li').count()).toBeGreaterThan(0);
  expect(await page.locator("[data-streak-team]").count()).toBeGreaterThan(0);
  await arrows(page, tabs, ["runs", "comebacks", "teams"]);
  // With a modifier held the key is the browser's, not the tabs'.
  await page.keyboard.press("Control+ArrowRight");
  await page.keyboard.press("Meta+End");
  expect(await shown(tabs)).toEqual(["runs"]);
  // A click selects too.
  await tabs.getByRole("tab", { name: "By team" }).click();
  await expect(page.locator("[data-streak-team]").first()).toBeVisible();
});

test("pose: one match at a time in both tables, the first match first, driven by the arrow keys", async ({ page }) => {
  const summary = (await (await page.request.get("/data/pose.json")).json()) as { tables: { matches: Record<string, unknown> } | null };
  test.skip(summary.tables === null, "a pose that died publishes no table");
  const matches = Object.keys(summary.tables!.matches);
  await page.goto("/tracking/pose");
  await hydrated(page);
  for (const [section, table] of [
    ["tables", "players"],
    ["m3", "m3"],
  ]) {
    const tabs = page.locator(`[data-section="${section}"] .tabs`);
    await expect(tabs.getByRole("tab")).toHaveCount(matches.length);
    // Each tab names its match.
    for (const [i, m] of matches.entries()) await expect(tabs.getByRole("tab").nth(i)).toContainText(m);
    expect(await shown(tabs)).toEqual([matches[0]]);
    await expect(page.locator(`table[data-table="${table}"][data-match="${matches[0]}"]`)).toBeVisible();
    for (const m of matches.slice(1)) await expect(page.locator(`table[data-table="${table}"][data-match="${m}"]`)).toBeHidden();
    await arrows(page, tabs, matches);
  }
});

test("/engineering folds its two reference tables, each summary counting its rows", async ({ page }) => {
  const platform = (await (await page.request.get("/data/platform.json")).json()) as { matches: unknown[] };
  await page.goto("/engineering");
  await hydrated(page);
  const matches = page.locator('details[data-fold="matches"]');
  const silver = page.locator('details[data-fold="silver-models"]');
  for (const fold of [matches, silver]) {
    await expect(fold).not.toHaveAttribute("open");
    await expect(fold.locator("table")).toBeHidden();
  }
  await expect(matches.locator(":scope > summary")).toHaveText(new RegExp(`^${platform.matches.length} matches by 9 columns`));
  expect(await matches.locator("tbody tr").count()).toBe(platform.matches.length);
  const rows = await silver.locator("tbody tr").count();
  await expect(silver.locator(":scope > summary")).toHaveText(new RegExp(`^${rows} silver nodes`));
  // The chapter's link opens it.
  await page.locator('.chapters a[href="#silver-models"]').click();
  await expect(silver).toHaveAttribute("open", "");
  await expect(silver.locator("table")).toBeVisible();
});

test("/engineering/history folds the partial selections, never the complete build", async ({ page }) => {
  await page.goto("/engineering/history");
  const series = page.locator("[data-series]");
  const n = await series.count();
  expect(n).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < n; i++) {
    const s = series.nth(i);
    const id = await s.getAttribute("data-series");
    // The verdict stays on show either way.
    await expect(s.locator("[data-verdicts]")).toBeVisible();
    if (id === "complete") {
      await expect(s.locator("details.fold")).toHaveCount(0);
      await expect(s.locator("[data-reasons]")).toBeVisible();
    } else {
      const fold = s.locator("details.fold");
      await expect(fold).not.toHaveAttribute("open");
      await expect(s.locator("[data-reasons]")).toBeHidden();
      await expect(fold.locator(":scope > summary")).toHaveText(/^\d+ steps, run by run/);
      await fold.locator(":scope > summary").click();
      await expect(s.locator("[data-reasons]")).toBeVisible();
    }
  }
});

// P32b, task 214: /engineering, shorter. On a phone the layers, the sources and the guarantees are
// rows that scroll sideways; the architecture stays whole; the lineage graph folds.
const ROWS = [".platform-layers", ".platform-sources", ".platform-guarantees"];

test("/engineering on a phone: three sideways rows, the architecture whole, the page no wider", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/engineering");
  for (const sel of ROWS) {
    const row = await page.locator(sel).evaluate((el) => ({
      scrolls: el.scrollWidth > el.clientWidth,
      snap: getComputedStyle(el).scrollSnapType,
      tops: new Set([...el.children].map((c) => Math.round(c.getBoundingClientRect().top))).size,
      cards: el.children.length,
    }));
    expect(row.cards, sel).toBeGreaterThanOrEqual(3);
    expect(row.scrolls, sel).toBe(true);
    expect(row.snap, sel).toBe("x mandatory");
    expect(row.tops, sel).toBe(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width);
  // The overview is not in a row or a fold, and fits the width.
  const arch = page.locator("figure.arch");
  await expect(arch).toBeVisible();
  expect(await arch.evaluate((f) => !!f.closest("details, .platform-layers"))).toBe(false);
  expect((await arch.boundingBox())!.width).toBeLessThanOrEqual(PHONE.width);
  // The layers' row has no link to tab to, so it takes the focus itself and the arrows scroll it.
  const layers = page.locator(".platform-layers");
  await layers.focus();
  await expect(layers).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => layers.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
});

test("/engineering on a desktop: the rows are the grids they were", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/engineering");
  for (const sel of ROWS) {
    expect(await page.locator(sel).evaluate((el) => el.scrollWidth > el.clientWidth), sel).toBe(false);
  }
  // Six layers in one line, the sources in two columns.
  const tops = (sel: string) =>
    page.locator(`${sel} > *`).evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size);
  expect(await tops(".platform-layers")).toBe(1);
  expect(await tops(".platform-sources")).toBe(2);
});

test("/engineering folds the lineage graph, its summary counting what lineage.json has", async ({ page }) => {
  const lineage = (await (await page.request.get("/data/lineage.json")).json()) as { nodes: unknown[]; edges: unknown[] };
  await page.goto("/engineering");
  await hydrated(page);
  const fold = page.locator('details[data-fold="lineage"]');
  await expect(fold).not.toHaveAttribute("open");
  await expect(fold.locator("figure.lineage")).toBeHidden();
  await expect(fold.locator(":scope > summary")).toHaveText(
    `The asset graph: ${lineage.nodes.length} nodes and ${lineage.edges.length} edges, to hover or tap`,
  );
  await page.locator('.chapters a[href="#lineage"]').click();
  await expect(fold).toHaveAttribute("open", "");
  await expect(fold.locator("figure.lineage")).toBeVisible();
});

test.describe("Explore on the home", () => {
  test("on a phone, one row that scrolls sideways and snaps, inside the page's width", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/");
    const row = page.locator(".home-explore .cards");
    const box = await row.evaluate((ul) => ({
      scrolls: ul.scrollWidth > ul.clientWidth,
      snap: getComputedStyle(ul).scrollSnapType,
      tops: [...ul.children].map((li) => Math.round(li.getBoundingClientRect().top)),
    }));
    expect(box.scrolls).toBe(true);
    expect(box.snap).toBe("x mandatory");
    expect(new Set(box.tops).size).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width);
    // The keyboard brings a card past the edge into the row.
    const last = row.locator(".card h3 a").last();
    await last.focus();
    await expect(last).toBeInViewport();
  });

  test("on a desktop, the grid as before: several rows, nothing to scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const box = await page.locator(".home-explore .cards").evaluate((ul) => ({
      scrolls: ul.scrollWidth > ul.clientWidth,
      tops: new Set([...ul.children].map((li) => Math.round(li.getBoundingClientRect().top))).size,
    }));
    expect(box.scrolls).toBe(false);
    expect(box.tops).toBeGreaterThan(1);
  });
});
