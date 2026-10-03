import type { KeyboardEvent } from "react";

/**
 * Flechas, Home y End para `role="radiogroup"`: mueve la selección y el foco
 * al radio recién activado (tabindex viajero, ver WAI-ARIA radio group).
 */
export function radioKeyDown(
  e: KeyboardEvent<HTMLElement>,
  count: number,
  current: number,
  pick: (i: number) => void,
) {
  let next: number | null = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % count;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (current - 1 + count) % count;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = count - 1;
  if (next === null) return;
  e.preventDefault();
  pick(next);
  (e.currentTarget as HTMLElement)
    .closest('[role="radiogroup"]')
    ?.querySelectorAll<HTMLElement>('[role="radio"]')
    [next]?.focus();
}
