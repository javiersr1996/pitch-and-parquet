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
// every lesson: the twelve lessons fail and nothing else does.
const MEASURED: Record<string, number> = {
  "/": 7212,
  "/tracking": 2964,
  "/tracking/replay": 2376,
  "/engineering": 15287,
  "/engineering/quality": 5642,
  "/warehouse": 5874,
  "/warehouse/scouting": 4670,
  "/warehouse/positions": 4569,
  "/tracking/runs": 6162,
  "/tracking/pose": 9158,
  "/tracking/occupancy": 5336,
  "/learn": 4927,
  "/sql": 4923,
  "/euroleague": 10597,
  "/engineering/bulletin": 6163,
  "/engineering/history": 7378,
  "/learn/gravity": 15272,
  "/learn/speed": 12085,
  "/learn/coordinates": 13549,
  "/learn/rebound": 11670,
  "/learn/cadence": 11870,
  "/learn/clock": 8879,
  "/learn/pass": 8919,
  "/learn/entry": 8929,
  "/learn/dribble": 9474,
  "/learn/possession": 10332,
  "/learn/facing": 12194,
  "/learn/expected-points": 11552,
  "/sql/select": 4796,
  "/sql/where": 5673,
  "/sql/expressions": 6171,
  "/sql/group-by": 6075,
  "/sql/joins": 5734,
  "/sql/long-wide": 5953,
  "/sql/windows": 6152,
  "/sql/scouting": 6842,
  "/about": 4065,
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
