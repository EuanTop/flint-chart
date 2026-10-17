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
import type { ChartAssemblyInput, ChartTable, ChartUpdate, ChartWarning, UpdateCheck } from 'flint-chart';
import { assembleVegaLite, drawsAsTable, resolveThemeSpec, validateChart } from 'flint-chart';
import type { ChartChange, ChartState, InteractiveChartSurface } from 'flint-chart/interactive';
import { FlintChart, FlintTable } from 'flint-chart/react';
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
import { APP_PREVIEW_CANVAS_SIZE, usesAutoPreviewSize, withAppPreviewDefaults } from './render';
import { boardPng } from './board-export';
import { SelectionChips, chipText, impliedParts, partText } from './selection-chips';
import { ViewSwitch, useCellViews, useChartTable, type CellView } from './chart-table-view';
import { ActionButton, ThemeControl } from './FlintApp';
import { LINK_LAYER, conditionUpdates, gestureParts, shownFields, type ChartLink, type LinkCondition, type LinkSpec } from 'flint-chart/interactive';

declare const __FLINT_MCP_VERSION__: string;

interface BoardChart {
  id: string;
  input: ChartAssemblyInput;
  updates?: ChartUpdate[];
  layout?: ChartLayout;
}

interface Board {
  id: string;
  title?: string;
  subtitle?: string;
  source?: string;
  theme_spec?: ChartAssemblyInput['theme_spec'];
  columns?: number;
  grid?: GridItem[];
  reader_theme?: { theme: ChartAssemblyInput['theme_spec'] | null };
  version: number;
  charts: BoardChart[];
  link_spec?: LinkSpec;
  linked?: Record<string, ChartLink>;
}

const POLL_MS = 1500;

const EXPORT_LABEL = {
  idle: 'Copy board as PNG',
  working: 'Copying the board…',
  copied: 'Board copied',
  downloaded: 'Board downloaded',
  error: 'Could not export the board',
} as const;

/** A theme as the model reads it: its preset id, a custom theme's label, or the default. */
function themeName(theme: ChartAssemblyInput['theme_spec']): string {
  if (theme === undefined) return 'Flint default';
  if (typeof theme === 'string') return theme;
  const custom = theme as { label?: string; id?: string; extends?: string };
  return custom.label ?? custom.id ?? (custom.extends ? `custom (${custom.extends})` : 'custom');
}
const NO_UPDATES: readonly ChartUpdate[] = [];

/** The board's condition with nothing in it. */
const NO_CONDITION: LinkCondition = {};

interface BoardCondition {
  parts: LinkCondition;
  from: Record<string, string>;
  impliedBy: Record<string, string>;
}

const EMPTY_CONDITION: BoardCondition = { parts: NO_CONDITION, from: {}, impliedBy: {} };

/** The state without the layers other charts link in, which the board's link lines report instead. */
function withoutLinkLayers(state: ChartState): ChartState {
  if (!state.entries?.has(LINK_LAYER)) return state;
  return { ...state, entries: new Map([...state.entries].filter(([id]) => id !== LINK_LAYER)) };
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

/** The chart with its heading lifted out to the cell, as the chart card plans it for a room up to `height` tall. */
function roomSpec(input: ChartAssemblyInput, height: number): ChartAssemblyInput {
  const { title: _title, subtitle: _subtitle, ...chartSpec } = input.chart_spec;
  return withAppPreviewDefaults(
    { ...input, theme_spec: withoutFurniture(input.theme_spec), chart_spec: chartSpec },
    { width: APP_PREVIEW_CANVAS_SIZE.width, height },
  );
}

/** The theme without its branding marks, which the board draws once on its frame. */
function withoutFurniture(theme: ChartAssemblyInput['theme_spec']): ChartAssemblyInput['theme_spec'] {
  if (theme === undefined) return theme;
  return (typeof theme === 'string' ? { extends: theme, furniture: [] } : { ...theme, furniture: [] }) as ChartAssemblyInput['theme_spec'];
}

/** The widest a KPI tile is planned, so a tile alone in a wide cell stays a tile. */
const MAX_TILE_WIDTH = 260;

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
  view,
  onView,
  onTable,
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
  view: CellView;
  onView: (id: string, view: CellView) => void;
  onTable: (id: string, table: ChartTable | null) => void;
  onRender: (id: string, surface: InteractiveChartSurface) => void;
  onChange: (id: string, change: ChartChange) => void;
  onWarnings: (id: string, warnings: readonly ChartWarning[]) => void;
}) {
  // A KPI tile is laid out at its tile's width; it draws its own minimum, scaled down to fit.
  const [measure, width] = useWidth<HTMLDivElement>();
  // Any other chart is sized as the chart card sizes one: its theme's footprint, the cell's width as
  // the room it may stretch into, and the row's height as the most it may take. The spec does not
  // carry the width, so a resize lays the chart out again in place and keeps what the reader did.
  const spec = useMemo(
    () => (kpi ? (width ? cellSpec(input, width, height) : null) : roomSpec(input, height)),
    [kpi, input, width, height],
  );
  const handleRender = useCallback((surface: InteractiveChartSurface) => onRender(chart.id, surface), [chart.id, onRender]);
  const handleChange = useCallback((change: ChartChange) => onChange(chart.id, change), [chart.id, onChange]);
  const handleWarnings = useCallback((warnings: readonly ChartWarning[]) => onWarnings(chart.id, warnings), [chart.id, onWarnings]);
  const table = useCellTable(chart.id, spec, view, onTable);
  const tableType = drawsAsTable(input.chart_spec.chartType);
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
        {!tableType && <ViewSwitch view={view} onView={(next) => onView(chart.id, next)} name={title ?? chart.id} />}
      </header>
      <div
        className={cellBodyClass('board-cell-chart', tableType, table)}
        style={tableType ? { height } : undefined}
        ref={kpi ? measure : undefined}
      >
        {!tableType && spec && (
          <FlintChart
            className="chart-interactive"
            spec={spec}
            updates={updates}
            renderer="svg"
            expressionInterpreter={expressionInterpreter}
            chartId={`flint-board-${chart.id}`}
            width="100%"
            fit={!kpi && usesAutoPreviewSize(input) ? 'relayout' : 'scale-down'}
            fallback={<span className="chart-pending">Rendering…</span>}
            onRender={handleRender}
            onChange={handleChange}
            onWarnings={handleWarnings}
          />
        )}
        {table && <FlintTable table={table} updates={updates} />}
      </div>
    </section>
  );
}

/** A cell body's classes: a chart type that is a table fills it; a chart shown as its table lays the table over the chart. */
function cellBodyClass(base: string, tableType: boolean, table: ChartTable | null): string {
  return tableType ? `${base} table-cell` : table ? `${base} view-table` : base;
}

/** The cell's table while it shows one, reported to the board as it changes. */
function useCellTable(
  id: string,
  input: ChartAssemblyInput | null,
  view: CellView,
  onTable: (id: string, table: ChartTable | null) => void,
): ChartTable | null {
  const table = useChartTable(input, view);
  useEffect(() => onTable(id, table), [id, table, onTable]);
  useEffect(() => () => onTable(id, null), [id, onTable]);
  return table;
}

/** Each chart's input as the board draws it: the board's theme where it sets none, and shared colours in one order. */
function useDrawInputs(
  charts: readonly BoardChart[],
  theme: ChartAssemblyInput['theme_spec'],
  /** The reader chose the theme for the whole board, over any chart's own. */
  everyChart: boolean,
): Map<string, ChartAssemblyInput> {
  const cache = useRef(new Map<string, { chart: BoardChart; key: string; input: ChartAssemblyInput }>());
  return useMemo(() => {
    const themed = charts.map((chart) => ({
      chart,
      input: everyChart
        ? { ...chart.input, theme_spec: theme }
        : chart.input.theme_spec !== undefined || theme === undefined ? chart.input : { ...chart.input, theme_spec: theme },
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
  }, [charts, theme, everyChart]);
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

type GridGesture = 'move' | 'right' | 'bottom' | 'corner' | 'corner-left';

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
  view,
  onView,
  onTable,
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
  view: CellView;
  onView: (id: string, view: CellView) => void;
  onTable: (id: string, table: ChartTable | null) => void;
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
  const table = useCellTable(chart.id, spec, view, onTable);
  const tableType = drawsAsTable(input.chart_spec.chartType);
  return (
    <section
      className={['board-tile', kpi ? 'board-cell-kpi' : '', active ? 'board-tile-active' : ''].filter(Boolean).join(' ')}
      data-chart-id={chart.id}
      style={box}
    >
      <header className="board-cell-header board-tile-header" ref={measureHeader}>
        {title && <h2 className="board-cell-title">{title}</h2>}
        {subtitle && <p className="board-cell-subtitle">{subtitle}</p>}
        {editing && !title && !subtitle && <span className="board-tile-grip">{chart.id}</span>}
        {!editing && !tableType && <ViewSwitch view={view} onView={(next) => onView(chart.id, next)} name={title ?? chart.id} />}
      </header>
      <div
        className={cellBodyClass('board-cell-chart board-tile-chart', tableType, table)}
        style={tableType ? { height: chartHeight } : undefined}
      >
        {!tableType && measuredHeader !== null && (
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
        {table && <FlintTable table={table} updates={updates} />}
      </div>
      {editing && (
        <>
          <button type="button" className="board-tile-handle" aria-label={`Move ${title ?? chart.id}`} title="Drag to move" {...handle('move')}>
            <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
              {[2, 7, 12].flatMap((y) => [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="currentColor" />))}
            </svg>
          </button>
          <div className="board-tile-edge board-tile-edge-right" aria-label={`Resize ${chart.id} width`} {...handle('right')} />
          <div className="board-tile-edge board-tile-edge-bottom" aria-label={`Resize ${chart.id} height`} {...handle('bottom')} />
          <div className="board-tile-corner" aria-label={`Resize ${chart.id}`} {...handle('corner')} />
          <div className="board-tile-corner board-tile-corner-left" aria-label={`Resize ${chart.id} from the left`} {...handle('corner-left')} />
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
  // The board's one selection, from the chart the reader selected on last, with the layers that hold it there.
  // The board's one condition, and the chart each part came from, which names its values.
  // A theme picked in the bar shows at once; the board the server returns then carries it.
  const [pendingTheme, setPendingTheme] = useState<{ theme: ChartAssemblyInput['theme_spec'] | null } | 'reset' | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'working' | 'copied' | 'downloaded' | 'error'>('idle');
  // The board's one condition, the chart each part came from, which names its values, and the parts
  // another part of the same selection implies (a country's region), applied but not shown.
  const [condition, setCondition] = useState<BoardCondition>(EMPTY_CONDITION);
  // A hover previews its parts over the condition while the pointer stays.
  const [hovered, setHovered] = useState<{ source: string; parts: LinkCondition } | null>(null);
  const surfaces = useRef(new Map<string, InteractiveChartSurface>());
  const charts = useStableCharts(board);
  const { viewOf, setView } = useCellViews(charts);
  const states = useRef(new Map<string, ChartState>());
  const warnings = useRef(new Map<string, readonly ChartWarning[]>());
  const tables = useRef(new Map<string, ChartTable>());
  const gestures = useRef(new Map<string, Map<string, ChartGesture>>());
  const lastContext = useRef<string | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;
  const chartsRef = useRef(charts);
  chartsRef.current = charts;
  const conditionRef = useRef(condition);
  conditionRef.current = condition;
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
    const restoredRef = { current: null as string | null };
    const poll = async () => {
      if (stopped || editingRef.current || document.visibilityState !== 'visible') return;
      try {
        const result = await app.callServerTool({
          name: 'read_board',
          arguments: { board_id: boardRef.current.id, version: boardRef.current.version },
        });
        if (stopped || editingRef.current) return;
        if (result.isError) {
          // The server lost the board, as after a restart: hand it back under its own id, once.
          if (restoredRef.current === boardRef.current.id) {
            setLive(false);
            return;
          }
          restoredRef.current = boardRef.current.id;
          const restored = await app.callServerTool({ name: 'restore_board', arguments: { board: boardRef.current } });
          const back = (restored.structuredContent as { board?: Board } | undefined)?.board;
          if (stopped) return;
          if (restored.isError || !back) {
            setLive(false);
            return;
          }
          setLive(true);
          setBoard(back);
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

  const clearCondition = useCallback(() => {
    setCondition((current) => (Object.keys(current.parts).length === 0 ? current : EMPTY_CONDITION));
  }, []);

  /**
   * Reads a gesture the reader committed. Its parts join the board's condition, a field the
   * condition already has taking the new part; a gesture that let its marks go clears the whole
   * condition. The chart then drops its own emphasis, so every chart shows the one condition.
   */
  const readSelection = useCallback((id: string, change: ChartChange) => {
    const link = boardRef.current.linked?.[id];
    const interaction = change.interactionId;
    if (!link || !interaction || !link.gestures[interaction] || link.gestures[interaction].hover) return;
    const parts = gestureParts(link, interaction, change.state, false);
    if (!parts) {
      clearCondition();
      return;
    }
    const rows = (chartsRef.current.find((chart) => chart.id === id)?.input.data.values ?? []) as Record<string, unknown>[];
    const implied = impliedParts(Object.keys(parts), rows);
    setCondition((current) => {
      const kept = Object.fromEntries(Object.entries(current.impliedBy).filter(([field, by]) => !(field in parts) && !(by in parts)));
      return {
        parts: { ...current.parts, ...parts },
        from: { ...current.from, ...Object.fromEntries(Object.keys(parts).map((field) => [field, id])) },
        impliedBy: { ...kept, ...implied },
      };
    });
    void surfaces.current.get(id)?.clearUpdate(interaction);
  }, [clearCondition]);

  /** Lets one shown part go, with the parts it implied. */
  const removePart = useCallback((field: string) => {
    setCondition((current) => {
      const gone = new Set([field, ...Object.entries(current.impliedBy).filter(([, by]) => by === field).map(([hidden]) => hidden)]);
      const parts = Object.fromEntries(Object.entries(current.parts).filter(([key]) => !gone.has(key)));
      if (Object.keys(parts).length === 0) return EMPTY_CONDITION;
      return {
        parts,
        from: Object.fromEntries(Object.entries(current.from).filter(([key]) => !gone.has(key))),
        impliedBy: Object.fromEntries(Object.entries(current.impliedBy).filter(([key, by]) => !gone.has(key) && !gone.has(by))),
      };
    });
  }, []);

  /** Reads a hover: its parts preview over the condition while the pointer stays. */
  const readHover = useCallback((id: string, change: ChartChange) => {
    const link = boardRef.current.linked?.[id];
    const interaction = change.interactionId;
    if (!link || !interaction || !link.gestures[interaction]?.hover) return false;
    const parts = change.phase === 'preview' ? gestureParts(link, interaction, change.state, true) : null;
    setHovered((current) => {
      if (!parts) return current?.source === id ? null : current;
      return current && current.source === id && JSON.stringify(current.parts) === JSON.stringify(parts) ? current : { source: id, parts };
    });
    return true;
  }, []);

  // Parts on fields the board no longer connects on let go.
  useEffect(() => {
    const fields = new Set(board.link_spec?.fields ?? []);
    setCondition((current) => {
      const kept = Object.entries(current.parts).filter(([field]) => fields.has(field));
      return kept.length === Object.keys(current.parts).length ? current : { ...current, parts: Object.fromEntries(kept) };
    });
  }, [board.link_spec]);

  // Escape anywhere on the card clears the condition, whichever chart has focus.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') clearCondition(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearCondition]);

  const updatesById = useMemo(() => {
    const shown = hovered ? { ...condition.parts, ...hovered.parts } : condition.parts;
    const linked = board.linked ? conditionUpdates(board.linked, shown) : new Map<string, ChartUpdate>();
    const result = new Map<string, readonly ChartUpdate[]>();
    for (const chart of charts) {
      const layers: ChartUpdate[] = [...(chart.updates ?? [])];
      const layer = linked.get(chart.id);
      if (layer) layers.push(layer);
      result.set(chart.id, layers.length > 0 ? layers : NO_UPDATES);
    }
    return result;
  }, [charts, board.linked, condition, hovered]);

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
        table: tables.current.get(chart.id),
      }).text;
      lines.push('', `## ${chart.id}`, text);
    }
    const spec = current.link_spec;
    if (spec && current.linked) {
      lines.push('', `Links (fields: ${spec.fields.join(', ')}):`);
      const now = conditionRef.current;
      const fields = Object.keys(now.parts);
      if (fields.length === 0) {
        lines.push('- No selection: every chart shows all its marks.');
      } else {
        const said = fields.map((field) => `${partText(field, now.parts[field], current.charts.find((chart) => chart.id === now.from[field])?.input)} (selected on ${now.from[field]})`);
        const shown = Object.entries(current.linked).map(([id, link]) => {
          const by = shownFields(link, now.parts);
          return `${id} ${by.length > 0 ? `by ${by.join(' and ')}` : 'unaffected'}`;
        });
        lines.push(`- The board is narrowed to ${said.join(' and ')}.`, `- Each chart shows it on the fields its marks carry: ${shown.join('; ')}.`);
      }
    }
    if (current.reader_theme) lines.push('', `The reader picked the theme ${themeName(current.reader_theme.theme ?? undefined)} for every chart, over ${themeName(current.theme_spec)}.`);
    if (current.grid) lines.push('', 'Layout, as the reader arranged it on a 12-column grid:', ...gridLines(current.grid));
    const text = lines.join('\n');
    if (text === lastContext.current) return;
    lastContext.current = text;
    void app.updateModelContext({ content: [{ type: 'text', text }] })
      .catch((err) => console.warn('The host declined the board context', err));
  }, [app]);
  useEffect(() => sendContext(), [board, charts, condition, sendContext]);
  const handleTable = useCallback((id: string, table: ChartTable | null) => {
    if (table) tables.current.set(id, table);
    else tables.current.delete(id);
    sendContext();
  }, [sendContext]);

  const handleRender = useCallback((id: string, surface: InteractiveChartSurface) => {
    const state = surface.getState();
    surfaces.current.set(id, surface);
    if (state) states.current.set(id, state);
    sendContext();
  }, [sendContext]);

  const handleWarnings = useCallback((id: string, next: readonly ChartWarning[]) => {
    warnings.current.set(id, next);
  }, []);

  const handleChange = useCallback((id: string, change: ChartChange) => {
    if (change.source !== 'host' && readHover(id, change)) return;
    // A reset on any chart lets the board's condition go everywhere.
    if (change.source === 'reader' && change.reset) clearCondition();
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
    readSelection(id, change);
    sendContext();
  }, [sendContext, readSelection, readHover, clearCondition]);

  const [measureBoard, boardWidth] = useWidth<HTMLElement>();
  const rows: BoardRow[] = useMemo(() => {
    const layoutCharts = charts.map((chart) => ({ id: chart.id, chartType: chart.input.chart_spec.chartType, layout: chart.layout }));
    return boardRows(layoutCharts, boardColumns(layoutCharts, board.columns), boardWidth ?? undefined);
  }, [charts, board.columns, boardWidth]);
  const readerTheme = pendingTheme === 'reset' ? undefined : pendingTheme ?? board.reader_theme;
  const theme = readerTheme ? readerTheme.theme ?? undefined : board.theme_spec;
  const drawInputs = useDrawInputs(charts, theme, readerTheme !== undefined);
  const pickTheme = useCallback(async (next: ChartAssemblyInput['theme_spec']) => {
    const reset = JSON.stringify(next ?? null) === JSON.stringify(boardRef.current.theme_spec ?? null);
    setPendingTheme(reset ? 'reset' : { theme: next ?? null });
    try {
      const result = await app.callServerTool({
        name: 'set_board_theme',
        arguments: reset ? { board_id: boardRef.current.id, reset: true } : { board_id: boardRef.current.id, theme: next ?? null },
      });
      const saved = (result.structuredContent as { board?: Board } | undefined)?.board;
      if (saved && !result.isError) {
        setBoard(saved);
        setPendingTheme(null);
        return;
      }
    } catch {
      // The pick stays on this card below.
    }
    // The server did not keep it (one started before set_board_theme, say): the card still shows it.
    setNotice('The theme could not be saved on the board; it shows here until the card reloads.');
  }, [app]);
  const style = useMemo(() => boardStyle(theme), [theme]);
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
      // Over another chart, the two trade places or the dragged one is inserted there; over open board, it moves there.
      const origin = gridRef.current?.getBoundingClientRect();
      const over = origin && active.start.find((item) => {
        if (item.id === active.id) return false;
        const box = boxOf(item);
        const px = event.clientX - origin.left;
        const py = event.clientY - origin.top;
        return px >= box.left && px <= box.left + box.width && py >= box.top && py <= box.top + box.height;
      });
      // Within a row the two trade places; onto another row the dragged chart is inserted there.
      // Shift does the other.
      const sameRow = !!over && over.y < start.y + start.h && start.y < over.y + over.h;
      if (over && sameRow !== event.shiftKey) {
        setDraft(swapGrid(active.start, active.id, over.id, minWidth));
        return;
      }
      if (over) {
        // Dropped on a chart, the dragged one takes its place there and the rest move down.
        const col = Math.floor((event.clientX - origin!.left) / (colWidth + CELL_GAP));
        const placed = { ...start, x: Math.min(ROW_UNITS - start.w, Math.max(0, col)), y: over.y };
        setDraft(arrangeGrid(active.start.map((item) => (item.id === active.id ? placed : item)), active.id, minWidth));
        return;
      }
      const moved = { ...start, x: Math.min(ROW_UNITS - start.w, Math.max(0, start.x + dx)), y: Math.max(0, start.y + dy) };
      setDraft(arrangeGrid(active.start.map((item) => (item.id === active.id ? moved : item)), active.id, minWidth));
      return;
    }
    const next = { ...start };
    if (active.kind === 'right' || active.kind === 'corner') next.w = Math.min(ROW_UNITS - next.x, Math.max(minWidth(next.id), start.w + dx));
    if (active.kind === 'corner-left') {
      const right = start.x + start.w;
      next.x = Math.min(right - minWidth(next.id), Math.max(0, start.x + dx));
      next.w = right - next.x;
    }
    if (active.kind === 'bottom' || active.kind === 'corner' || active.kind === 'corner-left') next.h = Math.max(minHeight(next.id), start.h + dy);
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

  const boardElement = useRef<HTMLElement | null>(null);
  const exportBoard = useCallback(async () => {
    const root = boardElement.current;
    if (!root) return;
    setExportStatus('working');
    const png = boardPng(root);
    png.catch(() => undefined);
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        // A promised blob keeps the click's permission to write while the board is drawn.
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
        setExportStatus('copied');
        return;
      }
    } catch {
      // Clipboard images denied: the host may still take a download.
    }
    try {
      if (!app.getHostCapabilities()?.downloadFile) throw new Error('no download');
      const bytes = new Uint8Array(await (await png).arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const result = await app.downloadFile({
        contents: [{ type: 'resource', resource: { uri: 'file:///flint-board.png', mimeType: 'image/png', blob: btoa(binary) } }],
      });
      setExportStatus(result.isError ? 'error' : 'downloaded');
    } catch (err) {
      console.error('The board could not be exported', err);
      setExportStatus('error');
    }
  }, [app]);
  useEffect(() => {
    if (exportStatus === 'idle' || exportStatus === 'working') return;
    const handle = window.setTimeout(() => setExportStatus('idle'), 2500);
    return () => window.clearTimeout(handle);
  }, [exportStatus]);

  // One chip per part the reader acted on; parts another part implies apply without a chip.
  const chips = Object.entries(condition.parts)
    .filter(([field]) => !(field in condition.impliedBy))
    .map(([field, part]) => {
      const chart = byId.get(condition.from[field]);
      return { field, label: chipText(field, part, chart?.input), full: partText(field, part, chart?.input) };
    });

  const editing = draft !== null;
  const gridHeight = grid ? Math.max(...grid.map((item) => item.y + item.h), 0) * GRID_ROW : 0;

  return (
    <main
      className={editing ? 'board board-editing' : 'board'}
      ref={(node) => { boardElement.current = node; measureBoard(node); }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        '--board-bg': style.background,
        '--board-ink': style.ink,
        '--board-muted': style.muted,
        '--board-font': style.font,
        '--board-title-font': style.titleFont,
        // The host's safe area adds to the board's own margin; a host that sends 0 leaves the margin.
        '--inset-top': `${hostContext?.safeAreaInsets?.top ?? 0}px`,
        '--inset-right': `${hostContext?.safeAreaInsets?.right ?? 0}px`,
        '--inset-bottom': `${hostContext?.safeAreaInsets?.bottom ?? 0}px`,
        '--inset-left': `${hostContext?.safeAreaInsets?.left ?? 0}px`,
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
        </div>
        {editing && <p className="board-hint">Drag a chart by its handle at the top right: dropped on a chart in its row the two swap; dropped on another row it is inserted there and the rest move down (Shift does the other). Drag the right or bottom edge, or a bottom corner, to resize.</p>}
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
                view={viewOf(chart)}
                onView={setView}
                onTable={handleTable}
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
                    view={viewOf(chart)}
                    onView={setView}
                    onTable={handleTable}
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
      {charts.length > 0 && (
        <div className="optionsbar board-bar" role="toolbar" aria-label="Board options">
          <div className="optionsbar-grid">
            <div className="optionsbar-pinned">
              <ThemeControl
                themeSpec={theme}
                customTheme={typeof board.theme_spec === 'object' ? board.theme_spec : undefined}
                onTheme={(next) => void pickTheme(next)}
              />
            </div>
            <SelectionChips chips={chips} onRemove={removePart} onClear={clearCondition} />
            <span className="board-bar-fill" />
            {editing ? (
              <span className="bar-actions">
                <button type="button" className="board-tool" onClick={() => setDraft(null)}>Cancel</button>
                <button type="button" className="board-tool board-tool-primary" onClick={() => void save(draft)}>Done</button>
              </span>
            ) : (
              <span className="bar-actions">
                <ActionButton label="Edit layout" onClick={startEditing}>
                  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="1.5" y="9" width="13" height="5.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </ActionButton>
                <ActionButton label="Reset layout" className="bar-reset" disabled={!board.grid} onClick={() => void save(null)}>
                  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4 5.5H1.5V3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 5.5A6 6 0 1 1 2.8 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </ActionButton>
                <ActionButton label={EXPORT_LABEL[exportStatus]} disabled={exportStatus === 'working'} onClick={() => void exportBoard()}>
                  {exportStatus === 'copied' || exportStatus === 'downloaded' ? (
                    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
                      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M3.5 10.5 A1.5 1.5 0 0 1 2.5 9.5 V3 A1.5 1.5 0 0 1 4 1.5 H10.5 A1.5 1.5 0 0 1 11.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  )}
                </ActionButton>
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/** How long the card waits for the call's result before it rebuilds the board from the call itself. */
const RESULT_WAIT_MS = 2500;
/** How long it waits for anything at all before it says the board cannot be redrawn here. */
const NOTHING_WAIT_MS = 6000;
const NOT_REDRAWN =
  'This board cannot be redrawn here: the call that made it did not reach this card again, as can happen when a conversation is reopened. Ask Claude to show the board again.';

export function BoardApp() {
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const toolArgs = useRef<Record<string, unknown> | undefined>(undefined);
  const resultSeen = useRef(false);
  const boardSeen = useRef(false);
  boardSeen.current = board !== null;

  const { app, error } = useApp({
    appInfo: { name: 'Flint Board', version: __FLINT_MCP_VERSION__ },
    capabilities: {},
    autoResize: true,
    onAppCreated: (app) => {
      app.onteardown = async () => ({});
      app.onerror = (err) => console.error(err);
      app.onhostcontextchanged = (params) => setHostContext((prev) => ({ ...prev, ...params }));
      app.ontoolinput = (params) => {
        toolArgs.current = params?.arguments as Record<string, unknown> | undefined;
      };
      app.ontoolresult = (result) => {
        resultSeen.current = true;
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

  // A reopened conversation may not hand the card its result again, or hand it without the board.
  // The card then asks the server to build the board from the call's own arguments; with nothing to
  // build from, it says so instead of waiting.
  useEffect(() => {
    if (!app) return;
    let stopped = false;
    const rebuild = async () => {
      if (stopped || boardSeen.current) return;
      const args = toolArgs.current;
      if (!args || !Array.isArray(args.charts)) {
        if (resultSeen.current) setFailed(NOT_REDRAWN);
        return;
      }
      try {
        const result = await app.callServerTool({ name: 'restore_board', arguments: { create: args } });
        const back = (result.structuredContent as { board?: Board } | undefined)?.board;
        if (stopped || boardSeen.current) return;
        if (result.isError || !back) setFailed(NOT_REDRAWN);
        else setBoard(back);
      } catch {
        if (!stopped && !boardSeen.current) setFailed(NOT_REDRAWN);
      }
    };
    const first = window.setTimeout(() => void rebuild(), RESULT_WAIT_MS);
    const last = window.setTimeout(() => {
      if (!stopped && !boardSeen.current && !toolArgs.current) setFailed(NOT_REDRAWN);
    }, NOTHING_WAIT_MS);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearTimeout(last);
    };
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
