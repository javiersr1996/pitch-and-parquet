"use client";

import { type ReactNode, useEffect, useRef } from "react";

// The id the address points at, or "" (a malformed escape is no target).
function hashId(): string {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return "";
  }
}

// Reference material folded under its heading (P32, task 209): a `<details>` whose summary says what
// is inside and how much. Closed, its content is still in the HTML, where the figures' checks read
// it. It opens on its own when the address points at its heading (`heading`) or at anything inside
// it, on load and on every `hashchange`, and for printing, closing again after if it was closed.
export function Fold({
  heading,
  summary,
  className,
  children,
}: {
  heading?: string;
  summary: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const fold = ref.current;
    if (!fold) return;
    const reveal = () => {
      const id = hashId();
      const target = id ? document.getElementById(id) : null;
      if (!target || fold.open || (id !== heading && !fold.contains(target))) return;
      fold.open = true;
      // The heading sits above the fold and stays put; a target inside it has only now got a place.
      if (id !== heading) target.scrollIntoView();
    };
    let closed = false;
    const beforePrint = () => {
      closed = !fold.open;
      fold.open = true;
    };
    const afterPrint = () => {
      if (closed) fold.open = false;
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("hashchange", reveal);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [heading]);
  return (
    <details ref={ref} className={["fold", className].filter(Boolean).join(" ")} data-fold={heading}>
      <summary>{summary}</summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
