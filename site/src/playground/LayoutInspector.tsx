import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ChartAssemblyInput } from 'flint-chart';
import { compile as compileVegaLite } from 'vega-lite';
import { parse as parseVega, View as VegaView } from 'vega';
import { openVegaLiteSession, vegaLiteHonour, type VegaLiteSession } from '../../../packages/flint-js/src/vegalite/assemble';
import { readDrawnLayout } from '../../../packages/flint-js/src/vegalite/drawn-layout';
import { vegaRendererOrigin } from '../../../packages/flint-js/src/vegalite/interactions/hit-adapter';
import { listThemePresets } from '../../../packages/flint-js/src/core/theme/presets';
import type { LayoutPlan, PlanReason } from '../../../packages/flint-js/src/core/plan';
import type { PlanStage } from '../../../packages/flint-js/src/core/types';
import { BASKET_SPEC, COUNTY_SPEC, RESIZE_CASES, TEAMS, TEAM_TYPES, specFacts, specStep } from './layout-plan-shared';
import './overflow-viewport-lab.css';
import './layout-inspector.css';

// ─── Parts ─────────────────────────────────────────────────────────────────

type PartId =
  | 'canvas' | 'drawn' | 'pad' | 'title' | 'legend' | 'ylab' | 'ytitle' | 'plot'
  | 'xlab' | 'xtitle' | 'rule' | 'facet' | 'values';

interface Box { x: number; y: number; width: number; height: number }

interface Part {
  id: PartId;
  /** Each drawn box of the part; a facet draws several axes, a chart may draw several keys. */
  boxes: Box[];
  /** The box around all of them. */
  box: Box;
}

const PART_META: Record<PartId, { label: string; color: string; outline?: 'dash' | 'solid' }> = {
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
};

const PART_ORDER: PartId[] = ['canvas', 'drawn', 'pad', 'title', 'legend', 'ylab', 'ytitle', 'plot', 'xlab', 'xtitle', 'rule', 'facet', 'values'];

const EMPTY: Box = { x: 0, y: 0, width: 0, height: 0 };

function union(boxes: Box[]): Box {
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

const r1 = (value: number): number => Math.round(value * 10) / 10;
const px = (value: number): string => String(Math.round(value));
const size = (box: { width: number; height: number } | undefined): string => (box ? `${px(box.width)} × ${px(box.height)}` : '–');
const signed = (value: number): string => (value > 0.5 ? `+${px(value)}` : value < -0.5 ? `−${px(-value)}` : '±0');

// ─── Measuring the drawn chart ─────────────────────────────────────────────

interface Measured {
  drawn: { width: number; height: number };
  padding: { top: number; right: number; bottom: number; left: number };
  parts: Part[];
  views: Array<{ role: string; box: Box }>;
}

/** Every drawn part of a Vega SVG, in the SVG's own pixels, read from the DOM Vega rendered. */
function measureSvg(host: HTMLElement, view: any, plan: LayoutPlan, canvas: { width: number; height: number }): Measured | undefined {
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
    const labels = union([...axis.querySelectorAll('g.role-axis-label, g.role-axis-tick')].map(boxOf));
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
  const texts = [...svg.querySelectorAll('g.mark-text.role-mark')].filter((el) => !el.closest('g.role-axis, g.role-legend, g.role-title'));
  if (texts.length) add('values', union(texts.map(boxOf)));

  return {
    drawn: { width, height },
    padding: pad,
    parts: PART_ORDER.filter((id) => parts.has(id)).map((id) => ({ id, boxes: parts.get(id)!, box: union(parts.get(id)!) })),
    views,
  };
}

// ─── Ledgers ───────────────────────────────────────────────────────────────

interface Segment { name: string; px: number; part: PartId | 'allow'; kind?: 'hatch' | 'void' }
interface LedgerRow { label: string; total: number; segments: Segment[] }
interface Ledger { axis: 'Height' | 'Width'; canvas: number; rows: LedgerRow[] }

/** The parts beside the plot along one axis, in order, with the voids between them named for whatever overhangs there. */
function drawnLedger(measured: Measured, axis: 'Height' | 'Width'): LedgerRow {
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
  const gap = (start: number, end: number) => {
    if (end <= start + 0.5) return;
    const over = overhang(start, end);
    segments.push(over
      ? { name: `${over.name} ${px(end - start)}`, px: end - start, part: over.part, kind: 'void' }
      : { name: px(end - start), px: end - start, part: 'pad', kind: 'void' });
  };
  if (padStart) { segments.push({ name: 'Pad', px: padStart, part: 'pad' }); cursor = padStart; }
  for (const span of spans) {
    const start = Math.max(cursor, span.from);
    const end = Math.min(span.to, total - padEnd);
    if (end <= start + 0.5) continue;
    gap(cursor, start);
    segments.push({ name: `${span.name} ${px(end - start)}`, px: end - start, part: span.part });
    cursor = end;
  }
  gap(cursor, total - padEnd);
  if (padEnd) segments.push({ name: 'Pad', px: padEnd, part: 'pad' });
  return { label: 'Vega drew', total, segments };
}

/** What the planner set aside from the canvas along one axis. */
function plannedLedger(session: VegaLiteSession, canvas: { width: number; height: number }, axis: 'Height' | 'Width'): LedgerRow {
  const { plan } = session;
  const along = axis === 'Height';
  const planned = along ? plan.plot.height : plan.plot.width;
  const drawnPlot = session.plot ? (along ? session.plot.height : session.plot.width) : planned;
  const segments: Segment[] = [{ name: `Plot ${px(drawnPlot)}`, px: drawnPlot, part: 'plot' }];
  if (along) {
    const titleTaken = (plan.title?.headline?.lines ? plan.title.headline.taken : 0) + (plan.title?.deckFit?.taken ?? 0);
    if (titleTaken > 0) segments.push({ name: `Title lines ${px(titleTaken)}`, px: titleTaken, part: 'title' });
    if (plan.rules?.fromPlot && plan.rules.room > 0) segments.push({ name: `Rule ${px(plan.rules.room)}`, px: plan.rules.room, part: 'rule' });
  }
  const spent = segments.reduce((sum, seg) => sum + seg.px, 0);
  const room = (along ? canvas.height : canvas.width) - spent;
  if (room > 0.5) {
    if (plan.reserve) {
      const reserved = along ? plan.reserve.height : plan.reserve.width;
      const taken = Math.min(room, reserved);
      if (taken > 0) segments.push({ name: `Reserve ${px(taken)}`, px: taken, part: 'allow', kind: 'hatch' });
      if (room - taken > 0.5) segments.push({ name: px(room - taken), px: room - taken, part: 'allow', kind: 'void' });
    } else {
      const fixed = (along ? plan.options.facetFixedPadding?.height : plan.options.facetFixedPadding?.width) ?? 0;
      const gap = plan.options.facetGap ?? 0;
      const allowance = Math.min(room, fixed + gap);
      if (allowance > 0) segments.push({ name: `Allowance ${px(allowance)}`, px: allowance, part: 'allow', kind: 'hatch' });
      if (room - allowance > 0.5) segments.push({ name: px(room - allowance), px: room - allowance, part: 'allow', kind: 'void' });
    }
  }
  return { label: 'Planner set aside', total: segments.reduce((sum, seg) => sum + seg.px, 0), segments };
}

// ─── Presets ───────────────────────────────────────────────────────────────

interface Preset { id: string; label: string; input: ChartAssemblyInput }

const SORTED_TEAMS = [...TEAMS].sort((a, b) => b.Goals - a.Goals);

const PRESETS: Preset[] = [
  {
    id: 'teams',
    label: 'Bars · 16 teams, Datawrapper',
    input: {
      data: { values: SORTED_TEAMS.slice(0, 16) },
      semantic_types: TEAM_TYPES,
      theme_spec: { extends: 'datawrapper' },
      chart_spec: {
        chartType: 'Bar Chart',
        title: 'Goals per team',
        encodings: { x: 'Team', y: 'Goals', color: 'Confederation' },
        baseSize: { width: 520, height: 300 },
        canvasSize: { width: 520, height: 300 },
      },
    },
  },
  { id: 'basket', label: 'Stacked bars · 10 years, Datawrapper', input: BASKET_SPEC },
  ...RESIZE_CASES.map(({ id, label, spec }) => ({
    id,
    label,
    input: { ...spec, chart_spec: { ...spec.chart_spec, baseSize: { width: 520, height: 320 }, canvasSize: { width: 520, height: 320 } } },
  })),
  {
    id: 'facets',
    label: 'Facets · goals by confederation',
    input: {
      data: { values: SORTED_TEAMS },
      semantic_types: TEAM_TYPES,
      theme_spec: { extends: 'economist' },
      chart_spec: {
        chartType: 'Bar Chart',
        title: 'Goals per team by confederation',
        encodings: { x: 'Team', y: 'Goals', column: 'Confederation' },
        baseSize: { width: 720, height: 360 },
        canvasSize: { width: 720, height: 360 },
      },
    },
  },
  { id: 'county', label: 'Bars · 3 000 counties (overflow)', input: { ...COUNTY_SPEC, chart_spec: { ...COUNTY_SPEC.chart_spec, canvasSize: { width: 520, height: 300 }, baseSize: { width: 520, height: 300 } } } },
];

const THEMES = listThemePresets();
const MIN_CANVAS = { width: 160, height: 120 };
const MAX_CANVAS = { width: 1400, height: 1000 };

/** The theme a spec names: a preset id, `custom` for a theme spelled out without one, `none` for no theme. */
const themeOf = (input: ChartAssemblyInput): string => {
  const theme = input.theme_spec;
  if (!theme) return 'none';
  if (typeof theme === 'string') return theme;
  return theme.extends ?? 'custom';
};

const canvasOf = (input: ChartAssemblyInput): { width: number; height: number } =>
  input.chart_spec.canvasSize ?? input.chart_spec.baseSize ?? { width: 300, height: 300 };

/** The input as the editor shows it: everything but the rows, which stay with the preset. */
function editorText(input: ChartAssemblyInput): string {
  const { data, ...rest } = input;
  const count = Array.isArray((data as any)?.values) ? (data as any).values.length : 0;
  return JSON.stringify({ ...rest, data: { values: `(${count} rows from the preset; give an array to replace them)` } }, null, 2);
}

// ─── Steering: pins ────────────────────────────────────────────────────────

type DecisionId = 'step' | 'angle' | 'size' | 'legend' | 'values';

type Pins = Partial<{ step: number; angle: number; size: number; legend: string; values: boolean }>;

const DECISIONS: { id: DecisionId; label: string; kind: 'hard' | 'soft'; hint: string }[] = [
  { id: 'step', label: 'Band step', kind: 'hard', hint: 'px per category; the plot follows the count instead of the canvas' },
  { id: 'angle', label: 'Label angle', kind: 'hard', hint: 'x tick labels, degrees from straight' },
  { id: 'size', label: 'Label size', kind: 'hard', hint: 'tick label font size on both axes' },
  { id: 'legend', label: 'Legend position', kind: 'soft', hint: 'a theme preference the plan may overrule' },
  { id: 'values', label: 'Value labels', kind: 'soft', hint: 'printed only where they fit' },
];

const LEGEND_PINS = ['top', 'right', 'bottom', 'left', 'inline', 'seriesEnd', 'none'];

/** What one plan decided, in the terms a pin is stated in. */
interface Decided {
  step: number | undefined;
  angle: number;
  size: number;
  sizeAsked: number | undefined;
  straightRefused: boolean;
  legend: string;
  values: boolean;
  rowsCut: number;
}

function decided(session: VegaLiteSession): Decided {
  const x = session.axisLabels.x;
  const facts = specFacts(session.spec);
  const warnings: { message?: string }[] = session.spec?._warnings ?? [];
  const rowsCut = warnings.map((warning) => Number(/^(\d+) of/.exec(warning.message ?? '')?.[1] ?? 0)).reduce((sum, value) => sum + value, 0);
  return {
    step: specStep(session.spec, 'width') ?? specStep(session.spec, 'height'),
    angle: Math.abs(x.angle ?? 0),
    size: x.fontSize,
    sizeAsked: x.crowdedFrom,
    straightRefused: Boolean(x.straightRefused),
    legend: facts.legend,
    values: facts.values,
    rowsCut,
  };
}

const showDecision = (id: DecisionId, d: Decided): string => {
  switch (id) {
    case 'step': return d.step === undefined ? '–' : `${r1(d.step)} px`;
    case 'angle': return `${d.angle}°`;
    case 'size': return `${d.size}px`;
    case 'legend': return d.legend;
    case 'values': return d.values ? 'shown' : 'hidden';
  }
};

const pinValueOf = (id: DecisionId, d: Decided): Pins[DecisionId] => {
  switch (id) {
    case 'step': return d.step === undefined ? 20 : Math.round(d.step);
    case 'angle': return d.angle;
    case 'size': return d.size;
    case 'legend': return d.legend;
    case 'values': return d.values;
  }
};

/** The input with the pins written where the plan reads them, and the session pins it takes directly. */
function withPins(input: ChartAssemblyInput, pins: Pins): { input: ChartAssemblyInput; options: Parameters<typeof openVegaLiteSession>[1] } {
  const themed = pins.legend !== undefined || pins.values !== undefined;
  const base = typeof input.theme_spec === 'string' ? { extends: input.theme_spec } : input.theme_spec;
  const theme: Record<string, any> | undefined = themed ? { ...(base ?? {}) } : base;
  if (theme && pins.legend !== undefined) {
    theme.legend = pins.legend === 'none' ? { ...(theme.legend ?? {}), show: 'never' } : { ...(theme.legend ?? {}), show: 'always', placement: [pins.legend] };
  }
  if (theme && pins.values !== undefined) theme.dataLabels = { ...(theme.dataLabels ?? {}), show: pins.values ? 'always' : 'never' };
  const label = pins.size !== undefined ? { fontSize: pins.size } : {};
  const sessionPins = pins.size !== undefined || pins.angle !== undefined
    ? { pins: { axisLabels: { x: { ...label, ...(pins.angle !== undefined ? { angle: -pins.angle } : {}) }, y: label } } }
    : {};
  return {
    input: {
      ...input,
      ...(theme ? { theme_spec: theme } : {}),
      options: { ...(input.options ?? {}), ...(pins.step !== undefined ? { defaultBandSize: pins.step, minStep: pins.step, bandStepFit: 0 } : {}) },
    },
    options: sessionPins,
  };
}

type Verdict = { tone: 'kept' | 'cost' | 'refused'; text: string };

/** Whether the plan kept a pin, and what it cost or why it refused. */
function verdict(id: DecisionId, pins: Pins, now: Decided, free: Decided): Verdict | undefined {
  const pinned = pins[id];
  if (pinned === undefined) return undefined;
  switch (id) {
    case 'step':
      if (now.rowsCut > 0) return { tone: 'cost', text: `held, ${now.rowsCut} rows cut to fit` };
      return now.step !== undefined && Math.abs(now.step - (pinned as number)) < 0.5
        ? { tone: 'kept', text: 'held; the plot grows or shrinks with the categories instead' }
        : { tone: 'refused', text: `planned ${showDecision('step', now)}` };
    case 'angle':
      return free.angle === pinned
        ? { tone: 'kept', text: 'held; the free plan agrees' }
        : { tone: 'cost', text: `held against the plan, which wants ${free.angle}°${free.straightRefused ? ': labels may collide' : ''}` };
    case 'size':
      return free.size === pinned
        ? { tone: 'kept', text: 'held; the free plan agrees' }
        : { tone: 'cost', text: `held against the plan, which fits ${free.size}px${(pinned as number) > free.size ? ': labels may overlap or truncate' : ''}` };
    case 'legend':
      return now.legend === pinned ? { tone: 'kept', text: 'honoured' } : { tone: 'refused', text: `placed ${now.legend}` };
    case 'values':
      return now.values === pinned ? { tone: 'kept', text: 'honoured' } : { tone: 'refused', text: now.values ? 'printed anyway' : 'dropped: they do not fit' };
  }
}

// ─── Report ────────────────────────────────────────────────────────────────

interface Reading {
  session: VegaLiteSession;
  free: Decided;
  now: Decided;
  measured: Measured;
  ledgers: Ledger[];
  departures: ReturnType<typeof vegaLiteHonour>;
  canvas: { width: number; height: number };
  ms: number;
}

/** The machine-readable report an agent reads from `window.flintLayoutInspector` or the page's JSON block. */
function report(reading: Reading, input: ChartAssemblyInput, pins: Pins) {
  const { session, measured, canvas, ledgers, departures, free, now } = reading;
  const { plan } = session;
  const round = (box: Box) => ({ x: r1(box.x), y: r1(box.y), width: r1(box.width), height: r1(box.height) });
  return {
    chartType: input.chart_spec.chartType,
    theme: typeof input.theme_spec === 'string' ? input.theme_spec : input.theme_spec?.extends ?? (input.theme_spec ? 'custom' : 'none'),
    canvas,
    drawn: measured.drawn,
    overflow: { width: r1(measured.drawn.width - canvas.width), height: r1(measured.drawn.height - canvas.height) },
    padding: measured.padding,
    plot: { planned: { width: r1(plan.plot.width), height: r1(plan.plot.height) }, drawn: session.plot && { width: r1(session.plot.width), height: r1(session.plot.height) }, composite: plan.composite },
    steps: { x: r1(plan.layout.xStep), y: r1(plan.layout.yStep), xFitted: Boolean(plan.layout.xStepFitted), yFitted: Boolean(plan.layout.yStepFitted) },
    pins,
    decisions: Object.fromEntries(DECISIONS.map(({ id }) => [id, { now: showDecision(id, now), free: showDecision(id, free), verdict: verdict(id, pins, now, free) ?? null }])),
    allowance: { fixed: plan.options.facetFixedPadding, gap: plan.options.facetGap },
    reserve: plan.reserve ?? null,
    title: plan.title ? { block: plan.title.block, headline: plan.title.headline ?? null, deck: plan.title.deck ?? null, deckFit: plan.title.deckFit ?? null } : null,
    legend: { placement: plan.legend.placement, orient: plan.legend.orient, direction: plan.legend.direction, demoted: plan.legend.demoted ?? null, footprint: plan.legend.layout?.footprint ?? null, notes: plan.legend.layout?.notes ?? [] },
    axisLabels: plan.axisLabels,
    axisTitles: plan.axisTitles,
    rulers: plan.rulers,
    rules: plan.rules ? { count: plan.rules.rules.length, room: plan.rules.room, fromPlot: plan.rules.fromPlot } : null,
    valueLabels: plan.valueLabels ?? null,
    parts: Object.fromEntries(measured.parts.map((part) => [part.id, { box: round(part.box), boxes: part.boxes.map(round) }])),
    views: measured.views.map(({ role, box }) => ({ role, box: round(box) })),
    plannedViews: plan.laidOutViews ?? plan.views ?? null,
    ledgers: ledgers.map((ledger) => ({ axis: ledger.axis, canvas: ledger.canvas, rows: ledger.rows.map((row) => ({ label: row.label, total: r1(row.total), segments: row.segments.map((seg) => ({ name: seg.name, px: r1(seg.px), part: seg.part, kind: seg.kind ?? 'solid' })) })) })),
    reasons: plan.reasons,
    themeReport: plan.report,
    warnings: plan.warnings,
    departures,
    compileMs: r1(reading.ms),
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────

const MARGIN = 28;

export function LayoutInspector() {
  const [params, setParams] = useSearchParams();
  const initialPreset = PRESETS.find(({ id }) => id === params.get('preset')) ?? PRESETS[0];
  const [presetId, setPresetId] = useState(initialPreset.id);
  const [theme, setTheme] = useState(params.get('theme') ?? themeOf(initialPreset.input));
  const [canvasW, setCanvasW] = useState(Number(params.get('w')) || canvasOf(initialPreset.input).width);
  const [canvasH, setCanvasH] = useState(Number(params.get('h')) || canvasOf(initialPreset.input).height);
  const [pins, setPins] = useState<Pins>({});
  const [edited, setEdited] = useState<ChartAssemblyInput | null>(null);
  const [draft, setDraft] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [focus, setFocus] = useState<PartId | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const preset = PRESETS.find(({ id }) => id === presetId) ?? PRESETS[0];

  const input = useMemo<ChartAssemblyInput>(() => {
    const base = edited ?? preset.input;
    const { theme_spec: own, ...rest } = base;
    const themed = theme === themeOf(base) ? own : theme === 'none' ? undefined : { extends: theme };
    return {
      ...rest,
      ...(themed === undefined ? {} : { theme_spec: themed }),
      chart_spec: { ...base.chart_spec, baseSize: { width: canvasW, height: canvasH }, canvasSize: { width: canvasW, height: canvasH } },
    };
  }, [edited, preset, theme, canvasW, canvasH]);

  const hasTheme = input.theme_spec !== undefined;

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('preset', presetId);
    next.set('theme', theme);
    next.set('w', String(canvasW));
    next.set('h', String(canvasH));
    setParams(next, { replace: true });
  }, [presetId, theme, canvasW, canvasH, setParams]);

  const choosePreset = useCallback((id: string) => {
    const next = PRESETS.find((p) => p.id === id) ?? PRESETS[0];
    setPresetId(next.id);
    setEdited(null);
    setPins({});
    setTheme(themeOf(next.input));
    setCanvasW(canvasOf(next.input).width);
    setCanvasH(canvasOf(next.input).height);
    setDraft(editorText(next.input));
    setEditorError('');
  }, []);

  const applyDraft = () => {
    try {
      const parsed = JSON.parse(draft);
      const rows = Array.isArray(parsed?.data?.values) ? parsed.data.values : (preset.input.data as any).values;
      const next: ChartAssemblyInput = { ...parsed, data: { values: rows } };
      setEdited(next);
      setTheme(themeOf(next));
      const canvas = canvasOf(next);
      setCanvasW(canvas.width);
      setCanvasH(canvas.height);
      setEditorError('');
    } catch (err) {
      setEditorError(String((err as Error).message ?? err));
    }
  };

  const inspect = useCallback(async (target: HTMLElement, chart: ChartAssemblyInput, held: Pins): Promise<Reading> => {
    const start = performance.now();
    const steered = withPins(chart, held);
    const session = openVegaLiteSession(steered.input, steered.options);
    const free = Object.keys(held).length ? decided(openVegaLiteSession(chart)) : decided(session);
    const ms = performance.now() - start;
    const vega = compileVegaLite(session.spec).spec as any;
    target.replaceChildren();
    const view = new VegaView(parseVega(vega), { renderer: 'svg' } as any).initialize(target);
    await view.runAsync();
    const canvas = canvasOf(chart);
    const measured = measureSvg(target, view, session.plan, canvas);
    if (!measured) throw new Error('Vega drew no SVG');
    const ledgers: Ledger[] = (['Height', 'Width'] as const).map((axis) => ({
      axis,
      canvas: axis === 'Height' ? canvas.height : canvas.width,
      rows: [plannedLedger(session, canvas, axis), drawnLedger(measured, axis)],
    }));
    let departures: Reading['departures'] = [];
    try { departures = vegaLiteHonour(steered.input); } catch { departures = []; }
    return { session, free, now: decided(session), measured, ledgers, departures, canvas, ms };
  }, []);

  // One render at a time; a change that lands while one is running waits its turn, and only the newest waits.
  const pending = useRef<{ input: ChartAssemblyInput; pins: Pins } | null>(null);
  const running = useRef(false);
  useEffect(() => {
    pending.current = { input, pins };
    if (running.current) return;
    const target = host.current;
    if (!target) return;
    running.current = true;
    setBusy(true);
    (async () => {
      while (pending.current) {
        const job = pending.current;
        pending.current = null;
        try {
          const next = await inspect(target, job.input, job.pins);
          setReading(next);
          setError('');
        } catch (err) {
          setReading(null);
          setError(String((err as Error).message ?? err));
        }
      }
      running.current = false;
      setBusy(false);
    })();
  }, [input, pins, inspect]);

  const json = useMemo(() => (reading ? JSON.stringify(report(reading, input, pins), null, 2) : ''), [reading, input, pins]);

  useEffect(() => {
    (window as any).flintLayoutInspector = {
      report: reading ? report(reading, input, pins) : null,
      input,
      pins,
      presets: PRESETS.map(({ id, label }) => ({ id, label })),
      setPreset: choosePreset,
      setPins,
      setCanvas: (next: { width?: number; height?: number }) => { if (next.width) setCanvasW(next.width); if (next.height) setCanvasH(next.height); },
      setInput: (next: ChartAssemblyInput) => { setEdited(next); setPins({}); const c = canvasOf(next); setCanvasW(c.width); setCanvasH(c.height); },
    };
  });

  const clamp = (value: number, axis: 'width' | 'height') => Math.round(Math.min(MAX_CANVAS[axis], Math.max(MIN_CANVAS[axis], value)));
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, width: canvasW, height: canvasH };
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setCanvasW(clamp(drag.current.width + event.clientX - drag.current.x, 'width'));
    setCanvasH(clamp(drag.current.height + event.clientY - drag.current.y, 'height'));
  };
  const endDrag = () => { drag.current = null; };

  const togglePin = (id: DecisionId) => setPins((current) => {
    const next = { ...current };
    if (next[id] !== undefined) delete next[id];
    else if (reading) (next as Record<DecisionId, unknown>)[id] = pinValueOf(id, reading.now);
    return next;
  });
  const setPin = (id: DecisionId, value: Pins[DecisionId]) => setPins((current) => ({ ...current, [id]: value }));

  const stage = reading
    ? { width: Math.max(reading.measured.drawn.width, canvasW) + MARGIN * 2 + 24, height: Math.max(reading.measured.drawn.height, canvasH) + MARGIN * 2 + 24 }
    : { width: canvasW + MARGIN * 2 + 24, height: canvasH + MARGIN * 2 + 24 };

  const pinCount = Object.keys(pins).length;

  return (
    <div className="dev-page ov-page li-page">
      <header className="dev-page-heading ov-heading li-heading">
        <div>
          <h1>Layout inspector</h1>
          <p>Every box is measured from the SVG Vega drew and set against what the planner decided. Drag the canvas corner or pin a decision; the rest re-plans.</p>
        </div>
      </header>

      <section className="ov-demo li-demo li-bench">
        <div className="li-toolbar">
          <label>Chart
            <select value={presetId} onChange={(event) => choosePreset(event.target.value)}>
              {PRESETS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label>Theme
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              {themeOf(edited ?? preset.input) === 'custom' && <option value="custom">Custom (spec)</option>}
              {THEMES.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
              <option value="none">None</option>
            </select>
          </label>
          <label className="li-slider">Width
            <input type="range" min={MIN_CANVAS.width} max={MAX_CANVAS.width} step={10} value={canvasW} onChange={(event) => setCanvasW(clamp(Number(event.target.value), 'width'))} aria-label="Canvas width" />
            <output>{canvasW}</output>
          </label>
          <label className="li-slider">Height
            <input type="range" min={MIN_CANVAS.height} max={MAX_CANVAS.height} step={10} value={canvasH} onChange={(event) => setCanvasH(clamp(Number(event.target.value), 'height'))} aria-label="Canvas height" />
            <output>{canvasH}</output>
          </label>
          <div className="li-toolbar-spacer" />
          <button type="button" className={`li-button${editorOpen ? ' active' : ''}`} onClick={() => { if (!editorOpen && !draft) setDraft(editorText(preset.input)); setEditorOpen(!editorOpen); }}>
            {editorOpen ? 'Hide spec' : 'Edit spec'}
          </button>
        </div>
        {editorOpen && (
          <div className="li-editor">
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} />
            <div className="li-editor-foot">
              <button type="button" className="li-button li-button-primary" onClick={applyDraft}>Apply</button>
              <button type="button" className="li-button" onClick={() => { setDraft(editorText(preset.input)); setEdited(null); setEditorError(''); }}>Reset</button>
              {editorError ? <span className="lp-error">{editorError}</span> : <span className="lp-muted">Rows stay with the preset unless <code>data.values</code> is an array; the canvas above sets <code>baseSize</code> and <code>canvasSize</code>.</span>}
            </div>
          </div>
        )}
        {error && <p className="lp-error">{error}</p>}

        <div className="li-workbench">
          <div className="li-stage-scroll">
            <div className={`li-stage${busy ? ' busy' : ''}`} style={{ width: stage.width, height: stage.height }}>
              <div className="li-host" ref={host} style={{ left: MARGIN, top: MARGIN }} />
              {reading && <Overlay reading={reading} focus={focus} stage={stage} canvas={{ width: canvasW, height: canvasH }} />}
              <div
                className="li-canvas-handle"
                style={{ left: MARGIN + canvasW, top: MARGIN + canvasH }}
                role="separator"
                aria-label="Resize the canvas"
                title="Drag to resize the canvas"
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            </div>
          </div>
          <Tree
            reading={reading}
            pins={pins}
            pinCount={pinCount}
            hasTheme={hasTheme}
            focus={focus}
            onFocus={setFocus}
            onTogglePin={togglePin}
            onPin={setPin}
          />
        </div>
      </section>

      {reading && (
        <>
          <section className="ov-demo li-demo">
            <header className="ov-demo-header">
              <div>
                <h2>Budget</h2>
                <p>What the planner set aside along each axis against what Vega drew, to one scale. Hatched is the fixed allowance; dashed is room nothing claims.</p>
              </div>
            </header>
            <Ledgers ledgers={reading.ledgers} max={Math.max(...reading.ledgers.flatMap((ledger) => [ledger.canvas, ...ledger.rows.map((row) => row.total)]))} />
          </section>

          <section className="ov-demo li-demo">
            <header className="ov-demo-header">
              <div>
                <h2>Compile order</h2>
              </div>
            </header>
            <Flow reading={reading} />
          </section>

          <Departures reading={reading} />

          <section className="ov-demo li-demo">
            <header className="ov-demo-header">
              <div>
                <h2>Report</h2>
                <p><code>?preset=&amp;theme=&amp;w=&amp;h=</code> · <code>window.flintLayoutInspector</code>: <code>report</code>, <code>setInput(spec)</code>, <code>setPins({'{'} step: 24 {'}'})</code>, <code>setCanvas({'{'} width, height {'}'})</code>.</p>
              </div>
              <button type="button" className="li-button" onClick={() => { void navigator.clipboard?.writeText(json); }}>Copy JSON</button>
            </header>
            <details className="li-json-details">
              <summary>Report · {json.length.toLocaleString()} characters</summary>
              <pre className="li-json" data-testid="layout-inspector-report">{json}</pre>
            </details>
          </section>
        </>
      )}
    </div>
  );
}

function PinControl({ id, value, onChange }: { id: DecisionId; value: Pins[DecisionId]; onChange: (value: Pins[DecisionId]) => void }) {
  switch (id) {
    case 'step':
      return <label className="li-pin-control">Step <input type="range" min={4} max={80} value={Number(value)} onChange={(event) => onChange(Number(event.target.value))} /><output>{String(value)} px</output></label>;
    case 'angle':
      return (
        <label className="li-pin-control">Angle
          <select value={Number(value)} onChange={(event) => onChange(Number(event.target.value))}>
            {[0, 30, 45, 60, 90].map((angle) => <option key={angle} value={angle}>{angle}°</option>)}
          </select>
          <span />
        </label>
      );
    case 'size':
      return <label className="li-pin-control">Size <input type="range" min={6} max={20} value={Number(value)} onChange={(event) => onChange(Number(event.target.value))} /><output>{String(value)}px</output></label>;
    case 'legend':
      return (
        <label className="li-pin-control">Place
          <select value={String(value)} onChange={(event) => onChange(event.target.value)}>
            {LEGEND_PINS.map((place) => <option key={place} value={place}>{place}</option>)}
          </select>
          <span />
        </label>
      );
    case 'values':
      return (
        <label className="li-pin-control">Labels
          <select value={value ? 'shown' : 'hidden'} onChange={(event) => onChange(event.target.value === 'shown')}>
            <option value="shown">shown</option>
            <option value="hidden">hidden</option>
          </select>
          <span />
        </label>
      );
  }
}

// ─── Drawing ───────────────────────────────────────────────────────────────

function Overlay({ reading, focus, stage, canvas }: { reading: Reading; focus: PartId | null; stage: { width: number; height: number }; canvas: { width: number; height: number } }) {
  const { measured } = reading;
  const at = (box: Box) => ({ x: box.x + MARGIN, y: box.y + MARGIN, width: box.width, height: box.height });
  return (
    <svg className={`li-overlay${focus ? ' focus' : ''}`} width={stage.width} height={stage.height} viewBox={`0 0 ${stage.width} ${stage.height}`} aria-hidden="true">
      {measured.parts.map((part) => {
        const meta = PART_META[part.id];
        const on = focus === part.id;
        return (
          <g key={part.id} className={`li-part${on ? ' on' : ''}`} data-part={part.id}>
            {part.boxes.map((box, index) => {
              const b = part.id === 'canvas' ? { x: MARGIN, y: MARGIN, ...canvas } : at(box);
              if (meta.outline === 'dash') {
                return (
                  <g key={index}>
                    <rect {...b} fill="none" stroke={meta.color} strokeWidth={2} strokeDasharray="7 5" />
                    <text x={b.x} y={b.y - 8} className="li-mono" fill="var(--li-fg)">canvasSize {px(canvas.width)} × {px(canvas.height)}</text>
                  </g>
                );
              }
              if (meta.outline === 'solid') {
                return (
                  <g key={index}>
                    <rect x={b.x + 0.5} y={b.y + 0.5} width={Math.max(0, b.width - 1)} height={Math.max(0, b.height - 1)} fill="none" stroke={meta.color} strokeWidth={1} />
                    <text x={b.x + b.width} y={b.y + b.height + 14} textAnchor="end" className="li-mono" fill="var(--li-fg)">drawn SVG {px(measured.drawn.width)} × {px(measured.drawn.height)}</text>
                  </g>
                );
              }
              return (
                <rect key={index} {...b} fill={meta.color} fillOpacity={part.id === 'plot' ? 0.08 : part.id === 'values' ? 0.04 : part.id === 'pad' ? 0.16 : 0.14} stroke={part.id === 'pad' ? 'none' : meta.color} strokeWidth={part.id === 'plot' ? 1.5 : 1} />
              );
            })}
            {on && part.id !== 'canvas' && part.id !== 'drawn' && (() => {
              const b = at(part.box);
              const above = b.y >= MARGIN + 14;
              return (
                <g>
                  <line x1={b.x} x2={b.x + b.width} y1={b.y + b.height + 6} y2={b.y + b.height + 6} stroke={meta.color} strokeWidth={1} />
                  <line x1={b.x - 6} x2={b.x - 6} y1={b.y} y2={b.y + b.height} stroke={meta.color} strokeWidth={1} />
                  <text x={Math.max(4, b.x)} y={above ? b.y - 4 : b.y + b.height + 20} className="li-mono li-label" fill={meta.color}>
                    {meta.label} {px(part.box.width)} × {px(part.box.height)} at {px(part.box.x)}, {px(part.box.y)}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

function partDetail(part: Part, reading: Reading): string {
  const { session, measured, canvas } = reading;
  const { plan } = session;
  switch (part.id) {
    case 'canvas': return 'The room the spec asked for';
    case 'drawn': {
      const dw = measured.drawn.width - canvas.width;
      const dh = measured.drawn.height - canvas.height;
      const word = (d: number, axis: string) => (d > 0.5 ? `${px(d)} ${axis}er` : d < -0.5 ? `${px(-d)} ${axis === 'wid' ? 'narrower' : 'shorter'}` : `same ${axis === 'wid' ? 'width' : 'height'}`);
      return `What Vega drew: ${word(dw, 'wid')}, ${word(dh, 'tall')}`;
    }
    case 'pad': return `Theme padding: ${measured.padding.top} ${measured.padding.right} ${measured.padding.bottom} ${measured.padding.left}`;
    case 'title': {
      const t = plan.title;
      if (!t) return 'Left to the backend';
      const bits = [`block ${px(t.block)}`];
      if (t.headline?.lines) bits.push(`${t.headline.lines.length} headline lines`);
      else if (t.headline?.fontSize) bits.push(`headline set down to ${t.headline.fontSize}px`);
      if (t.deckFit) bits.push(`${t.deckFit.lines.length} deck lines`);
      return bits.join(' · ');
    }
    case 'legend': {
      const foot = plan.legend.layout?.footprint ?? [];
      return `${plan.legend.placement} · ${plan.legend.orient ?? ''} ${plan.legend.direction ?? ''}${foot.length ? ` · planned ${foot.map((f) => `${px(f.width)} × ${px(f.height)} ${f.orient}`).join(', ')}` : ''}`.trim();
    }
    case 'ylab': return `${plan.axisLabels.y.fontSize}px${plan.axisLabels.y.angle ? ` · ${plan.axisLabels.y.angle}°` : ''}${plan.rulers.y ? ` · ruler ${plan.rulers.y.values.length} ticks` : ''}`;
    case 'xlab': return `${plan.axisLabels.x.fontSize}px${plan.axisLabels.x.angle ? ` · turned ${plan.axisLabels.x.angle}°` : ' · straight'}${plan.axisLabels.x.crowdedFrom ? ` · crowded from ${plan.axisLabels.x.crowdedFrom}px` : ''}`;
    case 'ytitle': return plan.axisTitles.y === null ? 'Untitled by the plan' : `"${plan.axisTitles.y ?? '(backend)'}"`;
    case 'xtitle': return plan.axisTitles.x === null ? 'Untitled by the plan' : `"${plan.axisTitles.x ?? '(backend)'}"`;
    case 'plot': {
      const steps = [plan.layout.xStep ? `x step ${r1(plan.layout.xStep)}${plan.layout.xStepFitted ? ' fitted' : ''}` : '', plan.layout.yStep ? `y step ${r1(plan.layout.yStep)}${plan.layout.yStepFitted ? ' fitted' : ''}` : ''].filter(Boolean);
      return `planned ${size(plan.plot)}${session.plot ? `, drawn ${size(session.plot)}` : ''}${steps.length ? ` · ${steps.join(', ')}` : ''}${plan.composite ? ' · composite' : ''}`;
    }
    case 'rule': return plan.rules ? `${plan.rules.rules.length} rule${plan.rules.rules.length === 1 ? '' : 's'}, room ${px(plan.rules.room)}${plan.rules.fromPlot ? ' from the plot' : ''}` : 'Drawn, not planned';
    case 'facet': return plan.facetGrid ? `${plan.facetGrid.columns} × ${plan.facetGrid.rows} grid` : 'Headers Vega drew';
    case 'values': {
      const v = plan.valueLabels;
      if (!v) return 'Text the template draws';
      if ('refused' in v) return `value labels refused: ${v.refused}`;
      return `value labels: ${v.form}${v.inside ? ', inside' : ''}${v.inset ? `, inset ${v.inset}` : ''}`;
    }
  }
}

interface TreeNode {
  id: string;
  label: string;
  /** The drawn part the node stands for, lit on the stage when the node is hovered. */
  part?: PartId;
  /** What was measured, as drawn. */
  measure?: string;
  /** What the plan decided. */
  decision?: string;
  reasons: PlanReason[];
  pins?: DecisionId[];
  children?: TreeNode[];
  /** Open by default. */
  open?: boolean;
}

/** The chart's parts as a tree: what each is, what was measured, what was decided, and why. */
function buildTree(reading: Reading): TreeNode[] {
  const { session, measured, canvas, now } = reading;
  const { plan } = session;
  const partBox = (id: PartId) => measured.parts.find((part) => part.id === id);
  const reasonsOf = (part: PlanReason['part'], channel?: PlanReason['channel']) => plan.reasons.filter((r) => r.part === part && (channel === undefined || r.channel === channel));
  const dw = measured.drawn.width - canvas.width;
  const dh = measured.drawn.height - canvas.height;
  const nodes: TreeNode[] = [];

  nodes.push({
    id: 'canvas', label: 'Canvas', part: 'canvas', measure: size(canvas), decision: reasonsOf('canvas')[0]?.decision, reasons: reasonsOf('canvas'), open: true,
    children: [
      ...reasonsOf('rows').map((r, i) => ({ id: `rows${i}`, label: 'Rows that fit', decision: r.decision, reasons: [r] })),
      ...reasonsOf('facets').map((r) => ({ id: 'facets', label: 'Facet grid', part: partBox('facet') ? 'facet' as PartId : undefined, measure: partBox('facet') ? size(partBox('facet')!.box) : undefined, decision: r.decision, reasons: [r] })),
    ],
  });
  nodes.push({
    id: 'drawn', label: 'Drawn SVG', part: 'drawn', measure: size(measured.drawn), decision: `${signed(dw)} wide, ${signed(dh)} tall against the canvas`, reasons: [],
    children: [{ id: 'pad', label: 'Padding', part: 'pad', measure: `${measured.padding.top} ${measured.padding.right} ${measured.padding.bottom} ${measured.padding.left}`, decision: 'the theme\'s padding; Vega adds it outside everything', reasons: [] }],
  });
  const plotBox = partBox('plot');
  nodes.push({
    id: 'plot', label: 'Plot', part: 'plot', measure: plotBox ? size(plotBox.box) : undefined, open: true,
    decision: `planned ${size(plan.plot)}${session.plot && (session.plot.height !== plan.plot.height || session.plot.width !== plan.plot.width) ? `, ${size(session.plot)} after the title and rules` : ''}${plan.composite ? ' per panel' : ''}`,
    reasons: [],
    children: [
      { id: 'plot-w', label: 'Width', decision: reasonsOf('plot', 'width')[0]?.decision, reasons: reasonsOf('plot', 'width') },
      { id: 'plot-h', label: 'Height', decision: reasonsOf('plot', 'height')[0]?.decision, reasons: reasonsOf('plot', 'height') },
      ...(reasonsOf('step', 'x').length ? [{ id: 'step-x', label: 'X band step', decision: reasonsOf('step', 'x')[0].decision, reasons: reasonsOf('step', 'x'), pins: ['step'] as DecisionId[] }] : []),
      ...(reasonsOf('step', 'y').length ? [{ id: 'step-y', label: 'Y band step', decision: reasonsOf('step', 'y')[0].decision, reasons: reasonsOf('step', 'y'), ...(reasonsOf('step', 'x').length ? {} : { pins: ['step'] as DecisionId[] }) }] : []),
    ],
  });
  const axisChildren: TreeNode[] = [];
  for (const channel of ['x', 'y'] as const) {
    const lab = partBox(channel === 'x' ? 'xlab' : 'ylab');
    const labelReasons = reasonsOf('labels', channel);
    if (lab || labelReasons.length) {
      axisChildren.push({
        id: `${channel}lab`, label: `${channel.toUpperCase()} tick labels`, part: channel === 'x' ? 'xlab' : 'ylab', measure: lab ? size(lab.box) : undefined,
        decision: labelReasons[0]?.decision, reasons: labelReasons, ...(channel === 'x' ? { pins: ['angle', 'size'] as DecisionId[] } : {}),
      });
    }
    const title = partBox(channel === 'x' ? 'xtitle' : 'ytitle');
    const printed = plan.axisTitles[channel];
    if (title || printed) {
      axisChildren.push({ id: `${channel}title`, label: `${channel.toUpperCase()} axis title`, part: channel === 'x' ? 'xtitle' : 'ytitle', measure: title ? size(title.box) : undefined, decision: printed === null ? 'untitled by the plan' : printed ? `"${printed}"` : 'left to the backend', reasons: [] });
    }
    const ruler = plan.rulers[channel];
    if (ruler) axisChildren.push({ id: `${channel}ruler`, label: `${channel.toUpperCase()} ruler`, decision: `${ruler.values.length} ticks, ${ruler.domain.map(px).join(' to ')}`, reasons: [] });
  }
  if (axisChildren.length) nodes.push({ id: 'axes', label: 'Axes', reasons: [], children: axisChildren, open: true });
  const title = partBox('title');
  if (title || plan.title) nodes.push({ id: 'title', label: 'Title and deck', part: 'title', measure: title ? size(title.box) : undefined, decision: reasonsOf('title')[0]?.decision, reasons: reasonsOf('title') });
  const legend = partBox('legend');
  if (legend || plan.legend.keys.length) nodes.push({ id: 'legend', label: 'Legend', part: 'legend', measure: legend ? size(legend.box) : undefined, decision: reasonsOf('legend')[0]?.decision ?? now.legend, reasons: reasonsOf('legend'), pins: ['legend'] });
  const rule = partBox('rule');
  if (rule || plan.rules) nodes.push({ id: 'rules', label: 'Closing rules', part: 'rule', measure: rule ? size(rule.box) : undefined, decision: reasonsOf('rules')[0]?.decision, reasons: reasonsOf('rules') });
  const values = partBox('values');
  nodes.push({ id: 'values', label: 'Value labels', part: values ? 'values' : undefined, measure: values ? size(values.box) : undefined, decision: reasonsOf('values')[0]?.decision ?? (now.values ? 'shown' : 'none'), reasons: reasonsOf('values'), pins: ['values'] });
  nodes.push({ id: 'reserve', label: 'Measured reserve', decision: reasonsOf('reserve')[0]?.decision, reasons: reasonsOf('reserve') });
  return nodes;
}

function Tree({ reading, pins, pinCount, hasTheme, focus, onFocus, onTogglePin, onPin }: {
  reading: Reading | null;
  pins: Pins;
  pinCount: number;
  hasTheme: boolean;
  focus: PartId | null;
  onFocus: (id: PartId | null) => void;
  onTogglePin: (id: DecisionId) => void;
  onPin: (id: DecisionId, value: Pins[DecisionId]) => void;
}) {
  const nodes = useMemo(() => (reading ? buildTree(reading) : []), [reading]);
  return (
    <aside className="li-tree-pane" onMouseLeave={() => onFocus(null)}>
      <h3>Parts{pinCount ? <span className="li-count">{pinCount} pinned</span> : null}</h3>
      {!reading ? <p className="lp-muted">Compiling…</p> : (
        <ul className="li-tree">
          {nodes.map((node) => (
            <TreeItem key={node.id} node={node} depth={0} reading={reading} pins={pins} hasTheme={hasTheme} focus={focus} onFocus={onFocus} onTogglePin={onTogglePin} onPin={onPin} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function TreeItem({ node, depth, reading, pins, hasTheme, focus, onFocus, onTogglePin, onPin }: {
  node: TreeNode; depth: number; reading: Reading; pins: Pins; hasTheme: boolean; focus: PartId | null;
  onFocus: (id: PartId | null) => void; onTogglePin: (id: DecisionId) => void; onPin: (id: DecisionId, value: Pins[DecisionId]) => void;
}) {
  const colour = node.part ? PART_META[node.part].color : 'var(--li-allow)';
  const outline = node.part ? PART_META[node.part].outline : undefined;
  const lit = node.part !== undefined && focus === node.part;
  const chain = node.reasons.flatMap((r) => r.chain);
  const hasChildren = Boolean(node.children?.length);
  const head = (
    <>
      <div className="li-node-head" onMouseEnter={() => node.part && onFocus(node.part)}>
        <span className="li-node-caret" aria-hidden="true" />
        <i className={`sw${outline ? ` ${outline}` : ''}`} />
        <span className="li-node-text">
          <b>{node.label}</b>
          {node.decision && <span className="li-node-decision">{node.decision}</span>}
        </span>
        {node.measure && <span className="li-node-measure">{node.measure}</span>}
      </div>
    </>
  );
  const detail = (
    <>
      {node.pins?.map((id) => {
        const decision = DECISIONS.find((d) => d.id === id)!;
        const held = pins[id] !== undefined;
        const needsTheme = (id === 'legend' || id === 'values') && !hasTheme;
        const status = verdict(id, pins, reading.now, reading.free);
        return (
          <div key={id} className={`li-node-pin${held ? ' held' : ''}`} data-decision={id} data-status={status?.tone ?? 'live'}>
            <div className="li-node-pin-head">
              <span className="li-node-pin-label">{decision.label}<em>{decision.kind}</em></span>
              <code>{showDecision(id, reading.now)}{held && showDecision(id, reading.free) !== showDecision(id, reading.now) ? <small>free {showDecision(id, reading.free)}</small> : null}</code>
              <button type="button" className={`li-lock${held ? ' active' : ''}`} aria-pressed={held} aria-label={`${held ? 'Unpin' : 'Pin'} ${decision.label}`} disabled={needsTheme} title={needsTheme ? 'Needs a theme' : decision.hint} onClick={() => onTogglePin(id)}>{held ? 'Pinned' : 'Live'}</button>
            </div>
            {held && <PinControl id={id} value={pins[id]} onChange={(value) => onPin(id, value)} />}
            {status && <small className={`li-verdict li-verdict-${status.tone}`}>{status.text}</small>}
          </div>
        );
      })}
      {chain.length > 0 && (
        <details className="li-node-why">
          <summary>Why <small>{chain.length} rule{chain.length === 1 ? '' : 's'}</small></summary>
          <Chain chain={chain} />
        </details>
      )}
    </>
  );
  return (
    <li className={`li-node depth-${depth}${lit ? ' on' : ''}${hasChildren ? ' group' : ''}`} data-node={node.id} style={{ ['--sw' as string]: colour }}>
      {hasChildren ? (
        <details open={node.open}>
          <summary className="li-node-summary">{head}</summary>
          <div className="li-node-detail">{detail}</div>
          <ul className="li-tree">
            {node.children!.map((child) => (
              <TreeItem key={child.id} node={child} depth={depth + 1} reading={reading} pins={pins} hasTheme={hasTheme} focus={focus} onFocus={onFocus} onTogglePin={onTogglePin} onPin={onPin} />
            ))}
          </ul>
        </details>
      ) : <div className="li-node-summary leaf">{head}<div className="li-node-detail">{detail}</div></div>}
    </li>
  );
}

const segColour = (seg: Segment): string => (seg.part === 'allow' ? 'var(--li-allow)' : PART_META[seg.part].color);

function Ledgers({ ledgers, max }: { ledgers: Ledger[]; max: number }) {
  return (
    <div className="li-ledger-wrap">
      <div className="li-ledger">
        {ledgers.map((ledger) => {
          const drawn = ledger.rows[1].total;
          const over = drawn - ledger.canvas;
          return (
            <section key={ledger.axis} className="li-ledger-block">
              <header className="li-ledger-head">
                <b>{ledger.axis}</b>
                <span>canvas <code>{px(ledger.canvas)}</code></span>
                <span>drawn <code>{px(drawn)}</code></span>
                <span className={`li-over ${over > 0.5 ? 'over' : 'fits'}`}>{over > 0.5 ? `${px(over)} px past the canvas` : over < -0.5 ? `${px(-over)} px short of the canvas` : 'fills the canvas'}</span>
              </header>
              {ledger.rows.map((row, index) => (
                <div key={row.label} className="li-lrow">
                  <div className="lab">{index === 0 ? 'Planned' : 'Drawn'}</div>
                  <div className="track">
                    {(() => {
                      let at = 0;
                      return row.segments.map((seg, i) => {
                        const left = (at / max) * 100;
                        const width = (seg.px / max) * 100;
                        at += seg.px;
                        return (
                          <div key={i} className={`seg${seg.kind ? ` ${seg.kind}` : ''}`} style={{ left: `${left}%`, width: `${width}%`, ['--c' as string]: segColour(seg) }} title={`${seg.name} (${px(seg.px)} px)`}>
                            {seg.px / max > 0.06 ? seg.name : ''}
                          </div>
                        );
                      });
                    })()}
                    <div className="mark" style={{ left: `${(ledger.canvas / max) * 100}%` }} />
                  </div>
                  <div className="total">{px(row.total)}</div>
                  <ol className="items">
                    {row.segments.map((seg, i) => (
                      <li key={i} className={seg.kind ?? ''} style={{ ['--c' as string]: segColour(seg) }}>
                        <i />{seg.kind === 'void' && !/[a-z]/i.test(seg.name) ? 'gap' : seg.name.replace(/\s\d+$/, '')}<code>{px(seg.px)}</code>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

const readText = (read: PlanStage['read']): string =>
  Object.entries(read ?? {}).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${key} ${typeof value === 'boolean' ? (value ? 'yes' : 'no') : value}`).join(' · ');

function Chain({ chain }: { chain: PlanStage[] }) {
  if (!chain.length) return <span className="lp-muted">no trace</span>;
  return (
    <ol className="li-chain">
      {chain.map((stage, index) => (
        <li key={index}>
          <span className="li-chain-rule">{stage.rule}</span>
          <span className="li-chain-value">{String(stage.value)}</span>
          {stage.read && Object.keys(stage.read).length > 0 && <span className="li-chain-read">{readText(stage.read)}</span>}
          {stage.note && <span className="li-chain-note">{stage.note}</span>}
        </li>
      ))}
    </ol>
  );
}

function Flow({ reading }: { reading: Reading }) {
  const { session, measured } = reading;
  const { plan } = session;
  const steps: Array<{ title: string; text: string; kind?: 'plan' | 'cond' }> = [
    { title: 'Analyze', text: `${plan.rows.length} rows; types, formats, domains.` },
    { title: 'Plan: before the plot', text: `Stretch caps from the canvas (β = ${r1(plan.options.maxStretchX ?? 1)} × ${r1(plan.options.maxStretchY ?? 1)}), facet grid${plan.facetGrid ? ` ${plan.facetGrid.columns} × ${plan.facetGrid.rows}` : ''}, rows that fit${plan.warnings.length ? ` (${plan.warnings.length} warning${plan.warnings.length === 1 ? '' : 's'})` : ''}.`, kind: 'plan' },
    { title: 'Plan: around the plot', text: `Plot ${size(plan.plot)}, then labels, title, rules, keys, values.`, kind: 'plan' },
    { title: 'Reserve pass', text: plan.reserve ? `Measured ${px(plan.reserve.width)} × ${px(plan.reserve.height)}; plot laid out again.` : 'Skipped: no fitted step.', kind: 'cond' },
    { title: 'Emit', text: `Vega-Lite spec; width and height are the plot, ${session.plot ? size(session.plot) : 'per view'}.` },
    { title: 'Vega draws', text: `The SVG grows to ${size(measured.drawn)}.` },
  ];
  return (
    <div className="li-flow">
      {steps.map((step, index) => (
        <div key={step.title} className="li-flow-item">
          {index > 0 && <div className="li-arrow">→</div>}
          <div className={`li-step${step.kind ? ` ${step.kind}` : ''}`}><b>{step.title}</b><span>{step.text}</span></div>
        </div>
      ))}
    </div>
  );
}

function Departures({ reading }: { reading: Reading }) {
  const { session, departures } = reading;
  const items = [
    ...session.plan.report.map((r) => ({ kind: `theme · ${r.stage}`, path: r.path, code: r.code, message: r.message })),
    ...session.plan.warnings.map((w: any) => ({ kind: 'warning', path: w.code ?? '', code: w.code ?? '', message: w.message ?? JSON.stringify(w) })),
    ...departures.map((d: any) => ({ kind: 'honour', path: d.path ?? d.decision ?? '', code: d.code ?? '', message: d.message ?? JSON.stringify(d) })),
  ];
  if (!items.length) return null;
  return (
    <section className="ov-demo li-demo">
      <header className="ov-demo-header">
        <div>
          <h2>Where the plan gave way</h2>
        </div>
      </header>
      <ul className="li-departures">
        {items.map((item, index) => (
          <li key={index}><span className="li-kind">{item.kind}</span><code>{item.path}</code>{item.code && item.code !== item.path ? <code>{item.code}</code> : null}<span>{item.message}</span></li>
        ))}
      </ul>
    </section>
  );
}
