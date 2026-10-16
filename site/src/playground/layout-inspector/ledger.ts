import type { VegaLiteSession } from '../../../../packages/flint-js/src/vegalite/assemble';
import { EMPTY, PART_META, px, type Box, type Measured, type PartId } from './measure';

export interface Segment { name: string; px: number; part: PartId | 'allow'; kind?: 'hatch' | 'void' }
export interface LedgerRow { label: string; total: number; segments: Segment[] }
export interface Ledger { axis: 'Height' | 'Width'; canvas: number; rows: LedgerRow[] }

/** The parts beside the plot along one axis, in order, with the voids between them named for whatever overhangs there. */
export function drawnLedger(measured: Measured, axis: 'Height' | 'Width'): LedgerRow {
  const along = axis === 'Height';
  const from = (box: Box) => (along ? box.y : box.x);
  const to = (box: Box) => (along ? box.y + box.height : box.x + box.width);
  const plot = measured.parts.find(({ id }) => id === 'plot')?.box ?? EMPTY;
  const total = along ? measured.drawn.height : measured.drawn.width;
  const padStart = along ? measured.padding.top : measured.padding.left;
  const padEnd = along ? measured.padding.bottom : measured.padding.right;
  const centre = (box: Box) => (from(box) + to(box)) / 2;
  const furniture = measured.parts.filter(({ id }) => id !== 'canvas' && id !== 'drawn' && id !== 'pad' && id !== 'plot');
  // A part whose centre lies beside the plot along this axis takes its own place; its span is clipped to outside the plot.
  const spans: Array<{ name: string; part: PartId; from: number; to: number }> = [{ name: 'Plot', part: 'plot', from: from(plot), to: to(plot) }];
  for (const part of furniture) {
    for (const box of part.boxes) {
      const c = centre(box);
      if (c < from(plot)) spans.push({ name: PART_META[part.id].label, part: part.id, from: from(box), to: Math.min(to(box), from(plot)) });
      else if (c > to(plot)) spans.push({ name: PART_META[part.id].label, part: part.id, from: Math.max(from(box), to(plot)), to: to(box) });
    }
  }
  spans.sort((a, b) => a.from - b.from);
  // A void is named for the part that covers at least half of it: a rule running past the plot, a label's overhang.
  const overhang = (start: number, end: number): { part: PartId; name: string } | undefined => {
    let best: { part: PartId; name: string; px: number } | undefined;
    for (const part of furniture) {
      for (const box of part.boxes) {
        const covered = Math.min(end, to(box)) - Math.max(start, from(box));
        if (covered >= (end - start) / 2 && (!best || covered > best.px)) best = { part: part.id, name: PART_META[part.id].label, px: covered };
      }
    }
    return best;
  };
  const segments: Segment[] = [];
  let cursor = 0;
  const empty = (start: number, end: number) => {
    if (end <= start + 0.5) return;
    const over = overhang(start, end);
    segments.push(over
      ? { name: `${over.name} ${px(end - start)}`, px: end - start, part: over.part, kind: 'void' }
      : { name: px(end - start), px: end - start, part: 'pad', kind: 'void' });
  };
  // What no part covers is the theme's padding where it lies within it; canvas furniture stands in the padding.
  const gap = (start: number, end: number) => {
    const cuts = [start, ...[padStart, total - padEnd].filter((at) => at > start && at < end), end];
    for (let i = 0; i < cuts.length - 1; i += 1) {
      const [a, b] = [cuts[i], cuts[i + 1]];
      if (b <= a + 0.5) continue;
      if (b <= padStart + 0.5 || a >= total - padEnd - 0.5) segments.push({ name: 'Pad', px: b - a, part: 'pad' });
      else empty(a, b);
    }
  };
  for (const span of spans) {
    const start = Math.max(cursor, span.from);
    const end = Math.min(span.to, total);
    if (end <= start + 0.5) continue;
    gap(cursor, start);
    segments.push({ name: `${span.name} ${px(end - start)}`, px: end - start, part: span.part });
    cursor = end;
  }
  gap(cursor, total);
  return { label: 'Vega drew', total, segments };
}

/** What the planner set aside from the canvas along one axis. */
export function plannedLedger(session: VegaLiteSession, canvas: { width: number; height: number }, axis: 'Height' | 'Width'): LedgerRow {
  const { plan } = session;
  const along = axis === 'Height';
  const planned = along ? plan.plot.height : plan.plot.width;
  const drawnPlot = session.plot ? (along ? session.plot.height : session.plot.width) : planned;
  const segments: Segment[] = [{ name: `Plot ${px(drawnPlot)}`, px: drawnPlot, part: 'plot' }];
  if (along) {
    const titleTaken = (plan.title?.headline?.lines ? plan.title.headline.taken : 0) + (plan.title?.deckFit?.taken ?? 0);
    if (titleTaken > 0) segments.push({ name: `Title lines ${px(titleTaken)}`, px: titleTaken, part: 'title' });
    if (plan.rules?.fromPlot && plan.rules.room > 0) segments.push({ name: `Rule ${px(plan.rules.room)}`, px: plan.rules.room, part: 'rule' });
    const header = plan.header ? plan.header.edge + plan.header.line : 0;
    if (header > 0) segments.push({ name: `Header ${px(header)}`, px: header, part: 'header' });
    if (plan.source?.room) segments.push({ name: `Source ${px(plan.source.room)}`, px: plan.source.room, part: 'source' });
  }
  const spent = segments.reduce((sum, seg) => sum + seg.px, 0);
  const room = (along ? canvas.height : canvas.width) - spent;
  // The reserve is what the plan measured for the furniture; the rest of the canvas no decision claims.
  const reserved = plan.reserve ? Math.min(Math.max(room, 0), along ? plan.reserve.height : plan.reserve.width) : 0;
  if (reserved > 0.5) segments.push({ name: `Reserve ${px(reserved)}`, px: reserved, part: 'allow', kind: 'hatch' });
  if (room - reserved > 0.5) segments.push({ name: px(room - reserved), px: room - reserved, part: 'allow', kind: 'void' });
  return { label: 'Planner set aside', total: segments.reduce((sum, seg) => sum + seg.px, 0), segments };
}
