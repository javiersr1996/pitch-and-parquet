import type { ReactNode } from "react";
import { countItems } from "../../lib/count-items";
import { countWord } from "../../lib/format";
import { Fold } from "../site/Fold";

// "Further reading", the last section of every lesson, folded under its heading (P32): the items
// are the list's `<li>`s, and the summary counts them.
export function FurtherReading({ children }: { children: ReactNode }) {
  const n = countItems(children);
  return (
    <section aria-labelledby="reading-h">
      <h2 id="reading-h">Further reading</h2>
      <Fold heading="reading-h" summary={`${countWord(n, true)} ${n === 1 ? "source" : "sources"} to read next`}>
        <ul>{children}</ul>
      </Fold>
    </section>
  );
}
