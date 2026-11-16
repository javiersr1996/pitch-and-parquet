import type { ReactNode } from "react";
import { countItems } from "../../lib/count-items";
import { countWord } from "../../lib/format";
import { Fold } from "../site/Fold";

// Folded under its heading (P32): the summary counts the limitations.
export function Limitations({ children }: { children: ReactNode }) {
  const n = countItems(children);
  return (
    <section className="limitations" aria-labelledby="limitations-h">
      <h2 id="limitations-h">Limitations</h2>
      <Fold heading="limitations-h" summary={`${countWord(n, true)} ${n === 1 ? "limitation" : "limitations"} of this lesson`}>
        {children}
      </Fold>
    </section>
  );
}
