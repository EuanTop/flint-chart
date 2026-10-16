import type { readCanvasFurniture } from 'flint-chart';
import { readDrawnLayout } from '../../../../packages/flint-js/src/vegalite/drawn-layout';
import { vegaRendererOrigin } from '../../../../packages/flint-js/src/vegalite/interactions/hit-adapter';
import type { LayoutPlan } from '../../../../packages/flint-js/src/core/plan';

// ─── Parts ─────────────────────────────────────────────────────────────────

export type PartId =
  | 'canvas' | 'drawn' | 'pad' | 'title' | 'legend' | 'ylab' | 'ytitle' | 'plot'
  | 'xlab' | 'xtitle' | 'rule' | 'facet' | 'values' | 'header' | 'source';

export interface Box { x: number; y: number; width: number; height: number }

export interface Part {
  id: PartId;
  /** Each drawn box of the part; a facet draws several axes, a chart may draw several keys. */
  boxes: Box[];
  /** The box around all of them. */
  box: Box;
}

export const PART_META: Record<PartId, { label: string; color: string; outline?: 'dash' | 'solid' }> = {
  canvas: { label: 'Canvas', color: 'var(--li-canvas)', outline: 'dash' },
  drawn: { label: 'Drawn SVG', color: 'var(--li-drawn)', outline: 'solid' },
  pad: { label: 'Padding', color: 'var(--li-pad)' },
  title: { label: 'Title and deck', color: 'var(--li-title)' },
  legend: { label: 'Legend', color: 'var(--li-legend)' },
  ylab: { label: 'Y tick labels', color: 'var(--li-ylab)' },
  ytitle: { label: 'Y axis title', color: 'var(--li-ylab)' },
  plot: { label: 'Plot', color: 'var(--li-plot)' },
  xlab: { label: 'X tick labels', color: 'var(--li-xlab)' },
  xtitle: { label: 'X axis title', color: 'var(--li-xlab)' },
  rule: { label: 'Closing rule', color: 'var(--li-rule)' },
  facet: { label: 'Facet headers', color: 'var(--li-facet)' },
  values: { label: 'Text marks', color: 'var(--li-values)' },
  header: { label: 'Header', color: 'var(--li-header)' },
  source: { label: 'Source line', color: 'var(--li-source)' },
};

const PART_ORDER: PartId[] = ['canvas', 'drawn', 'pad', 'header', 'title', 'legend', 'ylab', 'ytitle', 'plot', 'xlab', 'xtitle', 'rule', 'facet', 'values', 'source'];

export const EMPTY: Box = { x: 0, y: 0, width: 0, height: 0 };

export function union(boxes: Box[]): Box {
  const live = boxes.filter((box) => box.width > 0 || box.height > 0);
  if (!live.length) return EMPTY;
  const x1 = Math.min(...live.map((box) => box.x));
  const y1 = Math.min(...live.map((box) => box.y));
  const x2 = Math.max(...live.map((box) => box.x + box.width));
  const y2 = Math.max(...live.map((box) => box.y + box.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

type Side = 'top' | 'bottom' | 'left' | 'right' | 'inside';

/** Which side of the plot a box sits on, by its centre. */
function sideOf(box: Box, plot: Box): Side {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  if (cy < plot.y) return 'top';
  if (cy > plot.y + plot.height) return 'bottom';
  if (cx < plot.x) return 'left';
  if (cx > plot.x + plot.width) return 'right';
  return 'inside';
}

export const r1 = (value: number): number => Math.round(value * 10) / 10;
export const px = (value: number): string => String(Math.round(value));
export const size = (box: { width: number; height: number } | undefined): string => (box ? `${px(box.width)} × ${px(box.height)}` : '–');
export const signed = (value: number): string => (value > 0.5 ? `+${px(value)}` : value < -0.5 ? `−${px(-value)}` : '±0');

// ─── Measuring the drawn chart ─────────────────────────────────────────────

export interface Measured {
  drawn: { width: number; height: number };
  padding: { top: number; right: number; bottom: number; left: number };
  parts: Part[];
  views: Array<{ role: string; box: Box }>;
}

/** Every drawn part of a Vega SVG, in the SVG's own pixels, read from the DOM Vega rendered. */
export function measureSvg(host: HTMLElement, view: any, plan: LayoutPlan, canvas: { width: number; height: number }, furniture: ReturnType<typeof readCanvasFurniture>): Measured | undefined {
  const svg = host.querySelector('svg');
  if (!svg) return undefined;
  const width = Number(svg.getAttribute('width'));
  const height = Number(svg.getAttribute('height'));
  const frame = svg.getBoundingClientRect();
  const scale = width ? frame.width / width : 1;
  const boxOf = (el: Element): Box => {
    const rect = el.getBoundingClientRect();
    return { x: (rect.left - frame.left) / scale, y: (rect.top - frame.top) / scale, width: rect.width / scale, height: rect.height / scale };
  };
  const domOrigin = (() => {
    const root = svg.querySelector(':scope > g');
    const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(root?.getAttribute('transform') ?? '');
    return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
  })();
  const sceneOrigin = vegaRendererOrigin(view);
  const shift = { x: domOrigin.x - sceneOrigin.x, y: domOrigin.y - sceneOrigin.y };
  const drawnViews = readDrawnLayout(view, plan.laidOutViews ?? plan.views)?.views ?? [];
  // A single-view plan states no rule views; a drawn leaf as tall as a planned rule and at least as wide is one.
  const rules = plan.rules?.rules ?? [];
  const isRule = (box: Box) => rules.some((rule) => Math.abs(rule.height - box.height) <= 1 && box.width >= rule.width - 1);
  const views = drawnViews.map(({ role, box }) => ({
    role: role === 'plot' && drawnViews.length > 1 && isRule(box) ? 'rule' : role,
    box: { ...box, x: box.x + shift.x, y: box.y + shift.y },
  }));
  const plotBoxes = views.filter(({ role }) => role === 'plot').map(({ box }) => box);
  const plot = plotBoxes.length ? union(plotBoxes) : boxOf(svg.querySelector('g.role-frame.root > g > path.background') ?? svg);

  const parts = new Map<PartId, Box[]>();
  const add = (id: PartId, box: Box) => {
    if (box.width <= 0 && box.height <= 0) return;
    parts.set(id, [...(parts.get(id) ?? []), box]);
  };

  add('canvas', { x: 0, y: 0, ...canvas });
  add('drawn', { x: 0, y: 0, width, height });
  const padding = view.padding?.() ?? {};
  const pad = { top: padding.top ?? 0, right: padding.right ?? 0, bottom: padding.bottom ?? 0, left: padding.left ?? 0 };
  if (pad.top) add('pad', { x: 0, y: 0, width, height: pad.top });
  if (pad.bottom) add('pad', { x: 0, y: height - pad.bottom, width, height: pad.bottom });
  if (pad.left) add('pad', { x: 0, y: pad.top, width: pad.left, height: height - pad.top - pad.bottom });
  if (pad.right) add('pad', { x: width - pad.right, y: pad.top, width: pad.right, height: height - pad.top - pad.bottom });

  // The chart's title sits under the root frame; a title inside a facet cell or header names a panel.
  const roleParent = (el: Element) => el.parentElement?.closest('g[class*="role-"]');
  for (const title of svg.querySelectorAll('g.role-title')) {
    add(roleParent(title)?.classList.contains('role-frame') ? 'title' : 'facet', boxOf(title));
  }
  for (const legend of svg.querySelectorAll('g.role-legend')) add('legend', boxOf(legend));
  for (const axis of svg.querySelectorAll('g.role-axis')) {
    const labels = union([...axis.querySelectorAll('g.role-axis-label, g.role-axis-tick, g.role-axis-domain')].map(boxOf));
    const title = union([...axis.querySelectorAll('g.role-axis-title')].map(boxOf));
    const side = sideOf(labels.width || labels.height ? labels : title, plot);
    const vertical = side === 'left' || side === 'right';
    add(vertical ? 'ylab' : 'xlab', labels);
    add(vertical ? 'ytitle' : 'xtitle', title);
  }
  plotBoxes.forEach((box) => add('plot', box));
  if (!plotBoxes.length) add('plot', plot);
  views.filter(({ role }) => role === 'rule').forEach(({ box }) => add('rule', box));
  for (const header of svg.querySelectorAll('g.role-column-header, g.role-row-header, g.role-column-title, g.role-row-title, g.role-column-footer, g.role-row-footer')) {
    if (!header.querySelector('g.role-axis') && !header.querySelector('g.role-title')) add('facet', boxOf(header));
  }
  // Canvas furniture is drawn after Vega, one element per item: what stands at the foot is the source line, the rest the header.
  const drawnFurniture = [...(svg.querySelector('g.flint-canvas-furniture')?.children ?? [])].filter((el) => el.tagName.toLowerCase() !== 'defs');
  furniture.forEach((item, index) => {
    const el = drawnFurniture[index];
    if (el) add(item.bottom !== undefined ? 'source' : 'header', boxOf(el));
  });
  const texts = [...svg.querySelectorAll('g.mark-text.role-mark')].filter((el) => !el.closest('g.role-axis, g.role-legend, g.role-title'));
  if (texts.length) add('values', union(texts.map(boxOf)));

  return {
    drawn: { width, height },
    padding: pad,
    parts: PART_ORDER.filter((id) => parts.has(id)).map((id) => ({ id, boxes: parts.get(id)!, box: union(parts.get(id)!) })),
    views,
  };
}
