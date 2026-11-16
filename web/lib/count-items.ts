import { Children, isValidElement, type ReactNode } from "react";

// How many list items a piece of JSX holds, read from the elements themselves (P32): every `<li>`
// not inside another one, at any depth. A fold's summary says how much it hides with it.
export function countItems(node: ReactNode): number {
  return Children.toArray(node).reduce<number>((n, child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return n;
    if (child.type === "li") return n + 1;
    return n + countItems(child.props.children);
  }, 0);
}
