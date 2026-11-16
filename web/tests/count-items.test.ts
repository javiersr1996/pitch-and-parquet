import { createElement as h, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { countItems } from "../lib/count-items";

// What a fold's summary counts (P32): the list items of a piece of JSX.
describe("countItems", () => {
  it("counts the items of a list", () => {
    expect(countItems(h("ul", null, h("li", null, "a"), h("li", null, "b"), h("li", null, "c")))).toBe(3);
  });

  it("finds them at any depth and in fragments, but not a list inside an item", () => {
    const nested = h("li", null, "a", h("ul", null, h("li", null, "a.1"), h("li", null, "a.2")));
    expect(countItems([h("p", { key: "p" }, "intro"), h(Fragment, { key: "f" }, h("ol", null, nested, h("li", null, "b")))])).toBe(2);
  });

  it("is zero for text, nothing, or a list with no items", () => {
    expect(countItems("text")).toBe(0);
    expect(countItems(null)).toBe(0);
    expect(countItems(h("ul", null))).toBe(0);
  });
});
