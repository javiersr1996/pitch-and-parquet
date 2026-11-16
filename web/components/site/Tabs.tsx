"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";

export interface Tab {
  key: string;
  label: ReactNode;
  panel: ReactNode;
}

// One of several long lists at a time (P32, task 211): the tabs pattern of the WAI-ARIA practices,
// with the panels not on show hidden but still in the HTML, where the checks read them. The first
// tab is selected on load; the arrow keys move along the tabs and select as they go, Home and End
// go to the ends, and Tab leaves the row for the panel.
export function Tabs({ label, tabs, className }: { label: string; tabs: readonly Tab[]; className?: string }) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = tabs.length;
    const to = { ArrowRight: (selected + 1) % n, ArrowLeft: (selected + n - 1) % n, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    setSelected(to);
    buttons.current[to]?.focus();
  };
  return (
    <div className={["tabs", className].filter(Boolean).join(" ")}>
      <div role="tablist" aria-label={label} className="tabs-list" onKeyDown={onKeyDown}>
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={i === selected}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={i === selected ? 0 : -1}
            data-tab={t.key}
            onClick={() => setSelected(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`${id}-panel-${i}`}
          aria-labelledby={`${id}-tab-${i}`}
          tabIndex={0}
          hidden={i !== selected}
          data-panel={t.key}
          className="tabs-panel"
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
