"use client";

import { useEffect, useRef, useState } from "react";

export interface Chapter {
  id: string;
  label: string;
}

// Whether the strip has chapters hidden past either edge, as data attributes the CSS fades by.
function markEdges(ol: HTMLOListElement) {
  ol.dataset.start = String(ol.scrollLeft <= 1);
  ol.dataset.end = String(ol.scrollLeft + ol.clientWidth >= ol.scrollWidth - 1);
}

// The page's chapters, fixed at the top while it scrolls (P32, task 210): one link per h2, from the
// list the page passes (never read from the DOM), the current one lit and a bar for how far down the
// page is. A strip that scrolls sideways under 1888 px, a rail in the left margin from there, where
// it fits beside the 1376 px wrap. A chapter counts as current once its heading is above the top
// third of the screen: an IntersectionObserver whose box runs from far above the page down to that
// line says which headings are above it, and a jump past many of them flips each one. At the foot of
// the page the last chapter is current, though on a tall screen its heading never climbs that high. A
// link goes to its heading like any anchor, and opens the chapter's fold if it has one.
export function Chapters({ items }: { items: readonly Chapter[] }) {
  const [above, setAbove] = useState(-1);
  const [atEnd, setAtEnd] = useState(false);
  const active = atEnd ? items.length - 1 : above;
  const list = useRef<HTMLOListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const above = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) above.add(e.target.id);
          else above.delete(e.target.id);
        }
        let last = -1;
        items.forEach((c, i) => {
          if (above.has(c.id)) last = i;
        });
        setAbove(last);
      },
      { rootMargin: "1000000px 0px -67% 0px" },
    );
    for (const c of items) {
      const h = document.getElementById(c.id);
      if (h) io.observe(h);
    }
    return () => io.disconnect();
  }, [items]);

  // A link followed before hydration: the router has written back the address it started with, so
  // the hash goes back for the heading the browser went to, which is still `:target`, and a
  // `hashchange` tells a fold that has already read the address to read it again.
  useEffect(() => {
    const target = document.querySelector(":target");
    if (location.hash || !target || !items.some((c) => c.id === target.id)) return;
    history.replaceState(null, "", `#${target.id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, [items]);

  // The progress bar follows the scroll, once a frame, written straight to its style; the same frame
  // says whether the page is at its foot.
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.current?.style.setProperty("--progress", String(p));
      setAtEnd(max > 0 && window.scrollY >= max - 2);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // The strip keeps its current chapter in sight and fades the edges where more wait.
  useEffect(() => {
    const ol = list.current;
    if (!ol) return;
    const current = active >= 0 ? (ol.children[active] as HTMLElement | undefined) : undefined;
    if (current && ol.scrollWidth > ol.clientWidth) {
      const a = current.getBoundingClientRect();
      const box = ol.getBoundingClientRect();
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ol.scrollTo({ left: ol.scrollLeft + a.left - box.left - (box.width - a.width) / 2, behavior: still ? "auto" : "smooth" });
    }
    markEdges(ol);
  }, [active]);

  useEffect(() => {
    const ol = list.current;
    if (!ol) return;
    const onScroll = () => markEdges(ol);
    ol.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      ol.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const open = (id: string) => {
    const fold = document.querySelector<HTMLDetailsElement>(`details[data-fold="${CSS.escape(id)}"]`);
    if (fold) fold.open = true;
  };

  // The strip a step along, for a mouse with no sideways wheel (P32b): most of its width at a time.
  const step = (dir: -1 | 1) => {
    const ol = list.current;
    if (!ol) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ol.scrollBy({ left: dir * ol.clientWidth * 0.8, behavior: still ? "auto" : "smooth" });
  };

  return (
    <nav className="chapters" aria-label="On this page" data-chapters>
      <div className="wrap chapters-row">
        <ol ref={list}>
          {items.map((c, i) => (
            <li key={c.id}>
              <a href={`#${c.id}`} aria-current={i === active ? "location" : undefined} onClick={() => open(c.id)}>
                {c.label}
              </a>
            </li>
          ))}
        </ol>
        {/* For the mouse only: the keyboard tabs along the links, and the strip follows the focus. */}
        <button type="button" className="chapters-step" data-step="back" tabIndex={-1} aria-hidden="true" onClick={() => step(-1)}>
          ‹
        </button>
        <button type="button" className="chapters-step" data-step="next" tabIndex={-1} aria-hidden="true" onClick={() => step(1)}>
          ›
        </button>
        <span className="chapters-progress" aria-hidden="true">
          <span ref={bar} />
        </span>
      </div>
    </nav>
  );
}
