// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { validateChart, type ChartAssemblyInput, type ChartUpdate, type ValidateResult } from 'flint-chart';

import { ROW_UNITS, boardColumns, boardRows, colorField, gridItemFor, gridLines, isKpi, layoutLines, sharedColorOrders, type ChartLayout, type GridItem } from './board-layout.js';

/** The characters of a chart title that fit on one line per row unit, at the card's heading size. */
const TITLE_CHARS_PER_UNIT = 7.5;
import { chartContext } from './chart-context.js';
import { toAssemblyInput, updatesShape, type AssemblyInputArgs } from './tools/schemas.js';

/** One chart on a board: the spec with its data inline, and the agent's update layers. */
export interface BoardChart {
  id: string;
  input: ChartAssemblyInput;
  updates?: ChartUpdate[];
  layout?: ChartLayout;
}

/** A selection on `from` emphasizes the marks of each `to` chart that share its `field` values. */
export interface BoardLink {
  from: string;
  to: string[];
  field: string;
}

export interface Board {
  id: string;
  /** The headline: what the board shows or is for. */
  title?: string;
  /** The deck: the data, its scope and period. */
  subtitle?: string;
  /** The footer: where the data comes from and when. */
  source?: string;
  /** The theme of every chart that does not set its own. */
  theme_spec?: ChartAssemblyInput['theme_spec'];
  /** Board columns; two once the board holds two charts that are not KPI tiles. */
  columns?: number;
  /** Where each chart sits once the reader arranged the board; the rows of `columns` and `layout` until then. */
  grid?: GridItem[];
  version: number;
  charts: BoardChart[];
  links: BoardLink[];
}

/** A chart spec as a tool argument: its id, the chart input, and its update layers. */
export type BoardChartArgs = AssemblyInputArgs & { id: string; updates?: ChartUpdate[]; layout?: ChartLayout };

/** The board fields create_board and update_board set. */
export type BoardFields = Pick<Board, 'title' | 'subtitle' | 'source' | 'theme_spec' | 'columns'>;

export const layoutShape = z
  .object({
    span: z.number().int().min(1).max(4).optional().describe('Board columns the chart spans. Default: the full row for time series, maps and Gantt charts, else one column.'),
    height: z.enum(['compact', 'standard', 'tall']).optional().describe('compact (~130px) for KPI tiles and sparklines, standard (~280px, the default), tall (~420px) for a lead chart, a map, or many categories. A row takes its tallest chart\'s height.'),
  })
  .describe('Where the chart sits on the board. KPI Cards that follow each other share a row of up to four.');

export function boardFieldsShape(themeShape: z.ZodTypeAny) {
  return {
    title: z.string().optional().describe('The headline: what the board shows or is for, in words, e.g. "Sales recovered in Q3, led by Europe". The card draws it largest; every board needs one.'),
    subtitle: z.string().optional().describe('The deck: the data, its scope and period, e.g. "Monthly revenue by region and product, Jan–Sep 2025, $m".'),
    source: z.string().optional().describe('The footer: where the data comes from and when, e.g. "Source: company ledger, as of 30 Sep 2025".'),
    theme_spec: themeShape.describe('The theme of every chart that does not set its own; the card takes its fonts and colours. Prefer setting it here, once, over per chart.'),
    columns: z.number().int().min(1).max(4).optional().describe('Board columns. Default: 2 once the board holds two charts that are not KPI tiles, else 1.'),
  };
}

type Validate = (input: ChartAssemblyInput, updates: ChartUpdate[] | undefined) => Promise<{ result: ValidateResult; input: ChartAssemblyInput }>;

export function boardChartShape(assemblyInputShape: Record<string, z.ZodTypeAny>) {
  return z.object({
    id: z.string().describe('Names the chart on the board; add_chart, update_chart, remove_chart and links use it.'),
    ...assemblyInputShape,
    updates: updatesShape.updates.describe(
      'ChartUpdate layers the chart shows: state, where interaction_spec is behaviour. update_chart replaces them.',
    ),
    layout: layoutShape.optional(),
  });
}

export const linksShape = z
  .array(
    z.object({
      from: z.string().describe('The chart a reader selects on; it needs an interaction that selects (select, brush-x, brush-y, click-highlight, click-group-focus, lasso-select).'),
      to: z.array(z.string()).describe('The charts that emphasize the matching marks.'),
      field: z.string().describe('The field the charts share; marks match on equal values. The source needs it in its data; each target must encode it on a channel (detail works when nothing else shows it).'),
    }),
  )
  .describe('Links between charts on the board: what a reader selects on one chart is emphasized on the others.');

/** The most boards a store keeps; creating one more drops the oldest. */
export const BOARD_LIMIT = 200;

export class BoardStore {
  private boards = new Map<string, Board>();

  create(fields: BoardFields): Board {
    const board: Board = { id: `board-${randomBytes(8).toString('hex')}`, ...fields, version: 1, charts: [], links: [] };
    this.boards.set(board.id, board);
    if (this.boards.size > BOARD_LIMIT) this.boards.delete(this.boards.keys().next().value!);
    return board;
  }

  get(id: string): Board {
    const board = this.boards.get(id);
    if (!board) {
      throw new Error(
        `No board "${id}" on this server; it may have restarted. Call create_board to open a new board card with the charts.`,
      );
    }
    return board;
  }

  touch(board: Board): void {
    board.version += 1;
  }
}

/** The outcome of one chart write: the chart drawn, or why it was not. */
export interface ChartOutcome {
  id: string;
  drawn: boolean;
  text: string;
}

/** The chart input as the card draws it: the board's theme where the chart sets none. */
export function withBoardTheme(input: ChartAssemblyInput, board: Pick<Board, 'theme_spec'>): ChartAssemblyInput {
  return input.theme_spec !== undefined || board.theme_spec === undefined ? input : { ...input, theme_spec: board.theme_spec };
}

export async function prepareChart(
  args: BoardChartArgs,
  validate: Validate,
  board: Pick<Board, 'theme_spec'>,
): Promise<{ chart?: BoardChart; outcome: ChartOutcome }> {
  const { id, updates, layout, ...rest } = args;
  const own = toAssemblyInput(rest as AssemblyInputArgs);
  const { result, input } = await validate(withBoardTheme(own, board), updates);
  if (!result.valid) {
    return { outcome: { id, drawn: false, text: `✗ not drawn: ${result.errors.map((e) => e.message).join('; ')}` } };
  }
  const report = chartContext({ agent: input, shown: input, updates, checks: result.updates, warnings: result.warnings }).text;
  // The board's theme stays the board's: a later update_board theme reaches every chart that set none.
  const stored = { ...input, theme_spec: own.theme_spec };
  return {
    chart: { id, input: stored, ...(updates ? { updates } : {}), ...(layout ? { layout } : {}) },
    outcome: { id, drawn: true, text: report },
  };
}

const SELECTING_PRESETS = new Set(['select', 'brush-x', 'brush-y', 'click-highlight', 'click-group-focus', 'lasso-select']);

function presetTypes(input: ChartAssemblyInput): string[] {
  const entries = (input.interaction_spec as { interactions?: readonly unknown[] } | undefined)?.interactions ?? [];
  return entries
    .map((entry) => (typeof entry === 'string' ? entry : (entry as { type?: unknown } | null)?.type))
    .filter((type): type is string => typeof type === 'string');
}

function sampleValue(chart: BoardChart, field: string): unknown {
  const rows = (chart.input.data.values ?? []) as Record<string, unknown>[];
  return rows.find((row) => row != null && row[field] !== undefined && row[field] !== null)?.[field];
}

/** Why the chart's marks cannot be emphasized by `field`, the way a link emphasizes them; undefined when they can. */
function linkTargetProblem(chart: BoardChart, field: string): string | undefined {
  const value = sampleValue(chart, field);
  if (value === undefined) return `"${chart.id}" has no field ${field} in its data.`;
  const probe: ChartUpdate = {
    id: 'link-probe',
    ops: [{ op: 'set-style', targets: [{ select: { key: { [field]: value } } }], value: { state: 'emphasized' } }],
  } as ChartUpdate;
  const op = validateChart(chart.input, 'vegalite', { updates: [probe] }).updates?.[0]?.ops[0];
  return op && !op.ok ? `"${chart.id}" cannot emphasize marks by ${field}: ${op.reason ?? 'the update does not apply'}` : undefined;
}

/** Each link as a line: ✓ when it can work on the board's charts, else ✗ and why. */
export function linkLines(board: Board): string[] {
  return board.links.map((link) => {
    const name = `${link.from} → ${link.to.join(', ')} on ${link.field}`;
    const from = board.charts.find((chart) => chart.id === link.from);
    if (!from) return `✗ ${name}: no chart "${link.from}" on the board.`;
    if (!presetTypes(from.input).some((type) => SELECTING_PRESETS.has(type))) {
      return `✗ ${name}: "${link.from}" has no interaction that selects marks; add one such as select or click-highlight to its interaction_spec.`;
    }
    if (sampleValue(from, link.field) === undefined) return `✗ ${name}: "${link.from}" has no field ${link.field} in its data.`;
    for (const id of link.to) {
      const chart = board.charts.find((entry) => entry.id === id);
      if (!chart) return `✗ ${name}: no chart "${id}" on the board.`;
      const problem = linkTargetProblem(chart, link.field);
      if (problem) return `✗ ${name}: ${problem}`;
    }
    return `✓ ${name}`;
  });
}

function layoutCharts(board: Board) {
  return board.charts.map((chart) => ({ id: chart.id, chartType: chart.input.chart_spec.chartType, layout: chart.layout }));
}

/** The board's layout as the card draws it on a wide card. */
export function boardLayoutLines(board: Board): string[] {
  if (board.grid) {
    return [
      'Arranged by the reader on a 12-column grid; keep it. Passing layout, columns or order sets the rows again and drops their arrangement.',
      ...gridLines(board.grid),
    ];
  }
  const charts = layoutCharts(board);
  return layoutLines(boardRows(charts, boardColumns(charts, board.columns)));
}

/** A chart added to an arranged board takes a place below the rest. */
export function placeAddedChart(board: Board, chart: BoardChart): void {
  if (!board.grid) return;
  board.grid = [...board.grid, gridItemFor(board.grid, { id: chart.id, chartType: chart.input.chart_spec.chartType, layout: chart.layout })];
}

/** Drops the reader's arrangement, and says so, when the agent sets the rows the board is laid out by. */
export function dropArrangement(board: Board, why: string): string | undefined {
  if (!board.grid) return undefined;
  board.grid = undefined;
  return `The reader's arrangement was dropped: ${why} sets the board's rows again.`;
}

/** What the board should still fix to read well; each note says the fix. */
export function boardReview(board: Board): string[] {
  const notes: string[] = [];
  if (!board.title) notes.push('No board title: set title to what the board shows or is for, in words (update_board).');
  if (board.title && board.title.length > 90) notes.push('The board title is long; keep it to one line and move the detail to subtitle.');
  if (!board.subtitle && board.charts.length > 0) notes.push('No subtitle: say the data, its scope, period and units (update_board).');
  const untitled = board.charts.filter((chart) => !isKpi(chart.input.chart_spec.chartType) && !chart.input.chart_spec.title).map((chart) => chart.id);
  if (untitled.length > 0) notes.push(`No title on ${untitled.join(', ')}: each cell's heading is its chart title; name what the chart shows (update_chart).`);
  const charts = layoutCharts(board);
  const units = new Map(boardRows(charts, boardColumns(charts, board.columns)).flatMap((row) => row.charts.map((cell) => [cell.id, cell.units] as const)));
  const long = board.charts.flatMap((chart) => {
    const title = chart.input.chart_spec.title;
    const limit = Math.round((units.get(chart.id) ?? ROW_UNITS) * TITLE_CHARS_PER_UNIT);
    return title && title.length > limit ? [`${chart.id} (${title.length} characters, about ${limit} fit)`] : [];
  });
  if (long.length > 0) notes.push(`Chart titles that wrap at their width: ${long.join(', ')}; shorten each to one line and move detail to its subtitle (update_chart).`);
  const kpis = board.charts.filter((chart) => isKpi(chart.input.chart_spec.chartType)).length;
  if (kpis > 6) notes.push(`${kpis} KPI tiles: keep the three to five numbers the reader acts on.`);
  if (board.charts.length - kpis > 8) notes.push(`${board.charts.length - kpis} charts: a board reads best with up to six; split it or remove the least used.`);
  const themes = new Set(board.charts.map((chart) => JSON.stringify(chart.input.theme_spec ?? null)).filter((theme) => theme !== 'null'));
  if (themes.size > 1 || (themes.size === 1 && board.theme_spec !== undefined)) {
    notes.push('Charts set their own themes; set theme_spec once on the board (update_board) and drop it from the charts so the board reads as one piece.');
  }
  for (const [field, values] of sharedColorOrders(board.charts.map((chart) => chart.input))) {
    const users = board.charts.filter((chart) => colorField(chart.input) === field).map((chart) => chart.id);
    notes.push(`${users.join(', ')} colour by ${field}; the card gives its ${values.length} values one order, so each keeps one colour across the board.`);
  }
  return notes;
}

/** The board as the model reads it after a write. */
export function boardReport(board: Board, outcomes: readonly ChartOutcome[], notes: readonly string[] = []): string {
  const lines = [
    `Board ${board.id}${board.title ? ` "${board.title}"` : ''}: ${board.charts.length} chart${board.charts.length === 1 ? '' : 's'} (${board.charts.map((chart) => chart.id).join(', ') || 'none'}).`,
    'The board card redraws from this board: change it with add_chart, update_chart, remove_chart and update_board, never a new create_board. What the reader does on it reaches you with their next message.',
  ];
  if (notes.length > 0) lines.push('', ...notes);
  if (board.charts.length > 0) lines.push('', 'Layout:', ...boardLayoutLines(board));
  for (const outcome of outcomes) {
    lines.push('', `## ${outcome.id}`, outcome.text);
  }
  const links = linkLines(board);
  if (links.length > 0) lines.push('', 'Links:', ...links);
  const review = boardReview(board);
  if (review.length > 0) lines.push('', 'Review:', ...review.map((note) => `- ${note}`));
  return lines.join('\n');
}

/** The board as the card reads it. */
export function boardSnapshot(board: Board): Board {
  return {
    ...board,
    charts: board.charts.map((chart) => ({ ...chart })),
    links: board.links.map((link) => ({ ...link })),
    ...(board.grid ? { grid: board.grid.map((item) => ({ ...item })) } : {}),
  };
}

/** The chart input fields update_chart may replace, by tool argument name. */
export const CHART_INPUT_KEYS = ['data', 'semantic_types', 'chart_spec', 'theme_spec', 'interaction_spec', 'options', 'field_display_names'] as const;

/** The chart args an update_chart call leaves: the chart's current input with the given fields replaced. */
export function mergeChartArgs(chart: BoardChart, patch: Partial<BoardChartArgs>): BoardChartArgs {
  const base = {
    id: chart.id,
    ...chart.input,
    ...(chart.updates ? { updates: chart.updates } : {}),
    ...(chart.layout ? { layout: chart.layout } : {}),
  } as unknown as BoardChartArgs;
  const next: Record<string, unknown> = { ...base };
  for (const key of CHART_INPUT_KEYS) {
    if (patch[key] !== undefined) next[key] = patch[key];
  }
  if (patch.updates !== undefined) next.updates = patch.updates;
  if (patch.layout !== undefined) next.layout = patch.layout;
  return next as BoardChartArgs;
}
