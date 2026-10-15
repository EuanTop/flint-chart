// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Where each chart of a board goes: the rows the card draws and the report
 * describes. The server and the card share it, so the model reads the layout
 * the reader sees.
 */

export type ChartHeight = 'compact' | 'standard' | 'tall';

export interface ChartLayout {
  /** Board columns the chart spans; clamped to the board's columns. */
  span?: number;
  height?: ChartHeight;
}

/** The most a chart in a row of each tier may take, in pixels, below the cell heading; it takes less when its plan needs less. */
export const HEIGHT_PX: Record<ChartHeight, number> = { compact: 180, standard: 340, tall: 468 };

/** The units a row is divided into. */
export const ROW_UNITS = 12;

/** Chart types that read along a long axis: they take the full row, and a tall one when alone in it, unless told otherwise. */
const WIDE_TYPES = new Set([
  'Line Chart', 'Area Chart', 'Streamgraph', 'Range Area Chart', 'Bump Chart', 'Candlestick Chart',
  'Calendar Heatmap', 'Gantt Chart', 'Map', 'Choropleth',
]);

const HEIGHT_RANK: Record<ChartHeight, number> = { compact: 0, standard: 1, tall: 2 };

export interface LayoutChart {
  id: string;
  chartType: string;
  layout?: ChartLayout;
}

export interface PlacedChart {
  id: string;
  kpi: boolean;
  /** Units of the row the chart takes, out of {@link ROW_UNITS}. */
  units: number;
}

export interface BoardRow {
  kpi: boolean;
  height: ChartHeight;
  charts: PlacedChart[];
}

export const isKpi = (chartType: string) => chartType === 'KPI Card';

/** The board's columns: as set, else two once it holds two charts that are not KPI tiles. */
export function boardColumns(charts: readonly LayoutChart[], columns?: number): number {
  if (columns) return Math.max(1, Math.min(4, Math.round(columns)));
  return charts.filter((chart) => !isKpi(chart.chartType)).length >= 2 ? 2 : 1;
}

/** The span a chart takes, in board columns. */
export function chartSpan(chart: LayoutChart, columns: number): number {
  const asked = chart.layout?.span ?? (WIDE_TYPES.has(chart.chartType) ? columns : 1);
  return Math.max(1, Math.min(columns, Math.round(asked)));
}

/** The narrowest cell a chart is planned into before the board drops a column. */
export const MIN_CELL_WIDTH = 340;
/**
 * The narrowest a KPI tile is given before tiles wrap to a second row. A KPI Card draws at least
 * ~230 px wide whatever its room, so a narrower tile is scaled down; a row of tiles reads better
 * slightly smaller than wrapped into large pairs.
 */
export const MIN_TILE_WIDTH = 140;
/** The gap between cells of a row, in pixels. */
export const CELL_GAP = 24;
/** The card width from which a time series alone in its row takes a tall row. */
const TALL_ROW_WIDTH = 720;

const fitting = (width: number, cell: number) => Math.max(1, Math.floor((width + CELL_GAP) / (cell + CELL_GAP)));

/**
 * The rows of a board. KPI tiles that follow each other share rows of up to four;
 * other charts fill rows by span, and a row left short is stretched to the full
 * width so the board has no holes; a KPI row left short spreads its tiles the same
 * way. Every chart in a row takes the row's tallest height, so the plots of a row
 * line up. Given the card's width, the board keeps no more columns, and no more
 * tiles in a row, than fit at their narrowest.
 */
export function boardRows(charts: readonly LayoutChart[], asked: number, width?: number): BoardRow[] {
  const columns = width === undefined ? asked : Math.min(asked, fitting(width, MIN_CELL_WIDTH));
  const tilesPerRow = width === undefined ? 4 : Math.min(4, fitting(width, MIN_TILE_WIDTH));
  const narrow = columns === 1;
  const tallRows = width === undefined || width >= TALL_ROW_WIDTH;
  const rows: BoardRow[] = [];
  let index = 0;
  while (index < charts.length) {
    const chart = charts[index];
    if (isKpi(chart.chartType)) {
      const run: LayoutChart[] = [];
      while (index < charts.length && isKpi(charts[index].chartType)) run.push(charts[index++]);
      const perRow = Math.ceil(run.length / Math.ceil(run.length / tilesPerRow));
      for (let start = 0; start < run.length; start += perRow) {
        const group = run.slice(start, start + perRow);
        rows.push({
          kpi: true,
          height: tallest(group, 'compact'),
          charts: group.map((tile) => ({ id: tile.id, kpi: true, units: ROW_UNITS / group.length })),
        });
      }
      continue;
    }
    const row: { chart: LayoutChart; span: number }[] = [];
    let used = 0;
    while (index < charts.length && !isKpi(charts[index].chartType)) {
      const span = narrow ? columns : chartSpan(charts[index], columns);
      if (row.length > 0 && used + span > columns) break;
      row.push({ chart: charts[index], span });
      used += span;
      index += 1;
      if (used >= columns) break;
    }
    const units = row.map(({ span }) => Math.round((ROW_UNITS * span) / used));
    units[units.length - 1] += ROW_UNITS - units.reduce((sum, unit) => sum + unit, 0);
    // Flint banks a line's shape toward readable slopes, so a time series alone across the row
    // needs the taller row to spread over the width.
    const lone = tallRows && row.length === 1 && WIDE_TYPES.has(row[0].chart.chartType) && !row[0].chart.layout?.height;
    rows.push({
      kpi: false,
      height: lone ? 'tall' : tallest(row.map(({ chart: entry }) => entry), 'standard'),
      charts: row.map(({ chart: entry }, at) => ({ id: entry.id, kpi: false, units: units[at] })),
    });
  }
  return rows;
}

function tallest(charts: readonly LayoutChart[], fallback: ChartHeight): ChartHeight {
  return charts
    .map((chart) => chart.layout?.height ?? fallback)
    .reduce((best, height) => (HEIGHT_RANK[height] > HEIGHT_RANK[best] ? height : best), charts.length ? 'compact' : fallback);
}

const WIDTH_WORDS: Record<number, string> = { 12: 'full width', 9: 'three quarters', 8: 'two thirds', 6: 'half', 4: 'a third', 3: 'a quarter' };

/** The rows as the model reads them: `row 2 (standard): trend (two thirds), mix (a third)`. */
export function layoutLines(rows: readonly BoardRow[]): string[] {
  return rows.map((row, at) => {
    const cells = row.charts.map((chart) => `${chart.id} (${WIDTH_WORDS[chart.units] ?? `${chart.units}/12`})`).join(', ');
    return `- row ${at + 1}${row.kpi ? ', KPI tiles' : ''} (${row.height}): ${cells}`;
  });
}

export interface ColorChart {
  chart_spec: { encodings?: Record<string, unknown> };
  data: { values?: unknown[] };
}

/** The channels that pick a mark's colour: `group` does on a grouped bar chart. */
const COLOR_CHANNELS = ['color', 'group'] as const;

function fieldOf(encoding: unknown): string | undefined {
  if (typeof encoding === 'string') return encoding;
  if (encoding && typeof encoding === 'object' && !Array.isArray(encoding)) {
    const field = (encoding as { field?: unknown }).field;
    return typeof field === 'string' ? field : undefined;
  }
  return undefined;
}

function colorChannel(chart: ColorChart): (typeof COLOR_CHANNELS)[number] | undefined {
  return COLOR_CHANNELS.find((channel) => fieldOf(chart.chart_spec.encodings?.[channel]) !== undefined);
}

/** The field a chart colours by, when it is a single field. */
export function colorField(chart: ColorChart): string | undefined {
  const channel = colorChannel(chart);
  return channel ? fieldOf(chart.chart_spec.encodings?.[channel]) : undefined;
}

/**
 * The value order of each field two or more charts colour by: the order its values
 * first appear across the board's charts. Each chart that colours by the field takes
 * this order as its colour sort, so a value keeps one colour on every chart that
 * shows all the values.
 */
export function sharedColorOrders(charts: readonly ColorChart[]): Map<string, unknown[]> {
  const users = new Map<string, number>();
  for (const chart of charts) {
    const field = colorField(chart);
    if (field) users.set(field, (users.get(field) ?? 0) + 1);
  }
  const orders = new Map<string, unknown[]>();
  for (const [field, count] of users) {
    if (count < 2) continue;
    const seen = new Map<string, unknown>();
    for (const chart of charts) {
      if (colorField(chart) !== field) continue;
      for (const row of (chart.data.values ?? []) as Record<string, unknown>[]) {
        const value = row?.[field];
        if (value !== undefined && value !== null && !seen.has(String(value))) seen.set(String(value), value);
      }
    }
    // A measure on colour is a continuous scale, which keeps its own order.
    if ([...seen.values()].every((value) => typeof value === 'number')) continue;
    orders.set(field, [...seen.values()]);
  }
  return orders;
}

/** The chart with its colour channel in the board's order, unless the chart orders its colours itself. */
export function withColorOrder<T extends ColorChart>(chart: T, order: readonly unknown[]): T {
  const channel = colorChannel(chart);
  if (!channel) return chart;
  const value = chart.chart_spec.encodings?.[channel];
  const encoding = typeof value === 'string' ? { field: value } : (value as Record<string, unknown>);
  if (encoding.sortBy !== undefined || encoding.sortOrder !== undefined) return chart;
  return {
    ...chart,
    chart_spec: {
      ...chart.chart_spec,
      encodings: { ...chart.chart_spec.encodings, [channel]: { ...encoding, sortBy: JSON.stringify(order) } },
    },
  };
}

/** A chart's place on a board the reader arranged: columns of {@link ROW_UNITS}, rows of {@link GRID_ROW} px. */
export interface GridItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The height of one grid row, in pixels. */
export const GRID_ROW = 20;
/** The smallest a chart may be made: columns and rows. */
export const GRID_MIN = { w: 3, h: 9 };
/** The smallest a KPI tile may be made. */
export const GRID_MIN_TILE = { w: 2, h: 6 };

const overlaps = (a: GridItem, b: GridItem) =>
  a.id !== b.id && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const sharesRows = (a: GridItem, b: GridItem) => a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * The board after the reader changed one chart: a neighbour it grows into gives up that width when
 * it can keep its least, whatever still overlaps moves down, and every other chart floats up as far
 * as it can. No chart is widened on its own: the sizes the reader set stay, and room left beside a
 * chart stays open until the reader fills it.
 */
export function arrangeGrid(items: readonly GridItem[], activeId: string, minWidth: (id: string) => number): GridItem[] {
  const active = { ...items.find(({ id }) => id === activeId)! };
  const others = items.filter(({ id }) => id !== activeId).map((item) => ({ ...item }));
  for (const other of others) {
    if (!sharesRows(active, other) || !overlaps(active, other)) continue;
    if (other.x >= active.x + active.w / 2) {
      const right = other.x + other.w;
      const x = active.x + active.w;
      if (right - x >= minWidth(other.id)) { other.x = x; other.w = right - x; }
    } else if (other.x + other.w <= active.x + active.w / 2) {
      const width = active.x - other.x;
      if (width >= minWidth(other.id)) other.w = width;
    }
  }
  const placed: GridItem[] = [active];
  for (const item of others.sort((a, b) => a.y - b.y || a.x - b.x)) {
    let blocker = placed.find((entry) => overlaps(entry, item));
    while (blocker) {
      item.y = blocker.y + blocker.h;
      blocker = placed.find((entry) => overlaps(entry, item));
    }
    placed.push(item);
  }
  const settled: GridItem[] = [active];
  for (const item of placed.slice(1).sort((a, b) => a.y - b.y || a.x - b.x)) {
    for (let y = 0; y < item.y; y += 1) {
      if (!settled.some((entry) => overlaps(entry, { ...item, y }))) { item.y = y; break; }
    }
    settled.push(item);
  }
  return items.map(({ id }) => settled.find((entry) => entry.id === id)!);
}

/** The board with two charts trading places and sizes, the rest arranged around them. */
export function swapGrid(items: readonly GridItem[], a: string, b: string, minWidth: (id: string) => number): GridItem[] {
  const first = items.find(({ id }) => id === a);
  const second = items.find(({ id }) => id === b);
  if (!first || !second) return [...items];
  const swapped = items.map((item) => {
    if (item.id === a) return { ...second, id: a };
    if (item.id === b) return { ...first, id: b };
    return item;
  });
  return arrangeGrid(swapped, a, minWidth);
}

/** A new chart's place on an arranged board: below everything, across the full width or half of it. */
export function gridItemFor(items: readonly GridItem[], chart: LayoutChart): GridItem {
  const bottom = items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  const kpi = isKpi(chart.chartType);
  const w = kpi ? 3 : (chart.layout?.span ?? (WIDE_TYPES.has(chart.chartType) ? 2 : 1)) >= 2 ? ROW_UNITS : ROW_UNITS / 2;
  const h = kpi ? 8 : chart.layout?.height === 'tall' ? 24 : chart.layout?.height === 'compact' ? 10 : 17;
  return { id: chart.id, x: 0, y: bottom, w, h };
}

/** What is wrong with a grid for these charts, or undefined when it places each of them once on the board. */
export function gridProblem(items: readonly GridItem[], ids: readonly string[]): string | undefined {
  const placed = new Set(items.map((item) => item.id));
  if (placed.size !== items.length) return 'a chart is placed twice';
  const missing = ids.filter((id) => !placed.has(id));
  if (missing.length > 0) return `no place for ${missing.join(', ')}`;
  const unknown = items.filter((item) => !ids.includes(item.id)).map((item) => item.id);
  if (unknown.length > 0) return `no chart ${unknown.join(', ')} on the board`;
  const bad = items.find((item) => ![item.x, item.y, item.w, item.h].every(Number.isInteger)
    || item.x < 0 || item.y < 0 || item.w < 1 || item.h < 1 || item.x + item.w > ROW_UNITS);
  if (bad) return `${bad.id} lies outside the ${ROW_UNITS} columns`;
  const clash = items.find((item) => items.some((other) => overlaps(item, other)));
  return clash ? `${clash.id} overlaps another chart` : undefined;
}

/** The arranged board as the model reads it: `trend: columns 1–12, rows 1–17 (full width, 340px tall)`. */
export function gridLines(items: readonly GridItem[]): string[] {
  return [...items]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((item) => `- ${item.id}: columns ${item.x + 1}–${item.x + item.w}, rows ${item.y + 1}–${item.y + item.h} (${WIDTH_WORDS[item.w] ?? `${item.w}/12`}, ${item.h * GRID_ROW}px tall)`);
}
