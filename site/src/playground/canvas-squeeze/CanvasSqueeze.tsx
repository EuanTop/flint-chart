/**
 * Canvas squeeze: the test bed for a layout (compiler) rework. Charts are set in a small box and
 * measured from the SVG Vega drew: how much of the box the chart area got, and what the title,
 * keys, labels and chrome took. The goal is a layout algorithm that, seeing a chart will not read
 * well in its box, weighs the remedies it has — moving keys, a smaller title, trimmed names, a
 * larger render shrunk to fit — and takes the cheapest trade-off that makes the chart readable and
 * good. The remedies tab prototypes those trade-offs as overrides to learn what each one buys.
 */
import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { assembleVegaLite, THEME_PRESETS, type ChartAssemblyInput } from 'flint-chart';
import type { View } from 'vega';
import { VegaLiteView } from '../../components/VegaLiteView';
import { siteTheme } from '../../shared/theme';
import { CASES, type SqueezeCase, type SqueezeIssue } from './cases';

interface Rect { x: number; y: number; width: number; height: number }
type PartRole = 'title' | 'legend' | 'yLabels' | 'xLabels' | 'axisTitle' | 'header' | 'chrome';
interface Part { role: PartRole; rect: Rect }

interface Measured {
  drawn: { width: number; height: number };
  panels: Rect[];
  parts: Part[];
  /** What the host scales the drawing by to show it in the box. */
  scale: number;
  /** The plot panels' area over the drawing's: what is left once the furniture has taken its room. */
  plotShare: number;
  /** The drawing's area, as shown, over the box's: under 100% where the chart does not fill its box. */
  boxUsed: number;
  /**
   * The chart area: the plot with its own axes, or for panels the whole grid with its headers and
   * axes, read as one area.
   */
  area: Rect;
  /** The share of the drawing's width beside the chart area, and of its height above and below it: title, deck, keys, chrome. */
  around: { width: number; height: number };
  /** In the worst panel, the share its own y labels take of the width beside it, and its own x labels of the height below it. */
  labelShare: { y: number; x: number };
  /** Width over height of the first panel. */
  aspect: number;
  /**
   * How far the shapes drift, as a ratio of aspects (1 is none): the drawing's against its box's,
   * and the chart area's against the base size's.
   */
  drift: { drawing: number; area: number; around: number };
  /** The shortest side of a panel as shown, in px. */
  minSide: number;
  /** Room around the union of the panels, in drawn px. */
  margins: { top: number; bottom: number; left: number; right: number };
  /** Why the chart reads as squeezed; empty where it does not. */
  flags: string[];
  /** What is off without hurting the reading: a drawing a little larger than its box. */
  notes: string[];
}

/** Below these a chart reads as squeezed. */
const LIMITS = { scale: 0.7, around: 0.4, labels: 0.4, aspectMax: 3, aspectMin: 1 / 3, minSide: 100, overrun: 12, drift: 1.35 };

const PART_STYLE: Record<PartRole | 'plot', { color: string; label: string }> = {
  plot: { color: '#2f6fbd', label: 'Plot' },
  title: { color: '#7c4dcc', label: 'Title and deck' },
  legend: { color: '#1f8a6b', label: 'Keys' },
  yLabels: { color: '#c27b1a', label: 'Y labels' },
  xLabels: { color: '#c2452f', label: 'X labels' },
  axisTitle: { color: '#a3497f', label: 'Axis titles' },
  header: { color: '#2a8fa3', label: 'Panel headers' },
  chrome: { color: '#6b7a1f', label: 'House chrome' },
};

const ISSUE_LABEL: Record<SqueezeIssue, string> = {
  header: 'Header', legend: 'Keys', labels: 'Labels', facets: 'Panels', footer: 'Chrome', tile: 'Tile', control: 'Control',
  keysTop: 'Theme: keys on top', keysBottom: 'Theme: keys below', bigTitle: 'Theme: big title', doubleKeys: 'Theme: colour + size keys',
};

function union(rects: Rect[]): Rect | undefined {
  if (!rects.length) return undefined;
  const x1 = Math.min(...rects.map((r) => r.x));
  const y1 = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function measure(svg: SVGSVGElement, view: View, box: { width: number; height: number }, base: { width: number; height: number }): Measured {
  const drawn = { width: Number(svg.getAttribute('width')) || 0, height: Number(svg.getAttribute('height')) || 0 };
  const outer = svg.getBoundingClientRect();
  const k = outer.width / (drawn.width || 1);
  const rectOf = (el: Element): Rect | undefined => {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return undefined;
    return { x: (r.left - outer.left) / k, y: (r.top - outer.top) / k, width: r.width / k, height: r.height / k };
  };
  const all = (selector: string) => Array.from(svg.querySelectorAll(selector)).map(rectOf).filter((r): r is Rect => Boolean(r));

  // Panels: each facet cell's background, else the single view's: Vega-Lite draws the plot as the
  // root group, so its background is the plot.
  let panels = all('g.mark-group.cell > g > path.background');
  if (!panels.length) panels = all('g.mark-group.role-frame.root > g > path.background').slice(0, 1);
  if (!panels.length) {
    const [ox, oy] = view.origin();
    const signal = (name: string) => { try { return Number(view.signal(name)) || 0; } catch { return 0; } };
    const width = signal('width') || signal('child_width');
    const height = signal('height') || signal('child_height');
    if (width && height) panels = [{ x: ox, y: oy, width, height }];
  }
  const plot = union(panels) ?? { x: 0, y: 0, width: 0, height: 0 };

  const parts: Part[] = [];
  const push = (role: PartRole, rects: Rect[]) => {
    const u = union(rects);
    if (u) parts.push({ role, rect: u });
  };
  // Facets reuse `role-title` for each panel's label (inside the cell) and keep the shared axes in
  // their header groups: the chart's title is the one outside all of them, a header is its text.
  const FACET_GROUPS = 'g.cell, g.role-column-title, g.role-row-title, g.role-column-header, g.role-row-header, g.role-column-footer, g.role-row-footer';
  const outside = (selector: string) => Array.from(svg.querySelectorAll(selector)).filter((el) => !el.parentElement?.closest(FACET_GROUPS));
  push('title', outside('g.role-title').map(rectOf).filter((r): r is Rect => Boolean(r)));
  for (const legend of all('g.role-legend')) parts.push({ role: 'legend', rect: legend });
  const labels = all('g.role-axis-label > *');
  push('yLabels', labels.filter((r) => r.x + r.width <= plot.x + 1));
  push('xLabels', labels.filter((r) => r.y >= plot.y + plot.height - 1));
  for (const title of all('g.role-axis-title')) parts.push({ role: 'axisTitle', rect: title });
  const headers = all('g.cell .role-title-text, g.role-column-title .role-title-text, g.role-row-title .role-title-text, g.role-column-header .role-title-text, g.role-row-header .role-title-text');
  // Header text outside the grid takes room off it: one strip per edge.
  push('header', headers.filter((r) => r.y + r.height <= plot.y + 1));
  push('header', headers.filter((r) => r.x + r.width <= plot.x + 1));
  push('header', headers.filter((r) => r.x >= plot.x + plot.width - 1));
  for (const item of all('g.flint-canvas-furniture > *')) parts.push({ role: 'chrome', rect: item });

  const scale = Math.min(1, box.width / (drawn.width || 1), box.height / (drawn.height || 1));
  const panelArea = panels.reduce((sum, p) => sum + p.width * p.height, 0);
  const plotShare = panelArea / ((drawn.width * drawn.height) || 1);
  const boxUsed = (drawn.width * drawn.height * scale * scale) / (box.width * box.height);
  const first = panels[0];
  const facet = panels.length > 1;
  const aspect = first ? first.width / (first.height || 1) : 0;
  const minSide = first ? Math.min(...panels.map((p) => Math.min(p.width, p.height))) * scale : 0;
  const margins = {
    top: plot.y, bottom: drawn.height - (plot.y + plot.height), left: plot.x, right: drawn.width - (plot.x + plot.width),
  };
  const flags: string[] = [];
  const notes: string[] = [];
  // A drawing a little larger than its box reads fine shrunk; text shrunk past this is too small.
  if (scale < LIMITS.scale) flags.push(`shown at ${Math.round(scale * 100)}%: text too small`);
  else if (scale < 0.97) notes.push(`overflows its box: shown at ${Math.round(scale * 100)}%`);
  // Two trade-offs, read apart. The chart area against what is set around it: the title, deck, keys
  // and chrome. Each panel against its own labels: the y labels beside it, the x labels below it.
  const axisTitles = all('g.role-axis-title');
  const area = union([plot, ...labels, ...axisTitles, ...headers]) ?? plot;
  const around = { width: 1 - area.width / (drawn.width || 1), height: 1 - area.height / (drawn.height || 1) };
  if (around.height > LIMITS.around) flags.push(`title, keys and chrome take ${Math.round(around.height * 100)}% of the height`);
  if (around.width > LIMITS.around) flags.push(`keys and chrome take ${Math.round(around.width * 100)}% of the width`);
  const own = [...labels, ...axisTitles];
  const labelShare = { y: 0, x: 0 };
  for (const p of panels) {
    // A panel's own labels: those beside or below it, short of the next panel in its row or column.
    const leftBound = Math.max(-Infinity, ...panels.filter((q) => q !== p && q.x + q.width <= p.x && q.y < p.y + p.height && q.y + q.height > p.y).map((q) => q.x + q.width));
    const lowBound = Math.min(Infinity, ...panels.filter((q) => q !== p && q.y >= p.y + p.height && q.x < p.x + p.width && q.x + q.width > p.x).map((q) => q.y));
    const ys = own.filter((r) => r.x + r.width <= p.x + 1 && r.x >= leftBound - 1 && r.y + r.height / 2 >= p.y && r.y + r.height / 2 <= p.y + p.height);
    const xs = own.filter((r) => r.y >= p.y + p.height - 1 && r.y + r.height <= lowBound + 1 && r.x + r.width / 2 >= p.x && r.x + r.width / 2 <= p.x + p.width);
    if (ys.length) {
      const width = p.x - Math.min(...ys.map((r) => r.x));
      labelShare.y = Math.max(labelShare.y, width / (width + p.width));
    }
    if (xs.length) {
      const depth = Math.max(...xs.map((r) => r.y + r.height)) - (p.y + p.height);
      labelShare.x = Math.max(labelShare.x, depth / (depth + p.height));
    }
  }
  if (labelShare.y > LIMITS.labels) flags.push(`y labels take ${Math.round(labelShare.y * 100)}% of ${facet ? 'a panel’s' : 'the chart’s'} width`);
  if (labelShare.x > LIMITS.labels) flags.push(`x labels take ${Math.round(labelShare.x * 100)}% of ${facet ? 'a panel’s' : 'the chart’s'} height`);
  // Panels are read as one area: their size and shape are not judged one by one.
  if (!facet && (aspect > LIMITS.aspectMax || (aspect && aspect < LIMITS.aspectMin))) flags.push(`plot ${aspect.toFixed(1)}:1`);
  if (!facet && minSide && minSide < LIMITS.minSide) flags.push(`plot side ${Math.round(minSide)}px`);
  // An axis title longer than its axis runs past the plot's ends: it reads as spilling out.
  for (const part of facet ? [] : parts) {
    if (part.role !== 'axisTitle') continue;
    const r = part.rect;
    const beside = r.x + r.width <= plot.x + 1 || r.x >= plot.x + plot.width - 1;
    const middle = beside ? r.y + r.height / 2 : r.x + r.width / 2;
    const panel = panels.find((p) => beside ? middle >= p.y && middle <= p.y + p.height : middle >= p.x && middle <= p.x + p.width) ?? plot;
    const overrun = beside ? r.height - panel.height : r.width - panel.width;
    if (overrun > LIMITS.overrun) flags.push(`${beside ? 'y' : 'x'}-axis title ${Math.round(overrun)}px longer than its axis`);
  }
  const drift = {
    drawing: (drawn.width / (drawn.height || 1)) / (box.width / box.height),
    area: (area.width / (area.height || 1)) / (base.width / base.height),
    around: 1,
  };
  // What the title, keys and chrome do to the shape, apart from what the chart area does itself:
  // a square plot under two rows of keys still makes a tall drawing in a square box.
  drift.around = drift.drawing / drift.area;
  if (drift.around > LIMITS.drift) flags.push(`keys and chrome stretch the drawing ${drift.around.toFixed(1)}× wider than its box`);
  if (drift.around < 1 / LIMITS.drift) flags.push(`title, keys and chrome stretch the drawing ${(1 / drift.around).toFixed(1)}× taller than its box`);
  return { drawn, panels, parts, scale, plotShare, boxUsed, area, around, labelShare, aspect, drift, minSide, margins, flags: [...new Set(flags)], notes };
}

/**
 * How the host sizes the chart: every chart gets the same base size and an allowance to grow under
 * pressure, so its box is the base times the allowance.
 */
interface Setup { id: string; base: { width: number; height: number }; stretch: number }
const SETUPS: Setup[] = [
  { id: '300x300x1.5', base: { width: 300, height: 300 }, stretch: 1.5 },
  { id: '200x200x1.2', base: { width: 200, height: 200 }, stretch: 1.2 },
  { id: '300x300x1', base: { width: 300, height: 300 }, stretch: 1 },
  { id: '400x300x1.5', base: { width: 400, height: 300 }, stretch: 1.5 },
  // The Theme Lab's chart wall: a wide base in a narrow card.
  { id: '300x200x1.5', base: { width: 300, height: 200 }, stretch: 1.5 },
];
const setupLabel = (setup: Setup) => `${setup.base.width} × ${setup.base.height}, ×${setup.stretch}`;

/** The box the chart has to fit, which it is measured against. */
const boxOf = (setup: Setup) => ({ width: Math.round(setup.base.width * setup.stretch), height: Math.round(setup.base.height * setup.stretch) });

/**
 * A remedy, prototyped without touching the compiler: a theme override over the case's house, or a
 * larger render the host shrinks into the box. `cost` orders them: moving keys loses nothing, a
 * smaller title loses emphasis, trimmed names lose words, a shrunk render loses legibility.
 */
interface RemedyPart { label: string; cost: number; theme?: Record<string, any>; render?: number }
const REMEDY_PARTS: Record<string, RemedyPart> = {
  E: { label: 'Empty theme', cost: 0 },
  KR: { label: 'Keys right', cost: 0.5, theme: { legend: { placement: ['right'], maxSwatches: 3 } } },
  KT: { label: 'Keys on top, one row', cost: 0.5, theme: { legend: { placement: ['top'], arrangement: 'row', maxSwatches: 3 } } },
  KB: { label: 'Keys below, one row', cost: 0.5, theme: { legend: { placement: ['bottom'], arrangement: 'row', maxSwatches: 3 } } },
  T: { label: 'Smaller title', cost: 1, theme: { type: { headline: { size: 13 }, deck: { size: 11 } } } },
  L: { label: 'Trim names', cost: 2, theme: { labels: { truncation: 'ellipsis', fit: { rowLimit: '22%' } } } },
  S: { label: 'Render 1.25×, shrink', cost: 3, render: 1.25 },
};
interface Remedy { id: string; parts: string[]; label: string; cost: number; theme?: Record<string, any>; render: number }
const REMEDY_COMBOS = [['E'], ['KR'], ['KT'], ['KB'], ['T'], ['L'], ['S'], ['T', 'L'], ['KR', 'T', 'L'], ['KT', 'T', 'L'], ['KT', 'T', 'L', 'S']];

function deepMerge(a: any, b: any): any {
  if (!b) return a;
  if (!a || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) return b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = deepMerge(a[k], v);
  return out;
}
const REMEDIES: Remedy[] = REMEDY_COMBOS.map((parts) => ({
  id: parts.join('+'),
  parts,
  label: parts.map((p) => REMEDY_PARTS[p].label).join(' + '),
  cost: parts.reduce((sum, p) => sum + REMEDY_PARTS[p].cost, 0),
  theme: parts.reduce<Record<string, any> | undefined>((acc, p) => deepMerge(acc, REMEDY_PARTS[p].theme), undefined),
  render: parts.reduce((f, p) => f * (REMEDY_PARTS[p].render ?? 1), 1),
}));

function compile(c: SqueezeCase, setup: Setup, remedy?: Remedy) {
  try {
    const input = structuredClone(c.input) as unknown as ChartAssemblyInput;
    const f = remedy?.render ?? 1;
    (input.chart_spec as any).baseSize = { width: setup.base.width * f, height: setup.base.height * f };
    (input.chart_spec as any).canvasSize = { width: boxOf(setup).width * f, height: boxOf(setup).height * f };
    // A remedy is an override over the case's house; Flint's defaults have none, so they take an
    // empty theme (which itself changes the drawing: compare against the "Empty theme" column).
    if (remedy) (input as any).theme_spec = deepMerge(c.theme ? { extends: c.theme } : { id: 'flint-defaults' }, remedy.theme ?? {});
    else if (c.theme) (input as any).theme_spec = c.theme;
    const spec: any = assembleVegaLite(input);
    return { spec };
  } catch (error) {
    return { error: String(error) };
  }
}

/**
 * What the reader sees: an issue where the other parts leave the plot looking bad, a warning where
 * the chart reads well but is drawn larger than its box, a fit where it is neither.
 */
type Verdict = 'issue' | 'warning' | 'fit';
const verdictOf = (m: Measured | undefined): Verdict | undefined =>
  !m ? undefined : m.flags.length ? 'issue' : m.notes.length ? 'warning' : 'fit';
const VERDICTS: { id: Verdict; label: string; lead: string }[] = [
  { id: 'issue', label: 'Issue', lead: 'The title, keys, labels or chrome take so much of the box that the plot looks bad: squashed, tiny, distorted, shrunk past legibility, or missing data.' },
  { id: 'warning', label: 'Warning', lead: 'The chart reads well, but it is drawn larger than its box: the host has to shrink it a little or give it more room.' },
  { id: 'fit', label: 'Fit', lead: 'The chart reads well and stays inside its box.' },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;
const px = (v: number) => `${Math.round(v)}`;

/** The room each kind of part takes off the plot: its height above or below, its width beside. */
function roomTable(m: Measured) {
  const plot = union(m.panels);
  if (!plot) return [];
  const rows: { role: PartRole; side: string; px: number }[] = [];
  for (const part of m.parts) {
    const r = part.rect;
    let side = 'over';
    let room = 0;
    if (r.y + r.height <= plot.y + 1) { side = 'above'; room = r.height; }
    else if (r.y >= plot.y + plot.height - 1) { side = 'below'; room = r.height; }
    else if (r.x + r.width <= plot.x + 1) { side = 'left'; room = r.width; }
    else if (r.x >= plot.x + plot.width - 1) { side = 'right'; room = r.width; }
    if (room) rows.push({ role: part.role, side, px: room });
  }
  const merged = new Map<string, { role: PartRole; side: string; px: number }>();
  for (const row of rows) {
    const key = `${row.role}:${row.side}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, px: Math.max(prev.px, row.px) } : row);
  }
  return [...merged.values()];
}

function CaseCard({ c, setup, remedy, mode, showParts, hidden, measured, onMeasured }: {
  c: SqueezeCase; setup: Setup; remedy?: Remedy; mode: 'fit' | 'natural'; showParts: boolean; hidden: boolean; measured?: Measured; onMeasured: (id: string, m: Measured) => void;
}) {
  const key = remedy ? `${remedy.id}::${c.id}` : c.id;
  const compiled = useMemo(() => compile(c, setup, remedy), [c, setup, remedy]);
  const box = useMemo(() => boxOf(setup), [setup]);
  const onReady = useCallback((svg: SVGSVGElement, view: View) => {
    // Furniture is appended after render; measure on the next frame so it is in place.
    const frame = requestAnimationFrame(() => onMeasured(key, measure(svg, view, box, setup.base)));
    return () => cancelAnimationFrame(frame);
  }, [key, box, setup, compiled, onMeasured]);
  const scale = mode === 'fit' ? measured?.scale ?? 1 : 1;
  const theme = c.theme ? THEME_PRESETS[c.theme]?.label ?? c.theme : 'Flint default';
  const verdict = verdictOf(measured);
  const room = measured ? roomTable(measured) : [];
  // As drawn, the stage holds whichever is larger: the box or the drawing.
  const stage = mode === 'natural' && measured
    ? { width: Math.max(box.width, measured.drawn.width), height: Math.max(box.height, measured.drawn.height) }
    : { width: box.width, height: box.height };

  return (
    // A card on another tab is still laid out, off the page, so it is measured and counted.
    <article className="squeeze-card" id={key} data-hidden={hidden} aria-hidden={hidden} style={{ width: Math.max(280, stage.width) + 30 }}>
      <header>
        <div className="squeeze-card-title">
          <strong>{c.name}</strong>
          <span className="squeeze-tag">{ISSUE_LABEL[c.issue]}</span>
          {remedy && <span className="squeeze-tag" data-remedy>{remedy.label}</span>}
        </div>
        <p>{c.note}</p>
        <code>{theme} · {String(c.input.chart_spec.chartType)}</code>
      </header>
      <div className="squeeze-stage" style={stage}>
        <div className="squeeze-box" style={{ width: box.width, height: box.height }} />
        {'error' in compiled ? <pre className="squeeze-error">{compiled.error}</pre> : (
          <div className="squeeze-drawing" style={{ transform: `scale(${scale})` }}>
            <VegaLiteView spec={compiled.spec} renderer="svg" onReady={onReady} />
            {measured && showParts && (
              <div className="squeeze-overlay" style={{ width: measured.drawn.width, height: measured.drawn.height }}>
                {measured.parts.map((part, i) => (
                  <div key={i} className="squeeze-part" style={rectStyle(part.rect, PART_STYLE[part.role].color, false)} />
                ))}
                <div className="squeeze-part" style={{ ...rectStyle(measured.area, '#555', false), borderStyle: 'dotted' }} />
                {measured.panels.map((panel, i) => (
                  <div key={`p${i}`} className="squeeze-part" style={rectStyle(panel, PART_STYLE.plot.color, true)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {measured && (
        <footer>
          <div className="squeeze-verdict" data-verdict={verdict}>
            {verdict === 'issue' ? measured.flags.join(' · ') : verdict === 'warning' ? measured.notes.join(' · ') : 'fits its box'}
          </div>
          <dl>
            <dt>Plot</dt><dd>{pct(measured.plotShare)} of the drawing{measured.panels.length > 1 ? `, ${measured.panels.length} panels` : ''}</dd>
            <dt>Panel</dt><dd>{px(measured.panels[0]?.width ?? 0)} × {px(measured.panels[0]?.height ?? 0)} ({measured.aspect.toFixed(2)}:1)</dd>
            <dt>Drawn</dt><dd>{px(measured.drawn.width)} × {px(measured.drawn.height)}{measured.scale < 1 ? `, shown at ${pct(measured.scale)}` : ''}, {pct(measured.boxUsed)} of the box used</dd>
            <dt>Around</dt><dd>title, keys, chrome: {pct(measured.around.height)} of the height, {pct(measured.around.width)} of the width</dd>
            <dt>Labels</dt><dd>y {pct(measured.labelShare.y)} of {measured.panels.length > 1 ? 'a panel’s' : 'the chart’s'} width, x {pct(measured.labelShare.x)} of its height</dd>
            <dt>Around</dt><dd>top {px(measured.margins.top)} · bottom {px(measured.margins.bottom)} · left {px(measured.margins.left)} · right {px(measured.margins.right)}</dd>
          </dl>
          {room.length > 0 && (
            <ul className="squeeze-room">
              {room.map((r) => (
                <li key={`${r.role}:${r.side}`}>
                  <i style={{ background: PART_STYLE[r.role].color }} />
                  {PART_STYLE[r.role].label} <span>{r.side} · {px(r.px)}px</span>
                </li>
              ))}
            </ul>
          )}
        </footer>
      )}
    </article>
  );
}

function rectStyle(r: Rect, color: string, fill: boolean): CSSProperties {
  return {
    left: r.x, top: r.y, width: r.width, height: r.height,
    border: `1.5px ${fill ? 'solid' : 'dashed'} ${color}`,
    background: fill ? `${color}14` : 'transparent',
  };
}

export function CanvasSqueeze() {
  const [mode, setMode] = useState<'fit' | 'natural'>('fit');
  const [setupId, setSetupId] = useState(SETUPS[0].id);
  const setup = SETUPS.find((s) => s.id === setupId) ?? SETUPS[0];
  const chooseSetup = (id: string) => { setMeasured({}); setSetupId(id); };
  const [showParts, setShowParts] = useState(true);
  const [tab, setTab] = useState<Verdict | 'remedies'>('issue');
  const [preview, setPreview] = useState<string>();
  const [measured, setMeasured] = useState<Record<string, Measured>>({});
  const onMeasured = useCallback((id: string, m: Measured) => setMeasured((prev) => ({ ...prev, [id]: m })), []);
  const shown = CASES.filter((c) => verdictOf(measured[c.id]) === tab);
  const count = (verdict: Verdict) => CASES.filter((c) => verdictOf(measured[c.id]) === verdict).length;
  const pending = CASES.filter((c) => !measured[c.id]).length;
  // The remedies are tried on the cases that are issues as they stand.
  const issueCases = CASES.filter((c) => verdictOf(measured[c.id]) === 'issue');
  const remedyPending = tab === 'remedies' ? issueCases.reduce((n, c) => n + REMEDIES.filter((r) => !measured[`${r.id}::${c.id}`]).length, 0) : 0;
  const cheapest = (c: SqueezeCase) => REMEDIES
    .filter((r) => r.id !== 'E' && measured[`${r.id}::${c.id}`] && verdictOf(measured[`${r.id}::${c.id}`]) !== 'issue')
    .sort((a, b) => a.cost - b.cost || (verdictOf(measured[`${a.id}::${c.id}`]) === 'fit' ? -1 : 1))[0];

  return (
    <div className="squeeze-page">
      <style>{styles}</style>
      <h1>Canvas squeeze</h1>
      <p className="squeeze-lead squeeze-goal">
        <b>The goal:</b> when a chart will not read well in its box, the compiler's layout decides how to use the tools it
        has — move or regroup the keys, set the title smaller, trim long names, or render larger and shrink to fit — and
        takes the cheapest trade-off that leaves the chart readable and good. This page collects the cases, measures
        where each one goes wrong, and prototypes the remedies (the <b>Remedies</b> tab) to learn what each one buys and
        costs before the algorithm is written.
      </p>
      <p className="squeeze-lead">
        Charts in a small box. Every chart gets the same base size and an allowance to grow under pressure: 300 × 300
        that may grow 1.5× has a 450 × 450 box (the dashed line). Each is measured from the SVG Vega drew: how much
        of the box the plot got, and what took the rest. Each chart lands on one of three tabs by what it
        measures: <b>issue</b>, <b>warning</b> or <b>fit</b>.
      </p>
      <p className="squeeze-lead">
        Two trade-offs are read apart. <b>The chart area against what is around it</b>: the chart area is the plot with its
        own axes, or for panels the whole grid with its headers and axes, read as one area (the dotted line); an issue is
        the title, deck, keys and chrome taking over {pct(LIMITS.around)} of the drawing's height or width. <b>Each panel
        against its own labels</b>: an issue is a panel's own y labels taking over {pct(LIMITS.labels)} of the width beside
        it, or its own x labels over {pct(LIMITS.labels)} of the height below it. A single plot is also an issue when it is
        flatter or taller than {LIMITS.aspectMax}:1, shorter than {LIMITS.minSide}px a side, or an axis title runs past
        its ends; panels are not judged one by one. <b>Shape</b>: the title, keys and chrome stretching the drawing over{' '}
        {LIMITS.drift}× taller or wider than its box, beyond the shape the chart area takes itself. A chart shrunk below {pct(LIMITS.scale)} to fit its box is an issue
        (its text is too small); a little larger than its box, a warning. Values left out to fit are not flagged.
      </p>

      <div className="squeeze-controls">
        <div role="group" aria-label="Size">
          {SETUPS.map((s) => (
            <button key={s.id} type="button" aria-pressed={setupId === s.id} onClick={() => chooseSetup(s.id)}
              title={`baseSize ${s.base.width} × ${s.base.height}, canvasSize ${boxOf(s).width} × ${boxOf(s).height}`}>
              {setupLabel(s)}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Drawing">
          <button type="button" aria-pressed={mode === 'fit'} onClick={() => setMode('fit')}>Shrunk into the box</button>
          <button type="button" aria-pressed={mode === 'natural'} onClick={() => setMode('natural')}>As drawn</button>
        </div>
        <label><input type="checkbox" checked={showParts} onChange={(e) => setShowParts(e.target.checked)} /> Outline the parts</label>
        <ul className="squeeze-key">
          {Object.entries(PART_STYLE).map(([role, s]) => <li key={role}><i style={{ background: s.color }} />{s.label}</li>)}
        </ul>
      </div>

      <div className="squeeze-tabs" role="tablist" aria-label="Verdict">
        {VERDICTS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={tab === v.id} data-verdict={v.id} onClick={() => setTab(v.id)}>
            {v.label}<span>{count(v.id)}</span>
          </button>
        ))}
        <button type="button" role="tab" aria-selected={tab === 'remedies'} data-verdict="remedies" onClick={() => setTab('remedies')}>
          Remedies<span>{count('issue')} issues</span>
        </button>
        {(pending > 0 || remedyPending > 0) && <em>measuring {pending + remedyPending}…</em>}
      </div>
      <p className="squeeze-tab-lead">
        {tab === 'remedies'
          ? 'Each issue tried again under each remedy and their combinations, prototyped as theme overrides over its house, or as a larger render the host shrinks into the box. Cheaper remedies come first: moving keys loses nothing, a smaller title loses emphasis, trimmed names lose words, a shrunk render loses legibility. Charts on Flint’s defaults take an empty theme to carry the override, which by itself changes the drawing: read their remedies against the “Empty theme” column. Click a cell to see that chart.'
          : VERDICTS.find((v) => v.id === tab)?.lead}
      </p>

      {tab === 'remedies' && (
        <section className="squeeze-remedies">
          <p>
            Rescued: <b>{issueCases.filter((c) => cheapest(c)).length}</b> of {issueCases.length} issues.
          </p>
          <table>
            <thead>
              <tr>
                <th>Case</th><th>As it stands</th>
                {REMEDIES.map((r) => <th key={r.id} title={r.label}>{r.parts.join(' + ')}</th>)}
                <th>Cheapest rescue</th>
              </tr>
            </thead>
            <tbody>
              {issueCases.map((c) => {
                const best = cheapest(c);
                const cell = (key: string, m: Measured | undefined) => (
                  <td key={key} data-verdict={verdictOf(m)} aria-selected={preview === key} onClick={() => setPreview(key)} title={m ? [...m.flags, ...m.notes].join(' · ') || 'fits its box' : 'measuring'}>
                    {!m ? '…' : verdictOf(m) === 'issue' ? m.flags[0] : verdictOf(m) === 'warning' ? `shown ${pct(m.scale)}` : 'fits'}
                  </td>
                );
                return (
                  <tr key={c.id}>
                    <td>{c.name}<small>{c.theme ? THEME_PRESETS[c.theme]?.label ?? c.theme : 'Flint default'}</small></td>
                    {cell(c.id, measured[c.id])}
                    {REMEDIES.map((r) => cell(`${r.id}::${c.id}`, measured[`${r.id}::${c.id}`]))}
                    <td data-verdict={best ? verdictOf(measured[`${best.id}::${c.id}`]) : 'issue'}>{best ? best.label : 'none'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <dl className="squeeze-remedy-key">
            {Object.entries(REMEDY_PARTS).map(([id, part]) => (
              <div key={id}><dt>{id}</dt><dd>{part.label}{part.theme ? <code>{JSON.stringify(part.theme)}</code> : part.render ? <code>{`render ×${part.render}`}</code> : <code>{'{}'}</code>}</dd></div>
            ))}
          </dl>
          <div className="squeeze-grid">
            {issueCases.flatMap((c) => REMEDIES.map((r) => (
              <CaseCard key={`${setup.id}:${r.id}:${c.id}`} c={c} setup={setup} remedy={r} mode={mode} showParts={showParts}
                hidden={preview !== `${r.id}::${c.id}`} measured={measured[`${r.id}::${c.id}`]} onMeasured={onMeasured} />
            )))}
            {issueCases.filter((c) => preview === c.id).map((c) => (
              <CaseCard key={`${setup.id}:preview:${c.id}`} c={c} setup={setup} mode={mode} showParts={showParts}
                hidden={false} measured={measured[c.id]} onMeasured={onMeasured} />
            ))}
          </div>
        </section>
      )}

      <section className="squeeze-score" hidden={tab === 'remedies'}>
        <table>
          <thead>
            <tr><th>Case</th><th>Type</th><th>Drawn</th><th>Shown at</th><th>Box used</th><th>Plot share</th><th>Around: height</th><th>Around: width</th><th>Y labels</th><th>X labels</th><th>Drawing shape</th><th>Area shape</th><th>Stretch by the rest</th><th>Panel</th><th>Above</th><th>Below</th><th>Left</th><th>Right</th><th>Why</th></tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const m = measured[c.id];
              return (
                <tr key={c.id} data-verdict={verdictOf(m)}>
                  <td><a href={`#${c.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{c.name}</a></td>
                  <td>{ISSUE_LABEL[c.issue]}</td>
                  {m ? (
                    <>
                      <td>{px(m.drawn.width)}×{px(m.drawn.height)}</td>
                      <td>{pct(m.scale)}</td>
                      <td>{pct(m.boxUsed)}</td>
                      <td>{pct(m.plotShare)}</td>
                      <td>{pct(m.around.height)}</td>
                      <td>{pct(m.around.width)}</td>
                      <td>{pct(m.labelShare.y)}</td>
                      <td>{pct(m.labelShare.x)}</td>
                      <td>{m.drift.drawing.toFixed(2)}</td>
                      <td>{m.drift.area.toFixed(2)}</td>
                      <td>{m.drift.around.toFixed(2)}</td>
                      <td>{px(m.panels[0]?.width ?? 0)}×{px(m.panels[0]?.height ?? 0)}{m.panels.length > 1 ? ` ×${m.panels.length}` : ''}</td>
                      <td>{px(m.margins.top)}</td>
                      <td>{px(m.margins.bottom)}</td>
                      <td>{px(m.margins.left)}</td>
                      <td>{px(m.margins.right)}</td>
                      <td>{m.flags.join(' · ') || m.notes.join(' · ') || '—'}</td>
                    </>
                  ) : <td colSpan={17}>measuring…</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="squeeze-grid">
        {CASES.map((c) => (
          <CaseCard key={`${setup.id}:${c.id}`} c={c} setup={setup} mode={mode} showParts={showParts}
            hidden={verdictOf(measured[c.id]) !== tab} measured={measured[c.id]} onMeasured={onMeasured} />
        ))}
      </section>
    </div>
  );
}

const styles = `
  .squeeze-page { position: relative; max-width: 1400px; margin: 0 auto; padding: 24px 24px 80px; color: ${siteTheme.text}; }
  .squeeze-page h1 { font-size: 28px; margin: 0 0 8px; }
  .squeeze-page h2 { font-size: 18px; margin: 0 0 6px; }
  .squeeze-goal { color: ${siteTheme.text} !important; }
  .squeeze-lead { max-width: 900px; margin: 0 0 8px; color: ${siteTheme.textMuted}; line-height: 1.55; }
  .squeeze-controls { position: sticky; top: 0; z-index: 3; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px; margin: 16px 0; padding: 10px 0; background: ${siteTheme.bg}; border-bottom: 1px solid ${siteTheme.border}; font-size: 13px; }
  .squeeze-controls [role="group"] { display: inline-flex; gap: 2px; padding: 2px; border-radius: 7px; background: rgba(0,0,0,0.05); }
  .squeeze-controls button { border: 0; background: transparent; padding: 4px 10px; border-radius: 5px; font: inherit; color: ${siteTheme.textMuted}; cursor: pointer; }
  .squeeze-controls button[aria-pressed="true"] { background: ${siteTheme.surface}; color: ${siteTheme.text}; box-shadow: 0 1px 2px rgba(31,35,40,0.16); font-weight: 600; }
  .squeeze-key { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0; padding: 0; list-style: none; color: ${siteTheme.textMuted}; }
  .squeeze-key i, .squeeze-room i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  .squeeze-score { margin: 8px 0 28px; }
  .squeeze-score p { margin: 0 0 8px; font-size: 13px; color: ${siteTheme.textMuted}; }
  .squeeze-score table { width: 100%; border-collapse: collapse; font-size: 12px; font-variant-numeric: tabular-nums; }
  .squeeze-score th, .squeeze-score td { text-align: left; padding: 4px 8px; border-bottom: 1px solid ${siteTheme.border}; white-space: nowrap; }
  .squeeze-score th { color: ${siteTheme.textMuted}; font-weight: 600; }
  .squeeze-score td:last-child { white-space: normal; }
  .squeeze-score tr[data-verdict="issue"] td:last-child { color: #b3261e; }
  .squeeze-score tr[data-verdict="warning"] td:last-child { color: #8a5300; }
  .squeeze-score a { color: inherit; }
  .squeeze-grid { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .squeeze-card { background: ${siteTheme.surface}; border: 1px solid ${siteTheme.border}; border-radius: 10px; padding: 14px; scroll-margin-top: 70px; }
  .squeeze-card > header { max-width: 100%; margin-bottom: 10px; }
  .squeeze-card-title { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .squeeze-card-title strong { font-size: 14px; margin-right: 4px; }
  .squeeze-card p { margin: 4px 0; font-size: 12.5px; color: ${siteTheme.textMuted}; line-height: 1.45; }
  .squeeze-card code { font-size: 11.5px; color: ${siteTheme.textMuted}; }
  .squeeze-tag { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(0,0,0,0.06); color: ${siteTheme.textMuted}; }
  .squeeze-tag[data-kind="squeezed"] { background: #fdecea; color: #b3261e; }
  .squeeze-tag[data-kind="healthy"] { background: #e6f4ea; color: #1e7b34; }
  .squeeze-stage { position: relative; overflow: hidden; background: #fff; }
  .squeeze-box { position: absolute; left: 0; top: 0; z-index: 2; pointer-events: none; outline: 1.5px dashed #444; }
  .squeeze-drawing { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
  .squeeze-overlay { position: absolute; left: 0; top: 0; pointer-events: none; }
  .squeeze-part { position: absolute; box-sizing: border-box; }
  .squeeze-error { color: #b3261e; font-size: 12px; white-space: pre-wrap; }
  .squeeze-card > footer { margin-top: 10px; font-size: 12px; }
  .squeeze-verdict { display: inline-block; margin-bottom: 6px; padding: 2px 8px; border-radius: 4px; background: #e6f4ea; color: #1e7b34; font-weight: 600; }
  .squeeze-verdict[data-verdict="issue"] { background: #fdecea; color: #b3261e; }
  .squeeze-verdict[data-verdict="warning"] { background: #fff4e0; color: #8a5300; }
  .squeeze-card[data-hidden="true"] { position: absolute; left: -100000px; top: 0; visibility: hidden; }
  .squeeze-tabs { display: flex; align-items: flex-end; gap: 22px; margin: 8px 0 0; border-bottom: 1px solid ${siteTheme.border}; }
  .squeeze-tabs button { border: 0; background: transparent; padding: 8px 0; margin-bottom: -1px; border-bottom: 2px solid transparent; font: inherit; font-size: 15px; font-weight: 600; color: ${siteTheme.textMuted}; cursor: pointer; }
  .squeeze-tabs button span { margin-left: 6px; font-weight: 500; font-variant-numeric: tabular-nums; }
  .squeeze-tabs button[aria-selected="true"][data-verdict="issue"] { color: #b3261e; border-bottom-color: #b3261e; }
  .squeeze-tabs button[aria-selected="true"][data-verdict="warning"] { color: #8a5300; border-bottom-color: #c98a1a; }
  .squeeze-tabs button[aria-selected="true"][data-verdict="fit"] { color: #1e7b34; border-bottom-color: #1e7b34; }
  .squeeze-tabs em { margin-left: auto; padding-bottom: 8px; font-size: 12px; color: ${siteTheme.textMuted}; }
  .squeeze-tab-lead { max-width: 1000px; margin: 10px 0 14px; font-size: 13px; color: ${siteTheme.textMuted}; line-height: 1.5; }
  .squeeze-tabs button[aria-selected="true"][data-verdict="remedies"] { color: ${siteTheme.text}; border-bottom-color: ${siteTheme.text}; }
  .squeeze-remedies > p { margin: 0 0 8px; font-size: 13px; color: ${siteTheme.textMuted}; }
  .squeeze-remedies table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 14px; table-layout: fixed; }
  .squeeze-remedies th, .squeeze-remedies td { padding: 4px 6px; border: 1px solid #fff; text-align: left; vertical-align: top; line-height: 1.3; }
  .squeeze-remedies th { color: ${siteTheme.textMuted}; font-weight: 600; background: ${siteTheme.bg}; }
  .squeeze-remedies th:first-child, .squeeze-remedies td:first-child { width: 170px; }
  .squeeze-remedies td small { display: block; color: ${siteTheme.textMuted}; }
  .squeeze-remedies td[data-verdict] { cursor: pointer; }
  .squeeze-remedies td[data-verdict="issue"] { background: #fdecea; color: #b3261e; }
  .squeeze-remedies td[data-verdict="warning"] { background: #fff4e0; color: #8a5300; }
  .squeeze-remedies td[data-verdict="fit"] { background: #e6f4ea; color: #1e7b34; }
  .squeeze-remedies td[aria-selected="true"] { outline: 2px solid ${siteTheme.text}; outline-offset: -2px; }
  .squeeze-remedy-key { display: flex; flex-wrap: wrap; gap: 4px 18px; margin: 0 0 14px; font-size: 12px; }
  .squeeze-remedy-key div { display: flex; gap: 6px; }
  .squeeze-remedy-key dt { font-weight: 700; }
  .squeeze-remedy-key dd { margin: 0; color: ${siteTheme.textMuted}; }
  .squeeze-remedy-key code { margin-left: 6px; font-size: 11px; }
  .squeeze-tag[data-remedy] { background: #e8eefb; color: #2f4f8f; }
  .squeeze-card dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; margin: 0; }
  .squeeze-card dt { color: ${siteTheme.textMuted}; }
  .squeeze-card dd { margin: 0; font-variant-numeric: tabular-nums; }
  .squeeze-room { display: flex; flex-wrap: wrap; gap: 2px 12px; margin: 6px 0 0; padding: 0; list-style: none; }
  .squeeze-room span { color: ${siteTheme.textMuted}; }
`;
