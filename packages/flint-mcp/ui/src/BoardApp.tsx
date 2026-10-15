// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Flint board MCP App: several charts in one live card.
 *
 * The card draws the board from its tool result, then reads the board again
 * through the app-only `read_board` tool, so the agent's add_chart and
 * update_chart calls redraw this card instead of opening new ones. Links turn a
 * reader's selection on one chart into an emphasis layer on the others, and the
 * card sends one model context that covers every chart.
 */
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { ChartAssemblyInput, ChartUpdate, ChartWarning, UpdateCheck } from 'flint-chart';
import { assembleVegaLite, resolveThemeSpec, validateChart } from 'flint-chart';
import type { ChartChange, ChartState, InteractiveChartSurface, SemanticElement } from 'flint-chart/interactive';
import { FlintChart } from 'flint-chart/react';
import { expressionInterpreter } from 'vega-interpreter';

import {
  CELL_GAP,
  GRID_MIN,
  GRID_MIN_TILE,
  GRID_ROW,
  HEIGHT_PX,
  ROW_UNITS,
  arrangeGrid,
  gridLines,
  swapGrid,
  type GridItem,
  boardColumns,
  boardRows,
  colorField,
  isKpi,
  sharedColorOrders,
  withColorOrder,
  type BoardRow,
  type ChartLayout,
} from '../../src/board-layout';
import { chartContext, type ChartGesture } from '../../src/chart-context';

declare const __FLINT_MCP_VERSION__: string;

interface BoardChart {
  id: string;
  input: ChartAssemblyInput;
  updates?: ChartUpdate[];
  layout?: ChartLayout;
}

interface BoardLink {
  from: string;
  to: string[];
  field: string;
}

interface Board {
  id: string;
  title?: string;
  subtitle?: string;
  source?: string;
  theme_spec?: ChartAssemblyInput['theme_spec'];
  columns?: number;
  grid?: GridItem[];
  version: number;
  charts: BoardChart[];
  links: BoardLink[];
}

const POLL_MS = 1500;
const MUTED_OPACITY = 0.2;
const LINK_PREFIX = 'linked-from-';
const NO_UPDATES: readonly ChartUpdate[] = [];
const NO_ELEMENTS: readonly SemanticElement[] = [];

function fieldValues(elements: readonly SemanticElement[], field: string): unknown[] {
  const values = new Map<string, unknown>();
  for (const element of elements) {
    const own = element.value?.[field];
    const found = own !== undefined ? [own] : (element.records ?? []).map((record) => record[field]);
    for (const value of found) {
      if (value !== undefined && value !== null) values.set(JSON.stringify(value), value);
    }
  }
  return [...values.values()];
}

/** A selected value as the data writes it: a time the chart read from a date string prints as that date. */
function valueText(value: unknown, chart: BoardChart | undefined, field: string): string {
  const sample = ((chart?.input.data.values ?? []) as Record<string, unknown>[]).find((row) => row?.[field] != null)?.[field];
  if (typeof value === 'number' && typeof sample === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, sample.length <= 7 ? 7 : 10);
  }
  return String(value);
}

function linkUpdate(link: BoardLink, values: readonly unknown[]): ChartUpdate {
  return {
    id: `${LINK_PREFIX}${link.from}:${link.field}`,
    ops: [{
      op: 'set-style',
      targets: values.map((value) => ({ select: { key: { [link.field]: value } } })),
      value: { state: 'emphasized', mutedOpacity: MUTED_OPACITY },
    }],
  } as ChartUpdate;
}

/** The marks a reader's own gestures retain: neither the agent's layers nor what other charts link in. */
function readerElements(state: ChartState, chart: BoardChart | undefined): readonly SemanticElement[] {
  const agentIds = new Set((chart?.updates ?? []).map((update) => update.id));
  const elements = [...(state.entries ?? [])]
    .filter(([id, entry]) => entry.layer === 'retained' && !agentIds.has(id) && !id.startsWith(LINK_PREFIX))
    .flatMap(([, entry]) => entry.elements);
  return elements.length > 0 ? elements : NO_ELEMENTS;
}

/** The state without the layers other charts link in, which the board's link lines report instead. */
function withoutLinkLayers(state: ChartState): ChartState {
  if (![...(state.entries?.keys() ?? [])].some((id) => id.startsWith(LINK_PREFIX))) return state;
  return { ...state, entries: new Map([...(state.entries ?? [])].filter(([id]) => !id.startsWith(LINK_PREFIX))) };
}

const checksCache = new WeakMap<BoardChart, readonly UpdateCheck[] | undefined>();

/** What each agent update does on the chart, as the single-chart view reports it. */
function checksOf(chart: BoardChart): readonly UpdateCheck[] | undefined {
  if (!checksCache.has(chart)) {
    checksCache.set(chart, chart.updates?.length ? validateChart(chart.input, 'vegalite', { updates: chart.updates }).updates : undefined);
  }
  return checksCache.get(chart);
}

/** A branding mark of the theme, drawn once on the board's frame instead of in every cell. */
interface Furniture {
  kind: string;
  color?: string;
  width?: number;
  height?: number;
}

/** The fonts and colours of the board's frame, read from the theme its charts draw in. */
interface BoardStyle {
  background: string;
  ink: string;
  muted: string;
  font: string;
  titleFont: string;
  furniture: Furniture[];
}

const DEFAULT_STYLE: BoardStyle = {
  background: '#ffffff',
  ink: '#1a1a1a',
  muted: '#6b6b6b',
  font: 'Arial, Roboto, "Helvetica Neue", sans-serif',
  titleFont: 'Arial, Roboto, "Helvetica Neue", sans-serif',
  furniture: [],
};

function boardStyle(theme: ChartAssemblyInput['theme_spec']): BoardStyle {
  if (theme === undefined) return DEFAULT_STYLE;
  try {
    const spec = assembleVegaLite({
      data: { values: [{ a: 'a', b: 1 }] },
      theme_spec: theme,
      chart_spec: { chartType: 'Bar Chart', title: 't', subtitle: 's', encodings: { x: { field: 'a' }, y: { field: 'b' } } },
    } as ChartAssemblyInput) as { background?: unknown; config?: { font?: string; title?: Record<string, unknown> } };
    const title = spec.config?.title ?? {};
    let furniture: Furniture[] = [];
    try {
      furniture = (resolveThemeSpec(theme as Parameters<typeof resolveThemeSpec>[0]) as { furniture?: Furniture[] } | undefined)?.furniture ?? [];
    } catch {
      furniture = [];
    }
    return {
      furniture,
      background: typeof spec.background === 'string' ? spec.background : DEFAULT_STYLE.background,
      ink: typeof title.color === 'string' ? title.color : DEFAULT_STYLE.ink,
      muted: typeof title.subtitleColor === 'string' ? title.subtitleColor : DEFAULT_STYLE.muted,
      font: spec.config?.font ?? DEFAULT_STYLE.font,
      titleFont: typeof title.font === 'string' ? title.font : spec.config?.font ?? DEFAULT_STYLE.titleFont,
    };
  } catch {
    return DEFAULT_STYLE;
  }
}

/** The theme without its branding marks, which the board draws once on its frame. */
function withoutFurniture(theme: ChartAssemblyInput['theme_spec']): ChartAssemblyInput['theme_spec'] {
  if (theme === undefined) return theme;
  return (typeof theme === 'string' ? { extends: theme, furniture: [] } : { ...theme, furniture: [] }) as ChartAssemblyInput['theme_spec'];
}

/** The widest a KPI tile is planned, so a tile alone in a wide cell stays a tile. */
const MAX_TILE_WIDTH = 320;

/** The chart as a cell draws it: its heading taken out to the cell, sized to the cell's room. */
function cellSpec(input: ChartAssemblyInput, width: number, height: number): ChartAssemblyInput {
  const { title: _title, subtitle: _subtitle, ...chartSpec } = input.chart_spec;
  const size = { width: isKpi(input.chart_spec.chartType) ? Math.min(width, MAX_TILE_WIDTH) : width, height };
  return {
    ...input,
    theme_spec: withoutFurniture(input.theme_spec),
    chart_spec: {
      ...chartSpec,
      ...(input.chart_spec.baseSize ? {} : { baseSize: size, canvasSize: size }),
    },
    options: { ...input.options, bandStepFit: input.options?.bandStepFit ?? 1 },
  };
}

/** The width inside an element's padding, floored to 8px steps so small jitter does not redraw the chart. */
function useWidth<T extends HTMLElement>(): [(node: T | null) => void, number | null] {
  const [width, setWidth] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const read = () => {
      const style = getComputedStyle(node);
      const inner = node.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
      const next = Math.floor(inner / 8) * 8;
      if (next > 0) setWidth((prev) => (prev === next ? prev : next));
    };
    read();
    observer.current = new ResizeObserver(read);
    observer.current.observe(node);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, width];
}

/** What a chart's first plan drew past its room, for the input and room it was planned for. */
interface Fit {
  input: ChartAssemblyInput;
  width: number;
  height: number;
  over: { width: number; height: number };
}

/** The smallest room a cell plans a chart into, however far its first plan overshot. */
const MIN_PLAN_WIDTH = 160;
const MIN_PLAN_HEIGHT = 120;

function BoardCell({
  chart,
  input,
  units,
  height,
  kpi,
  updates,
  onRender,
  onChange,
  onWarnings,
}: {
  chart: BoardChart;
  input: ChartAssemblyInput;
  units: number;
  height: number;
  kpi: boolean;
  updates: readonly ChartUpdate[];
  onRender: (id: string, surface: InteractiveChartSurface) => void;
  onChange: (id: string, change: ChartChange) => void;
  onWarnings: (id: string, warnings: readonly ChartWarning[]) => void;
}) {
  const [measure, width] = useWidth<HTMLDivElement>();
  const [fit, setFit] = useState<Fit | null>(null);
  const current = fit && fit.input === input && fit.width === width && fit.height === height ? fit : null;
  const spec = useMemo(
    () => (width ? cellSpec(input, Math.max(MIN_PLAN_WIDTH, width - (current?.over.width ?? 0)), Math.max(MIN_PLAN_HEIGHT, height - (current?.over.height ?? 0))) : null),
    [input, width, height, current?.over.width, current?.over.height],
  );
  const settled = current !== null;
  const handleRender = useCallback((surface: InteractiveChartSurface) => {
    if (!width) return;
    if (!current) {
      // The plan sizes the plot; what the chart draws around it comes on top. Plan once more with
      // the room less what the first plan overshot; a chart still over is scaled down after that.
      const svg = surface.element.querySelector('svg');
      const drawn = { width: Number(svg?.getAttribute('width')) || 0, height: Number(svg?.getAttribute('height')) || 0 };
      const over = { width: Math.max(0, Math.ceil(drawn.width - width)), height: Math.max(0, Math.ceil(drawn.height - height)) };
      setFit({ input, width, height, over: over.width > 1 || over.height > 1 ? over : { width: 0, height: 0 } });
      if (over.width > 1 || over.height > 1) return;
    }
    onRender(chart.id, surface);
  }, [chart.id, onRender, current, input, width, height]);
  const handleChange = useCallback((change: ChartChange) => onChange(chart.id, change), [chart.id, onChange]);
  const handleWarnings = useCallback((warnings: readonly ChartWarning[]) => onWarnings(chart.id, warnings), [chart.id, onWarnings]);
  const { title, subtitle } = input.chart_spec;
  return (
    <section
      className={kpi ? 'board-cell board-cell-kpi' : 'board-cell'}
      data-chart-id={chart.id}
      style={{ gridColumn: `span ${units}` }}
    >
      <header className="board-cell-header">
        {title && <h2 className="board-cell-title">{title}</h2>}
        {subtitle && <p className="board-cell-subtitle">{subtitle}</p>}
      </header>
      <div className="board-cell-chart" ref={measure} style={{ minHeight: height, visibility: settled ? undefined : 'hidden' }}>
        {spec && (
          <FlintChart
            className="chart-interactive"
            spec={spec}
            updates={updates}
            renderer="svg"
            expressionInterpreter={expressionInterpreter}
            chartId={`flint-board-${chart.id}`}
            width="100%"
            fit="scale-down"
            fallback={<span className="chart-pending">Rendering…</span>}
            onRender={handleRender}
            onChange={handleChange}
            onWarnings={handleWarnings}
          />
        )}
      </div>
    </section>
  );
}

/** Each chart's input as the board draws it: the board's theme where it sets none, and shared colours in one order. */
function useDrawInputs(charts: readonly BoardChart[], theme: ChartAssemblyInput['theme_spec']): Map<string, ChartAssemblyInput> {
  const cache = useRef(new Map<string, { chart: BoardChart; key: string; input: ChartAssemblyInput }>());
  return useMemo(() => {
    const themed = charts.map((chart) => ({
      chart,
      input: chart.input.theme_spec !== undefined || theme === undefined ? chart.input : { ...chart.input, theme_spec: theme },
    }));
    const orders = sharedColorOrders(themed.map(({ input }) => input));
    const next = new Map<string, { chart: BoardChart; key: string; input: ChartAssemblyInput }>();
    for (const { chart, input } of themed) {
      const field = colorField(input);
      const order = field ? orders.get(field) : undefined;
      const key = JSON.stringify([input.theme_spec ?? null, order ?? null]);
      const kept = cache.current.get(chart.id);
      if (kept && kept.chart === chart && kept.key === key) {
        next.set(chart.id, kept);
        continue;
      }
      const drawn: ChartAssemblyInput = field && order ? withColorOrder(input, order) : input;
      next.set(chart.id, { chart, key, input: drawn });
    }
    cache.current = next;
    return new Map([...next].map(([id, entry]) => [id, entry.input]));
  }, [charts, theme]);
}

/** The space between arranged charts, below each one. */
const GRID_ROW_GAP = 16;
/** A tile's height besides its heading and chart: the rule and padding above, the gap under the heading. */
const TILE_CHROME = 19;

/** The height of an element, read as it changes; null until the element is first measured. */
function useHeight<T extends HTMLElement>(): [(node: T | null) => void, number | null] {
  const [height, setHeight] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const read = () => setHeight((prev) => (prev === node.offsetHeight ? prev : node.offsetHeight));
    read();
    observer.current = new ResizeObserver(read);
    observer.current.observe(node);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, height];
}

type GridGesture = 'move' | 'right' | 'bottom' | 'corner';

/**
 * A chart at its place on an arranged board. While the reader drags, the chart plans again for its
 * box as it changes, in place; once the box settles, it is laid out from that size.
 */
function GridTile({
  chart,
  input,
  box,
  settled,
  kpi,
  editing,
  active,
  updates,
  onGesture,
  onRender,
  onChange,
  onWarnings,
}: {
  chart: BoardChart;
  input: ChartAssemblyInput;
  box: { left: number; top: number; width: number; height: number };
  settled: { width: number; height: number };
  kpi: boolean;
  editing: boolean;
  active: boolean;
  updates: readonly ChartUpdate[];
  onGesture: (kind: GridGesture, id: string, event: ReactPointerEvent<HTMLElement>) => void;
  onRender: (id: string, surface: InteractiveChartSurface) => void;
  onChange: (id: string, change: ChartChange) => void;
  onWarnings: (id: string, warnings: readonly ChartWarning[]) => void;
}) {
  const [measureHeader, measuredHeader] = useHeight<HTMLElement>();
  const headerHeight = measuredHeader ?? 0;
  const chartHeight = Math.max(60, box.height - headerHeight - TILE_CHROME);
  const settledHeight = Math.max(60, settled.height - headerHeight - TILE_CHROME);
  const [fit, setFit] = useState<Fit | null>(null);
  const current = fit && fit.input === input && fit.width === settled.width && fit.height === settledHeight ? fit : null;
  const spec = useMemo(
    () => cellSpec(input, Math.max(MIN_PLAN_WIDTH, settled.width - (current?.over.width ?? 0)), Math.max(MIN_PLAN_HEIGHT, settledHeight - (current?.over.height ?? 0))),
    [input, settled.width, settledHeight, current?.over.width, current?.over.height],
  );
  const dragging = box.width !== settled.width || box.height !== settled.height;
  const handleRender = useCallback((surface: InteractiveChartSurface) => {
    if (!current && !dragging) {
      // As in a row cell: a chart drawn past its box is planned once more with that much less room.
      const svg = surface.element.querySelector('svg');
      const drawn = { width: Number(svg?.getAttribute('width')) || 0, height: Number(svg?.getAttribute('height')) || 0 };
      const over = { width: Math.max(0, Math.ceil(drawn.width - settled.width)), height: Math.max(0, Math.ceil(drawn.height - settledHeight)) };
      setFit({ input, width: settled.width, height: settledHeight, over: over.width > 1 || over.height > 1 ? over : { width: 0, height: 0 } });
    }
    onRender(chart.id, surface);
  }, [chart.id, onRender, current, dragging, input, settled.width, settledHeight]);
  const handleChange = useCallback((change: ChartChange) => onChange(chart.id, change), [chart.id, onChange]);
  const handleWarnings = useCallback((warnings: readonly ChartWarning[]) => onWarnings(chart.id, warnings), [chart.id, onWarnings]);
  const { title, subtitle } = input.chart_spec;
  const handle = (kind: GridGesture) => ({ onPointerDown: (event: ReactPointerEvent<HTMLElement>) => onGesture(kind, chart.id, event) });
  return (
    <section
      className={['board-tile', kpi ? 'board-cell-kpi' : '', active ? 'board-tile-active' : ''].filter(Boolean).join(' ')}
      data-chart-id={chart.id}
      style={box}
    >
      <header className="board-cell-header board-tile-header" ref={measureHeader} {...(editing ? handle('move') : {})}>
        {title && <h2 className="board-cell-title">{title}</h2>}
        {subtitle && <p className="board-cell-subtitle">{subtitle}</p>}
        {editing && !title && !subtitle && <span className="board-tile-grip">{chart.id}</span>}
      </header>
      <div className="board-cell-chart board-tile-chart">
        {measuredHeader !== null && (
          <FlintChart
            className="chart-interactive"
            spec={spec}
            updates={updates}
            renderer="svg"
            expressionInterpreter={expressionInterpreter}
            chartId={`flint-board-${chart.id}`}
            width={box.width}
            height={chartHeight}
            fit="relayout"
            fallback={<span className="chart-pending">Rendering…</span>}
            onRender={handleRender}
            onChange={handleChange}
            onWarnings={handleWarnings}
          />
        )}
      </div>
      {editing && (
        <>
          <div className="board-tile-edge board-tile-edge-right" aria-label={`Resize ${chart.id} width`} {...handle('right')} />
          <div className="board-tile-edge board-tile-edge-bottom" aria-label={`Resize ${chart.id} height`} {...handle('bottom')} />
          <div className="board-tile-corner" aria-label={`Resize ${chart.id}`} {...handle('corner')} />
        </>
      )}
    </section>
  );
}

/** Keeps each chart object while its content is unchanged, so a poll redraws only the charts that moved. */
function useStableCharts(board: Board): BoardChart[] {
  const cache = useRef(new Map<string, { key: string; chart: BoardChart }>());
  return useMemo(() => {
    const next = new Map<string, { key: string; chart: BoardChart }>();
    const charts = board.charts.map((chart) => {
      const key = JSON.stringify(chart);
      const kept = cache.current.get(chart.id);
      const entry = kept && kept.key === key ? kept : { key, chart };
      next.set(chart.id, entry);
      return entry.chart;
    });
    cache.current = next;
    return charts;
  }, [board]);
}

function BoardView({ app, initial, hostContext }: { app: App; initial: Board; hostContext?: McpUiHostContext }) {
  const [board, setBoard] = useState(initial);
  const [live, setLive] = useState(true);
  // The reader's own selected marks on each chart that is the source of a link.
  const [selections, setSelections] = useState<ReadonlyMap<string, readonly SemanticElement[]>>(new Map());
  const charts = useStableCharts(board);
  const states = useRef(new Map<string, ChartState>());
  const warnings = useRef(new Map<string, readonly ChartWarning[]>());
  const gestures = useRef(new Map<string, Map<string, ChartGesture>>());
  const lastContext = useRef<string | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;
  const chartsRef = useRef(charts);
  chartsRef.current = charts;
  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;
  // While the reader arranges the board, the draft is what the card shows; polls wait until they are done.
  const [draft, setDraft] = useState<GridItem[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const editingRef = useRef(false);
  editingRef.current = draft !== null;

  useEffect(() => setBoard(initial), [initial]);

  // The card reads the board again while it is on screen; a failed read leaves the last board drawn.
  useEffect(() => {
    if (!app.getHostCapabilities()?.serverTools) {
      setLive(false);
      return;
    }
    let stopped = false;
    const poll = async () => {
      if (stopped || editingRef.current || document.visibilityState !== 'visible') return;
      try {
        const result = await app.callServerTool({
          name: 'read_board',
          arguments: { board_id: boardRef.current.id, version: boardRef.current.version },
        });
        if (stopped || editingRef.current) return;
        if (result.isError) {
          setLive(false);
          return;
        }
        setLive(true);
        const next = (result.structuredContent as { board?: Board } | undefined)?.board;
        if (next) setBoard(next);
      } catch {
        if (!stopped) setLive(false);
      }
    };
    const handle = window.setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(handle);
    };
  }, [app]);

  const setSelection = useCallback((id: string, elements: readonly SemanticElement[]) => {
    setSelections((prev) => {
      const had = prev.get(id) ?? NO_ELEMENTS;
      if (had === elements || (had.length === 0 && elements.length === 0)) return prev;
      const next = new Map(prev);
      if (elements.length > 0) next.set(id, elements);
      else next.delete(id);
      return next;
    });
  }, []);

  const updatesById = useMemo(() => {
    const result = new Map<string, readonly ChartUpdate[]>();
    for (const chart of charts) {
      const layers: ChartUpdate[] = [...(chart.updates ?? [])];
      for (const link of board.links) {
        if (!link.to.includes(chart.id) || link.from === chart.id) continue;
        const values = fieldValues(selections.get(link.from) ?? NO_ELEMENTS, link.field);
        if (values.length > 0) layers.push(linkUpdate(link, values));
      }
      result.set(chart.id, layers.length > 0 ? layers : NO_UPDATES);
    }
    return result;
  }, [charts, board.links, selections]);

  const sendContext = useCallback(() => {
    const current = boardRef.current;
    const lines = [
      `Board ${current.id}${current.title ? ` "${current.title}"` : ''}: ${current.charts.length} charts, as the reader sees them now. Change it with add_chart, update_chart, remove_chart and update_board.`,
    ];
    for (const chart of chartsRef.current) {
      const state = states.current.get(chart.id);
      const input = chart.input.theme_spec !== undefined || current.theme_spec === undefined
        ? chart.input
        : { ...chart.input, theme_spec: current.theme_spec };
      const text = chartContext({
        state: state && withoutLinkLayers(state),
        agent: input,
        shown: input,
        updates: chart.updates,
        checks: checksOf(chart),
        warnings: warnings.current.get(chart.id),
        drawnUpdates: chart.updates,
        gestures: gestures.current.get(chart.id),
      }).text;
      lines.push('', `## ${chart.id}`, text);
    }
    const linkLines = current.links.map((link) => {
      const values = fieldValues(selectionsRef.current.get(link.from) ?? NO_ELEMENTS, link.field);
      const named = values.map((value) => valueText(value, current.charts.find((chart) => chart.id === link.from), link.field));
      const shown = values.length > 0
        ? `the reader's selection on ${link.from} (${link.field} ${named.slice(0, 8).join(', ')}${values.length > 8 ? `, and ${values.length - 8} more` : ''}) is emphasized on ${link.to.join(', ')}`
        : 'no selection';
      return `- ${link.from} → ${link.to.join(', ')} on ${link.field}: ${shown}.`;
    });
    if (linkLines.length > 0) lines.push('', 'Links:', ...linkLines);
    if (current.grid) lines.push('', 'Layout, as the reader arranged it on a 12-column grid:', ...gridLines(current.grid));
    const text = lines.join('\n');
    if (text === lastContext.current) return;
    lastContext.current = text;
    void app.updateModelContext({ content: [{ type: 'text', text }] })
      .catch((err) => console.warn('The host declined the board context', err));
  }, [app]);
  useEffect(() => sendContext(), [board, charts, selections, sendContext]);

  const handleRender = useCallback((id: string, surface: InteractiveChartSurface) => {
    const state = surface.getState();
    if (state) {
      states.current.set(id, state);
      // A redrawn source keeps only the selection its new surface holds.
      if (boardRef.current.links.some((link) => link.from === id)) {
        setSelection(id, readerElements(state, chartsRef.current.find((chart) => chart.id === id)));
      }
    }
    sendContext();
  }, [sendContext, setSelection]);

  const handleWarnings = useCallback((id: string, next: readonly ChartWarning[]) => {
    warnings.current.set(id, next);
  }, []);

  const handleChange = useCallback((id: string, change: ChartChange) => {
    if (change.phase !== 'commit') return;
    states.current.set(id, change.state);
    if (change.source === 'host') {
      sendContext();
      return;
    }
    if (change.interactionId) {
      let byChart = gestures.current.get(id);
      if (!byChart) gestures.current.set(id, (byChart = new Map()));
      byChart.set(change.interactionId, { action: change.action, geometry: change.geometry });
    }
    if (boardRef.current.links.some((link) => link.from === id)) {
      setSelection(id, readerElements(change.state, chartsRef.current.find((chart) => chart.id === id)));
    }
    sendContext();
  }, [sendContext, setSelection]);

  const [measureBoard, boardWidth] = useWidth<HTMLElement>();
  const rows: BoardRow[] = useMemo(() => {
    const layoutCharts = charts.map((chart) => ({ id: chart.id, chartType: chart.input.chart_spec.chartType, layout: chart.layout }));
    return boardRows(layoutCharts, boardColumns(layoutCharts, board.columns), boardWidth ?? undefined);
  }, [charts, board.columns, boardWidth]);
  const drawInputs = useDrawInputs(charts, board.theme_spec);
  const style = useMemo(() => boardStyle(board.theme_spec), [board.theme_spec]);
  // The page behind the board takes its paper, so a dark theme has no light edge.
  useEffect(() => {
    document.documentElement.style.background = style.background;
    document.body.style.background = style.background;
  }, [style.background]);
  // The card is sized to the board, so the page never scrolls. A scrollbar would appear while the host
  // catches up with a new height, narrow the board, lay every chart out again, and change the height again.
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }, []);
  const byId = useMemo(() => new Map(charts.map((chart) => [chart.id, chart])), [charts]);

  const grid = draft ?? board.grid;
  const flowRef = useRef<HTMLDivElement | null>(null);
  const colWidth = boardWidth ? (boardWidth - (ROW_UNITS - 1) * CELL_GAP) / ROW_UNITS : 0;
  const boxOf = useCallback((item: GridItem) => ({
    left: Math.round(item.x * (colWidth + CELL_GAP)),
    top: item.y * GRID_ROW,
    width: Math.round(item.w * colWidth + (item.w - 1) * CELL_GAP),
    height: item.h * GRID_ROW - GRID_ROW_GAP,
  }), [colWidth]);
  const minWidth = useCallback((id: string) => {
    const chart = chartsRef.current.find((entry) => entry.id === id);
    return chart && isKpi(chart.input.chart_spec.chartType) ? GRID_MIN_TILE.w : GRID_MIN.w;
  }, []);
  const minHeight = useCallback((id: string) => {
    const chart = chartsRef.current.find((entry) => entry.id === id);
    return chart && isKpi(chart.input.chart_spec.chartType) ? GRID_MIN_TILE.h : GRID_MIN.h;
  }, []);

  /** The board's rows as places on the grid, read off the cells as they are drawn. */
  const gridFromRows = useCallback((): GridItem[] => {
    const container = flowRef.current;
    if (!container) return [];
    const origin = container.getBoundingClientRect().top;
    const items: GridItem[] = [];
    let y = 0;
    for (const row of rows) {
      let x = 0;
      let rowHeight = 0;
      for (const cell of row.charts) {
        const node = container.querySelector<HTMLElement>(`.board-cell[data-chart-id="${CSS.escape(cell.id)}"]`);
        const rect = node?.getBoundingClientRect();
        const h = rect ? Math.max(minHeight(cell.id), Math.round((rect.bottom - Math.max(origin, rect.top) + GRID_ROW_GAP) / GRID_ROW)) : 17;
        items.push({ id: cell.id, x, y, w: cell.units, h });
        x += cell.units;
        rowHeight = Math.max(rowHeight, h);
      }
      for (const item of items.slice(items.length - row.charts.length)) item.h = rowHeight;
      y += rowHeight;
    }
    return items;
  }, [rows, minHeight]);

  const startEditing = useCallback(() => {
    setNotice(null);
    setDraft(board.grid ? board.grid.map((item) => ({ ...item })) : gridFromRows());
  }, [board.grid, gridFromRows]);

  const save = useCallback(async (next: GridItem[] | null) => {
    const current = boardRef.current;
    try {
      const result = await app.callServerTool({
        name: 'set_board_layout',
        arguments: { board_id: current.id, version: current.version, grid: next },
      });
      const saved = (result.structuredContent as { board?: Board } | undefined)?.board;
      if (result.isError || !saved) {
        setNotice('The board changed while you arranged it, so your arrangement was not kept.');
      } else {
        setBoard(saved);
      }
    } catch {
      setNotice('The arrangement could not be saved.');
    }
    setDraft(null);
  }, [app]);

  const gesture = useRef<{ kind: GridGesture; id: string; x: number; y: number; start: GridItem[] } | null>(null);
  const onGesture = useCallback((kind: GridGesture, id: string, event: ReactPointerEvent<HTMLElement>) => {
    if (!draft) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    gesture.current = { kind, id, x: event.clientX, y: event.clientY, start: draft };
    setActiveId(id);
  }, [draft]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active || !colWidth) return;
    const dx = Math.round((event.clientX - active.x) / (colWidth + CELL_GAP));
    const dy = Math.round((event.clientY - active.y) / GRID_ROW);
    const start = active.start.find(({ id }) => id === active.id)!;
    if (active.kind === 'move') {
      // Over another chart, the two trade places; over open board, the chart moves there.
      const origin = gridRef.current?.getBoundingClientRect();
      const over = origin && active.start.find((item) => {
        if (item.id === active.id) return false;
        const box = boxOf(item);
        const px = event.clientX - origin.left;
        const py = event.clientY - origin.top;
        return px >= box.left && px <= box.left + box.width && py >= box.top && py <= box.top + box.height;
      });
      if (over) {
        setDraft(swapGrid(active.start, active.id, over.id, minWidth));
        return;
      }
      const moved = { ...start, x: Math.min(ROW_UNITS - start.w, Math.max(0, start.x + dx)), y: Math.max(0, start.y + dy) };
      setDraft(arrangeGrid(active.start.map((item) => (item.id === active.id ? moved : item)), active.id, minWidth));
      return;
    }
    const next = { ...start };
    if (active.kind === 'right' || active.kind === 'corner') next.w = Math.min(ROW_UNITS - next.x, Math.max(minWidth(next.id), start.w + dx));
    if (active.kind === 'bottom' || active.kind === 'corner') next.h = Math.max(minHeight(next.id), start.h + dy);
    setDraft(arrangeGrid(active.start.map((item) => (item.id === active.id ? next : item)), active.id, minWidth));
  }, [colWidth, boxOf, minWidth, minHeight]);
  const onPointerUp = useCallback(() => {
    gesture.current = null;
    setActiveId(null);
  }, []);

  // A chart's settled box is its box when no drag is under way; a drag re-plans it in place.
  const settledBoxes = useRef(new Map<string, { width: number; height: number }>());
  const settledOf = (item: GridItem) => {
    const box = boxOf(item);
    if (activeId === null || !settledBoxes.current.has(item.id)) settledBoxes.current.set(item.id, { width: box.width, height: box.height });
    return settledBoxes.current.get(item.id)!;
  };

  const editing = draft !== null;
  const gridHeight = grid ? Math.max(...grid.map((item) => item.y + item.h), 0) * GRID_ROW : 0;

  return (
    <main
      className={editing ? 'board board-editing' : 'board'}
      ref={measureBoard}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        '--board-bg': style.background,
        '--board-ink': style.ink,
        '--board-muted': style.muted,
        '--board-font': style.font,
        '--board-title-font': style.titleFont,
        paddingTop: hostContext?.safeAreaInsets?.top,
        paddingRight: hostContext?.safeAreaInsets?.right,
        paddingBottom: hostContext?.safeAreaInsets?.bottom,
        paddingLeft: hostContext?.safeAreaInsets?.left,
      } as CSSProperties}
    >
      <header className={style.furniture.some((mark) => mark.kind === 'headerRule') ? 'board-header board-header-ruled' : 'board-header'}>
        {style.furniture.filter((mark) => mark.kind === 'mastheadTab').map((mark, at) => (
          <span
            key={at}
            className="board-tab"
            style={{ background: mark.color, width: mark.width ?? 44, height: mark.height ?? 12 }}
          />
        ))}
        <div className="board-heading">
          <div className="board-heading-text">
            {board.title && <h1 className="board-title">{board.title}</h1>}
            {board.subtitle && <p className="board-subtitle">{board.subtitle}</p>}
          </div>
          {charts.length > 0 && (
            <div className="board-tools" role="group" aria-label="Arrange the board">
              {editing ? (
                <>
                  {board.grid && <button type="button" className="board-tool" onClick={() => void save(null)}>Reset</button>}
                  <button type="button" className="board-tool" onClick={() => setDraft(null)}>Cancel</button>
                  <button type="button" className="board-tool board-tool-primary" onClick={() => void save(draft)}>Done</button>
                </>
              ) : (
                <button type="button" className="board-tool" onClick={startEditing}>Edit layout</button>
              )}
            </div>
          )}
        </div>
        {editing && <p className="board-hint">Drag a chart by its heading to move it, or onto another chart to swap them. Drag an edge or corner to resize.</p>}
        {notice && <p className="board-status">{notice}</p>}
        {!live && <p className="board-status">Not live: showing the board as it was drawn.</p>}
      </header>
      {charts.length === 0 ? (
        <div className="board-empty">No charts on this board yet.</div>
      ) : grid && colWidth > 0 ? (
        <div className="board-grid" ref={gridRef} style={{ height: gridHeight }}>
          {grid.map((item) => {
            const chart = byId.get(item.id);
            const input = drawInputs.get(item.id);
            if (!chart || !input) return null;
            return (
              <GridTile
                key={item.id}
                chart={chart}
                input={input}
                box={boxOf(item)}
                settled={settledOf(item)}
                kpi={isKpi(chart.input.chart_spec.chartType)}
                editing={editing}
                active={activeId === item.id}
                updates={updatesById.get(item.id) ?? NO_UPDATES}
                onGesture={onGesture}
                onRender={handleRender}
                onChange={handleChange}
                onWarnings={handleWarnings}
              />
            );
          })}
        </div>
      ) : (
        <div className="board-flow" ref={flowRef}>
          {rows.map((row, at) => (
            <div key={row.charts.map((cell) => cell.id).join('|') || at} className={row.kpi ? 'board-row board-row-kpi' : 'board-row'} style={{ gridTemplateColumns: `repeat(${ROW_UNITS}, minmax(0, 1fr))` }}>
              {row.charts.map((cell) => {
                const chart = byId.get(cell.id);
                const input = drawInputs.get(cell.id);
                if (!chart || !input) return null;
                return (
                  <BoardCell
                    key={cell.id}
                    chart={chart}
                    input={input}
                    units={cell.units}
                    height={HEIGHT_PX[row.height]}
                    kpi={cell.kpi}
                    updates={updatesById.get(cell.id) ?? NO_UPDATES}
                    onRender={handleRender}
                    onChange={handleChange}
                    onWarnings={handleWarnings}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
      {board.source && <footer className="board-source">{board.source}</footer>}
    </main>
  );
}

export function BoardApp() {
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();

  const { app, error } = useApp({
    appInfo: { name: 'Flint Board', version: __FLINT_MCP_VERSION__ },
    capabilities: {},
    autoResize: true,
    onAppCreated: (app) => {
      app.onteardown = async () => ({});
      app.onerror = (err) => console.error(err);
      app.onhostcontextchanged = (params) => setHostContext((prev) => ({ ...prev, ...params }));
      app.ontoolresult = (result) => {
        const { _meta, content } = result as { _meta?: { flint?: { board?: Board } }; content?: { type: string; text?: string }[] };
        if (result.isError) {
          setFailed(content?.find((part) => part.type === 'text')?.text ?? '');
          return;
        }
        const next = _meta?.flint?.board;
        if (next) {
          setFailed(null);
          setBoard(next);
        }
      };
    },
  });

  useEffect(() => {
    if (app) setHostContext(app.getHostContext());
  }, [app]);

  if (error) {
    return (
      <div className="status">
        <strong>App error:</strong> {error.message}
      </div>
    );
  }
  if (!app) return <div className="status">Connecting…</div>;
  if (failed !== null) {
    return (
      <div className="status">
        <strong>Board not drawn</strong>
        {failed && <div className="status-reason">{failed}</div>}
      </div>
    );
  }
  if (!board) return <div className="status">Waiting for the board…</div>;
  return <BoardView app={app} initial={board} hostContext={hostContext} />;
}
