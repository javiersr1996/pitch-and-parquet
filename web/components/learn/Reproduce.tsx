import type { ReactNode } from "react";
import { countItems } from "../../lib/count-items";
import { browserSql } from "../../lib/learn/browser-sql";
import { countWord } from "../../lib/format";
import { Fold } from "../site/Fold";
import { RunHere } from "./RunHere";

// "Reproduce it": the public query, shown as text, and the pointers that let a reader run it; then
// "Run it here" (tasks 85 and 86), the lesson's `<browser>.browser.sql` run in the browser on the
// files this page reads. All of it folded under the heading (P32), the summary counting the steps.
export function Reproduce({ sql, browser, children }: { sql: string; browser: string; children: ReactNode }) {
  const steps = countItems(children);
  const summary =
    steps > 0
      ? `The query, ${countWord(steps)} ${steps === 1 ? "step" : "steps"} to run it, and Run it here`
      : "The query and Run it here";
  return (
    <section className="reproduce" aria-labelledby="reproduce-h">
      <h2 id="reproduce-h">Reproduce it</h2>
      <Fold heading="reproduce-h" summary={summary}>
        {children}
        <pre>
          <code>{sql}</code>
        </pre>
        <h3 id="run-here-h">Run it here</h3>
        <p>
          The same figures again, from the files this page already reads: the query below runs in this browser, in DuckDB
          compiled to WebAssembly, and each row names a figure of this lesson and the value it gives for it.
        </p>
        <RunHere {...browserSql(browser)} />
      </Fold>
    </section>
  );
}
