import { useCallback, useMemo, useState } from 'react';
import type { ChartAssemblyInput } from 'flint-chart';
import type { ChartUpdate, FlintInteractionEventDetail } from 'flint-chart/interactive';
import { FlintChart } from 'flint-chart/react';
import { ScaleToFit } from '../components/ScaleToFit';
import { INDEX_CHART_STOCKS } from '../data/index-chart-stocks';
import {
  deriveIndexChartState,
  clampDateToPreparedDomain,
  prepareIndexChartData,
} from './index-chart-model';
import './index-chart-stage.css';

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 520;
const DATA_UPDATE_ID = 'index-chart-data';
const INSPECT_INTERACTION_ID = 'index-chart-inspect';
const PREPARED = prepareIndexChartData(INDEX_CHART_STOCKS);
const INITIAL_ACTIVE_DATE = new Date('2015-05-13T00:00:00Z');

/** One ink per ticker, so a ticker keeps its colour whatever order the lines end in. */
const TICKER_INKS: Record<string, string> = {
  AAPL: '#1799c3', AMZN: '#c71e1d', GOOG: '#d57700', IBM: '#089f87', MSFT: '#15607a',
};

type IndexState = ReturnType<typeof deriveIndexChartState>;

/** Returns in percentage points, so the axis and the names at the line ends read "190%". */
function percentRows(state: IndexState) {
  return state.indexedRows.map((row) => ({ ...row, IndexedReturn: Math.round(row.IndexedReturn * 1000) / 10 }));
}
const RETURN_DOMAIN = PREPARED.returnDomain.map((bound) => bound * 100) as [number, number];

/**
 * The reference date as Flint draws it: a rule across the plot at the date, and the date written
 * beside it at the top. Both are projected through the chart's own scales, so they stay on the date.
 */
function referenceOverlays(date: Date): ChartUpdate['ops'] {
  const at = [{ Date: date.toISOString(), Top: RETURN_DOMAIN[1], Label: formatMonth(date) }];
  return [
    {
      op: 'set-overlay',
      name: 'reference-rule',
      value: { mark: 'rule', role: 'reference-date', data: { values: at }, encodings: { x: { field: 'Date' } }, style: { stroke: '#5f6b74', strokeWidth: 1 } },
    },
    {
      op: 'set-overlay',
      name: 'reference-label',
      value: {
        mark: 'text', role: 'reference-date-label', data: { values: at },
        encodings: { x: { field: 'Date' }, y: { field: 'Top' }, text: { field: 'Label' } },
        style: { fill: '#3a434a', fontSize: 11, fontWeight: 'bold', textAlign: 'start', dx: 5, dy: 10 },
      },
    },
  ];
}

function chartInput(rows: ReturnType<typeof percentRows>): ChartAssemblyInput {
  return {
    data: { values: rows },
    semantic_types: {
      Date: 'Date',
      Symbol: { semanticType: 'Category', colors: TICKER_INKS },
      // The range every reference date can reach, fixed so the axis holds still as the lines re-index.
      IndexedReturn: {
        semanticType: 'Quantity',
        unit: '%',
        intrinsicDomain: RETURN_DOMAIN,
      },
    },
    field_display_names: {
      IndexedReturn: 'Return vs. reference date',
      Symbol: 'Ticker',
    },
    theme_spec: {
      extends: 'datawrapper',
      // Each line is named where it ends, with how far it ended from the reference date.
      legend: {
        show: 'always',
        placement: ['seriesEnd', 'right'],
        endValue: true,
      },
    },
    options: { addTooltips: false },
    interaction_spec: {
      // Inspect only reads the date under the pointer; the reference rule, snapped to a trading day,
      // is drawn as an overlay with its date beside it.
      interactions: [{
        type: 'inspect-index', id: INSPECT_INTERACTION_ID, options: { axis: 'x', show: 'all', displayValue: false, guide: false },
      }],
    },
    chart_spec: {
      chartType: 'Line Chart',
      title: 'Index chart (Flint + D3 reference)',
      subtitle: 'Every line is re-indexed to the date under the pointer',
      encodings: { x: 'Date', y: 'IndexedReturn', color: 'Symbol' },
      baseSize: { width: VIEW_WIDTH, height: VIEW_HEIGHT },
      canvasSize: { width: VIEW_WIDTH, height: VIEW_HEIGHT },
      chartProperties: {
        includeZero_y: true,
        showPoints: false,
      },
    },
  };
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function IndexChartStage() {
  const initialState = useMemo(() => deriveIndexChartState(PREPARED, INITIAL_ACTIVE_DATE), []);
  const [activeDate, setActiveDate] = useState(initialState.activeDate);
  const derived = useMemo(() => deriveIndexChartState(PREPARED, activeDate), [activeDate]);
  const spec = useMemo(() => chartInput(percentRows(initialState)), [initialState]);

  // Re-indexed rows replace the chart's data, and the reference rule moves to the date; rows are
  // compared by reference, so this applies once per date.
  const updates = useMemo<ChartUpdate[]>(() => [{
    id: DATA_UPDATE_ID,
    ops: [
      { op: 'set-data', source: 'main', value: { rows: percentRows(derived) as unknown as Record<string, unknown>[] } },
      ...referenceOverlays(derived.activeDate),
    ],
  }], [derived]);

  // The inspect event carries the date under the pointer, read back through the chart's own x scale.
  const handleInteraction = useCallback((detail: FlintInteractionEventDetail) => {
    if (detail.interactionId !== INSPECT_INTERACTION_ID || detail.event.phase === 'cancel') return;
    const x = detail.event.geometry.domain?.x;
    if (!x || x.kind !== 'value') return;
    const value = x.value;
    const date = value instanceof Date ? value
      : typeof value === 'number' || typeof value === 'string' ? new Date(value) : undefined;
    if (!date || Number.isNaN(date.getTime())) return;
    const nextDate = clampDateToPreparedDomain(PREPARED, date);
    setActiveDate((current) => (current.getTime() === nextDate.getTime() ? current : nextDate));
  }, []);

  return (
    <div className="ic-flint-dimpvis-shell index-chart-shell">
      <div className="ic-stage-meta">
        <strong>Continuous reference date</strong>
        <span>
          Move across the chart to re-index every series against the current date.
        </span>
      </div>
      <div className="ic-flint-dimpvis-panel">
        <ScaleToFit height={540} adaptiveHeight padding={8}>
          <div className="ic-flint-dimpvis-mount index-chart-mount">
            <FlintChart
              spec={spec}
              updates={updates}
              renderer="svg"
              ariaLabel="Index chart with a movable reference date"
              chartId="index-chart-stage"
              onInteraction={handleInteraction}
            />
          </div>
        </ScaleToFit>
      </div>
    </div>
  );
}
