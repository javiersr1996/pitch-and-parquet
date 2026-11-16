import { expect, type Page, test } from "@playwright/test";
import { LESSONS, lessonHref } from "../lib/learn/series";

// P32, task 210: the chapters strip. Its links are the page's h2s, passed by the page and checked
// here against what it draws; the current one follows the scroll; a link lands its heading clear of
// the strip and opens the chapter's fold; a rail in the left margin where the wrap leaves room.
const PAGES = [
  ...LESSONS.filter((l) => l.status === "published").map(lessonHref),
  "/engineering",
  "/engineering/history",
  "/euroleague",
  "/tracking/pose",
];
const PHONE = { width: 390, height: 844 };
const current = (page: Page) => page.locator('.chapters a[aria-current="location"]');

async function open(page: Page, route: string) {
  await page.goto(route);
  // /tracking/pose draws its chapters once pose.json is in.
  await expect(page.locator(".chapters a").first()).toBeAttached();
}

test("the strip's links are the page's h2s, in order, each with its heading's text", async ({ page }) => {
  for (const route of PAGES) {
    await open(page, route);
    const links = await page.locator(".chapters a").evaluateAll((as) =>
      as.map((a) => ({ id: a.getAttribute("href")!.slice(1), label: a.textContent!.trim() })),
    );
    const heads = await page.locator("main h2").evaluateAll((hs) =>
      hs.filter((h) => !h.closest(".chapters")).map((h) => ({ id: h.id, label: h.textContent!.replace(/\s+/g, " ").trim() })),
    );
    expect(links, route).toEqual(heads);
    expect(links.length, route).toBeGreaterThanOrEqual(3);
  }
});

test("the home page has no strip: it is a way in, not a long read", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".chapters")).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({ viewport: PHONE });

  test("the current chapter follows the scroll down the page, and the bar fills", async ({ page }) => {
    await open(page, "/learn/gravity");
    await expect(current(page)).toHaveCount(0);
    const progress = () =>
      page.locator(".chapters-progress > span").evaluate((s) => Number(getComputedStyle(s).getPropertyValue("--progress")));
    expect(await progress()).toBe(0);
    for (const [id, label] of [
      ["question-h", "The question"],
      ["matches-h", "From one shot to every match"],
      ["try-h", "Try it yourself"],
    ]) {
      await page.evaluate((h) => document.getElementById(h)!.scrollIntoView(), id);
      await expect(current(page)).toHaveText(label);
      // The strip keeps the current chapter in sight.
      await expect(current(page)).toBeInViewport({ ratio: 0.9 });
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(current(page)).toHaveText("Further reading");
    await expect.poll(progress).toBeCloseTo(1, 2);
    // Back to the top, no chapter is current.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(current(page)).toHaveCount(0);
  });

  test("the strip stays at the top while the page scrolls", async ({ page }) => {
    for (const route of ["/learn/clock", "/engineering", "/euroleague", "/tracking/pose", "/engineering/history"]) {
      await open(page, route);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
      const box = (await page.locator(".chapters").boundingBox())!;
      expect(box.y, route).toBe(0);
      expect(box.height, route).toBeLessThan(60);
      // No sideways scroll for the page: the strip scrolls inside itself.
      expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(PHONE.width);
    }
  });

  test("a link lands its heading under the strip, not behind it, and opens a folded chapter", async ({ page }) => {
    await open(page, "/learn/speed");
    const fold = page.locator('details[data-fold="reproduce-h"]');
    await expect(fold).not.toHaveAttribute("open");
    await page.locator('.chapters a[href="#reproduce-h"]').click();
    await expect(fold).toHaveAttribute("open", "");
    await expect(page).toHaveURL(/#reproduce-h$/);
    await expect(current(page)).toHaveText("Reproduce it");
    const strip = (await page.locator(".chapters").boundingBox())!;
    const head = (await page.locator("#reproduce-h").boundingBox())!;
    expect(head.y).toBeGreaterThanOrEqual(strip.y + strip.height);
    expect(head.y + head.height).toBeLessThanOrEqual(PHONE.height);
    // A chapter with no fold is only scrolled to.
    await page.locator('.chapters a[href="#concept-h"]').click();
    await expect(current(page)).toHaveText("Finite differences");
    const concept = (await page.locator("#concept-h").boundingBox())!;
    expect(concept.y).toBeGreaterThanOrEqual(strip.height);
  });

  test("a chapter closed by the reader opens again from its link", async ({ page }) => {
    await open(page, "/learn/rebound");
    await page.locator('.chapters a[href="#limitations-h"]').click();
    const fold = page.locator('details[data-fold="limitations-h"]');
    await expect(fold).toHaveAttribute("open", "");
    await fold.locator(":scope > summary").click();
    await expect(fold).not.toHaveAttribute("open");
    // The address already says #limitations-h: no hashchange, the link opens it itself.
    await page.locator('.chapters a[href="#limitations-h"]').click();
    await expect(fold).toHaveAttribute("open", "");
  });

  test("the keyboard reaches the strip and follows a link", async ({ page }) => {
    await open(page, "/learn/possession");
    const link = page.locator('.chapters a[href="#reading-h"]');
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator('details[data-fold="reading-h"]')).toHaveAttribute("open", "");
    await expect(page.locator("#reading-h")).toBeInViewport();
  });
});

test("on a desktop at 1440 px the strip sits above the content, one line high", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "/learn/coordinates");
  await page.evaluate(() => document.getElementById("matches-h")!.scrollIntoView());
  await expect(current(page)).toHaveText("From two possessions to every match");
  const strip = (await page.locator(".chapters").boundingBox())!;
  expect(strip.y).toBe(0);
  expect(strip.height).toBeLessThan(60);
  const head = (await page.locator("#matches-h").boundingBox())!;
  expect(head.y).toBeGreaterThanOrEqual(strip.height);
});

test("where the wrap leaves room, a rail in the left margin, clear of the content", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const route of ["/learn/facing", "/engineering", "/euroleague"]) {
    await open(page, route);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    const rail = (await page.locator(".chapters ol").boundingBox())!;
    const items = await page.locator(".chapters li").evaluateAll((lis) => lis.map((li) => li.getBoundingClientRect().left));
    // One column: every link starts at the same x.
    expect(new Set(items).size, route).toBe(1);
    expect(rail.x, route).toBeGreaterThanOrEqual(0);
    expect(rail.y, route).toBeGreaterThanOrEqual(0);
    expect(rail.y + rail.height, route).toBeLessThanOrEqual(1080);
    const left = await page.evaluate(() =>
      Math.min(...[...document.querySelectorAll("main .band > .wrap")].map((w) => w.getBoundingClientRect().left + parseFloat(getComputedStyle(w).paddingLeft))),
    );
    expect(rail.x + rail.width, route).toBeLessThanOrEqual(left);
    // The rail takes no height of its own.
    expect((await page.locator(".chapters").boundingBox())!.height, route).toBe(0);
  }
});

test("with reduced motion nothing new moves", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/learn/clock");
  const durations = await page.evaluate(() =>
    [".chapters a", ".fold > summary"].map((s) => getComputedStyle(document.querySelector(s)!).transitionDuration),
  );
  expect(durations).toEqual(["0s", "0s"]);
});
