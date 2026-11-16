import { expect, test } from "@playwright/test";

// P32, task 212: the length guard. Every route of the sitemap, on a phone (390 x 844), may grow to
// 10 % above the scrollHeight it had once P32 had shortened the long pages (tasks 209 to 211), and no
// more without this table changing in the same commit, where the diff shows it. A route the table
// does not know fails too, and so does a page under half its height: one that did not render is not
// short.
//
// The body text is pinned to Arial for the measure (Liberation Sans on Linux, which has Arial's
// metrics), so the ceilings hold on any machine; system-ui would be Segoe UI here and another font
// in CI. The headings' webfont is the site's own file everywhere.
//
// Mutation checked by hand, restored after: Reproduce without its fold, so "Reproduce it" is open on
// every lesson: every lesson fails and nothing else does.
const MEASURED: Record<string, number> = {
  "/": 6486,
  "/tracking": 2391,
  "/tracking/replay": 2257,
  "/engineering": 8680,
  "/engineering/quality": 5524,
  "/warehouse": 5756,
  "/warehouse/scouting": 4551,
  "/warehouse/positions": 4450,
  "/tracking/pose": 9040,
  "/tracking/occupancy": 5217,
  "/learn": 4469,
  "/sql": 4804,
  "/engineering/bulletin": 6045,
  "/engineering/history": 7214,
  "/learn/gravity": 15153,
  "/learn/speed": 11967,
  "/learn/coordinates": 13430,
  "/learn/rebound": 11551,
  "/learn/cadence": 11751,
  "/learn/clock": 8761,
  "/learn/pass": 8800,
  "/learn/entry": 8811,
  "/learn/dribble": 9355,
  "/learn/possession": 10214,
  "/learn/facing": 12076,
  "/sql/select": 4677,
  "/sql/where": 5555,
  "/sql/expressions": 6052,
  "/sql/group-by": 5956,
  "/sql/joins": 5615,
  "/sql/long-wide": 5835,
  "/sql/windows": 6034,
  "/sql/scouting": 6724,
  "/about": 3921,
};
const SLACK = 1.1;
// What a page draws once its data is in, where it fetches it after load.
const READY: Record<string, string> = { "/tracking/pose": '[data-section="protocol"]' };

test.use({ viewport: { width: 390, height: 844 } });

test("the table and the sitemap list the same routes", async ({ page }) => {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  const routes = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  expect([...routes].sort()).toEqual(Object.keys(MEASURED).sort());
});

for (const [route, measured] of Object.entries(MEASURED)) {
  test(`${route} is no longer than ${Math.floor(measured * SLACK)} px at 390`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    if (READY[route]) await page.locator(READY[route]).waitFor();
    await page.addStyleTag({ content: ':root { --font-body: Arial, "Liberation Sans", sans-serif !important; }' });
    await page.evaluate(() => document.fonts.ready);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`${route}: ${height} px, ${(height / 844).toFixed(1)} screens (measured ${measured})`);
    expect(height, `${route} grew past its ceiling`).toBeLessThanOrEqual(Math.floor(measured * SLACK));
    expect(height, `${route} is under half its height: did it render?`).toBeGreaterThanOrEqual(measured / 2);
  });
}
