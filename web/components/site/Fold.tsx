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
// it, on load and on every `hashchange`, and for printing, closing again after if it was closed. On
// load the address may have lost its hash: a link followed before hydration is undone when the router
// writes back the address it started with, but the element the browser went to is still `:target`.
export function Fold({
  heading,
  summary,
  children,
}: {
  heading?: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const fold = ref.current;
    if (!fold) return;
    const reveal = (id: string) => {
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
    const onHash = () => reveal(hashId());
    reveal(hashId() || (document.querySelector(":target")?.id ?? ""));
    window.addEventListener("hashchange", onHash);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [heading]);
  return (
    <details ref={ref} className="fold" data-fold={heading}>
      <summary>{summary}</summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
