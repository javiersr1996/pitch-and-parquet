import { expect, type Page } from "@playwright/test";

// A fold (P32, task 209) is a `<details data-fold="<heading id>">`: closed on load, its content is in
// the HTML but not on screen, so a test that reads or drives it opens it first, the way a reader
// does, by its summary.
export async function openFold(page: Page, heading: string) {
  const fold = page.locator(`details[data-fold="${heading}"]`);
  if (!(await fold.evaluate((d) => (d as HTMLDetailsElement).open))) await fold.locator(":scope > summary").click();
  await expect(fold).toHaveAttribute("open", "");
}
