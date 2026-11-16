import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// P32b, task 215: a layout that changes at a width changes on one breakpoint, written as a pair with
// no gap between its sides: `(width < X)` below and `(min-width: X)` from X. A `max-width: 39.98rem`
// against a `min-width: 640px` left a band of 0.3 px where the home's Explore was neither a row nor
// two columns.
//
// Mutation checked by hand, restored after: the Explore row back at `(max-width: 39.98rem)`: "the
// home's Explore" fails.

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");

// Every top-level @media block: its condition and its body.
function mediaBlocks(): { query: string; body: string }[] {
  const out: { query: string; body: string }[] = [];
  for (const m of css.matchAll(/@media ([^{]+)\{/g)) {
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    while (depth > 0 && i < css.length) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    out.push({ query: m[1].trim(), body: css.slice(start, i - 1) });
  }
  return out;
}

// The conditions of the @media blocks with a rule for `selector` that declares `declaration`.
function queriesOf(selector: string, declaration: string): string[] {
  return mediaBlocks()
    .filter(({ body }) =>
      [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(
        (r) => r[1].split(",").some((s) => s.trim() === selector) && r[2].includes(declaration),
      ),
    )
    .map(({ query }) => query);
}

const PAIRS = [
  { name: "the home's Explore", below: [".home-explore .cards", "grid-auto-flow: column"], above: [".cards", "repeat(2, minmax(0, 1fr))"] },
  { name: "the chapters strip and rail", below: ['.chapters ol:not([data-end="true"])', "mask-image"], above: [".chapters-row", "position: absolute"] },
  { name: "/engineering's layers", below: [".platform-layers", "grid-auto-flow: column"], above: [".platform-layers", "repeat(2, minmax(0, 1fr))"] },
  { name: "/engineering's sources", below: [".platform-sources", "grid-auto-flow: column"], above: [".platform-sources", "repeat(2, minmax(0, 1fr))"] },
] as const;

describe("a layout that changes at a width has one breakpoint, with no gap", () => {
  for (const { name, below, above } of PAIRS) {
    it(name, () => {
      const lo = queriesOf(below[0], below[1]);
      const hi = queriesOf(above[0], above[1]);
      expect(lo, `${name}: the narrow side`).toHaveLength(1);
      expect(hi, `${name}: the wide side`).toHaveLength(1);
      const x = hi[0].match(/^\(min-width: ([\d.]+(?:px|rem))\)$/)?.[1];
      expect(x, `${name}: ${hi[0]}`).toBeDefined();
      expect(lo[0]).toBe(`(width < ${x})`);
    });
  }
});
