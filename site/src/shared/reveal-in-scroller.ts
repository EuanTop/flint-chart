/**
 * Scroll `scroller` (and only it, never the page) the least distance that brings `item` fully
 * into view. `scrollIntoView` would also move the page, which jumps the reader away from what
 * they were looking at when a theme is picked for them.
 */
export function revealInScroller(scroller: HTMLElement | null, item: Element | null, behavior: ScrollBehavior = 'smooth') {
  if (!scroller || !item) return;
  const box = scroller.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  const pad = 4;
  let delta = 0;
  if (rect.top < box.top + pad) delta = rect.top - box.top - pad;
  else if (rect.bottom > box.bottom - pad) delta = rect.bottom - box.bottom + pad;
  if (delta !== 0) scroller.scrollBy({ top: delta, behavior });
}
