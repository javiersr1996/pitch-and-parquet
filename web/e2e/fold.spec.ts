import { expect, test } from "@playwright/test";
import { LESSONS, lessonHref } from "../lib/learn/series";
import { hydrated, openFold } from "./fold";

// P32, task 209: a lesson's reference material (Limitations, Reproduce it, Further reading) folded
// under its heading. Closed on load with every word still in the HTML, its summary saying what is
// inside and how much; the address opens it, on load and on `hashchange`, by its heading or by
// anything inside it; printing opens all of them and closes them again after.
const ROUTES = LESSONS.filter((l) => l.status === "published").map(lessonHref);
const FOLDS = ["limitations-h", "reproduce-h", "reading-h"];

test("every published lesson folds its three reference sections, closed, under headings that show", async ({ page }) => {
  expect(ROUTES).toHaveLength(12);
  for (const route of ROUTES) {
    await page.goto(route);
    for (const id of FOLDS) {
      const heading = page.locator(`h2#${id}`);
      const fold = page.locator(`details[data-fold="${id}"]`);
      await expect(heading, `${route} ${id}`).toBeVisible();
      await expect(fold, `${route} ${id}`).not.toHaveAttribute("open");
      // The fold follows its heading inside the same section.
      expect(await fold.evaluate((d, h) => d.parentElement === document.getElementById(h)?.parentElement, id)).toBe(true);
      // What it hides is in the HTML, off the screen.
      const body = fold.locator(".fold-body");
      expect((await body.textContent())!.trim().length, `${route} ${id}`).toBeGreaterThan(40);
      await expect(body).toBeHidden();
      // The summary says what and how much: a count in words, which the prose checks allow.
      const summary = (await fold.locator(":scope > summary").textContent())!.trim();
      expect(summary, `${route} ${id}`).toMatch(/^(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|The query)\b/);
      expect(summary).not.toMatch(/\d/);
    }
    await expect(page.locator('details[data-fold="reproduce-h"] figure.run-here')).toBeHidden();
    // Try it yourself is not folded.
    await expect(page.locator("#try-h ~ ul").first()).toBeVisible();
  }
});

test("a summary's count is the number of items it hides", async ({ page }) => {
  await page.goto("/learn/clock");
  const counted = await page.locator("details[data-fold]").evaluateAll((folds) =>
    folds.map((d) => ({
      id: d.getAttribute("data-fold"),
      summary: d.querySelector(":scope > summary")!.textContent,
      items: d.querySelectorAll(".fold-body > ul > li, .fold-body > ol > li").length,
    })),
  );
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  for (const c of counted) {
    const n = words.indexOf(c.summary!.match(/^The query, (\w+)/)?.[1] ?? c.summary!.split(" ")[0].toLowerCase());
    expect(n, `${c.id}: ${c.summary}`).toBe(c.items);
  }
});

test("the address opens a fold by its heading on load, and only that one", async ({ page }) => {
  await page.goto("/learn/clock#reproduce-h");
  await expect(page.locator('details[data-fold="reproduce-h"]')).toHaveAttribute("open", "");
  await expect(page.locator('details[data-fold="limitations-h"]')).not.toHaveAttribute("open");
  await expect(page.locator('details[data-fold="reading-h"]')).not.toHaveAttribute("open");
  await expect(page.locator("h2#reproduce-h")).toBeInViewport();
  await expect(page.locator("figure.run-here")).toBeVisible();
});

test("an address inside a fold opens it and brings the target into view", async ({ page }) => {
  await page.goto("/learn/gravity#run-here-h");
  await expect(page.locator('details[data-fold="reproduce-h"]')).toHaveAttribute("open", "");
  await expect(page.locator("h3#run-here-h")).toBeInViewport();
});

test("a hashchange opens the fold it points at", async ({ page }) => {
  await page.goto("/learn/pass");
  await hydrated(page);
  const fold = page.locator('details[data-fold="reading-h"]');
  await expect(fold).not.toHaveAttribute("open");
  await page.evaluate(() => {
    location.hash = "#reading-h";
  });
  await expect(fold).toHaveAttribute("open", "");
  await expect(page.locator('details[data-fold="limitations-h"]')).not.toHaveAttribute("open");
});

test("printing opens every fold and closes again the ones that were closed", async ({ page }) => {
  await page.goto("/learn/entry");
  await hydrated(page);
  await openFold(page, "limitations-h");
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  for (const id of FOLDS) await expect(page.locator(`details[data-fold="${id}"]`)).toHaveAttribute("open", "");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator('details[data-fold="limitations-h"]')).toHaveAttribute("open", "");
  await expect(page.locator('details[data-fold="reproduce-h"]')).not.toHaveAttribute("open");
  await expect(page.locator('details[data-fold="reading-h"]')).not.toHaveAttribute("open");
});

// P32b, task 215: a chip tapped before React has hydrated is a plain link; the router then writes
// back the address it started with. The fold still opens, and the address gets its hash back.
test("a chapter's chip tapped before hydration opens its fold, on a CPU six times slower", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  // The scripts are held back until the tap, as on a slow network, so the tap lands on the server's
  // HTML: on a busy CPU alone a click waits for the main thread, which is hydrating.
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route((url) => url.pathname.startsWith("/_next/static/") && url.pathname.endsWith(".js"), async (route) => {
    await held;
    await route.continue();
  });
  const bar = page.locator(".chapters-progress > span[style]");
  await page.goto("/learn/pass", { waitUntil: "domcontentloaded" });
  await page.locator('.chapters a[href="#reading-h"]').click();
  // The tap came before hydration, or this test would not be testing it.
  expect(await bar.count()).toBe(0);
  await expect(page).toHaveURL(/#reading-h$/);
  release();
  await expect(bar).toBeAttached({ timeout: 30_000 });
  await expect(page.locator('details[data-fold="reading-h"]')).toHaveAttribute("open", "");
  await expect(page.locator('details[data-fold="reproduce-h"]')).not.toHaveAttribute("open");
  await expect(page).toHaveURL(/#reading-h$/);
});

test("a fold opens and closes from the keyboard", async ({ page }) => {
  await page.goto("/learn/dribble");
  const summary = page.locator('details[data-fold="limitations-h"] > summary');
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('details[data-fold="limitations-h"]')).toHaveAttribute("open", "");
  await expect(page.locator('details[data-fold="limitations-h"] .fold-body li').first()).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.locator('details[data-fold="limitations-h"]')).not.toHaveAttribute("open");
});
