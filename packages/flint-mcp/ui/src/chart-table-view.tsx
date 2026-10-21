// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** The switch between a chart and its table, and which of the two a chart shows. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChartAssemblyInput, ChartTable } from 'flint-chart';
import { drawsAsTable, vegaLiteTable } from 'flint-chart';

export type CellView = 'chart' | 'table';

/** A chart as the views read it: its input and the view the agent asked for. */
interface ViewedChart {
  id: string;
  input: ChartAssemblyInput;
  view?: CellView;
}

/**
 * The view each chart shows: a chart type that is a table is always one; any other shows the
 * reader's switch until the agent sets that chart's view again, else the agent's view.
 */
export function useCellViews(charts: readonly ViewedChart[]): {
  viewOf: (chart: ViewedChart) => CellView;
  setView: (id: string, view: CellView) => void;
} {
  const [switched, setSwitched] = useState<Record<string, { view: CellView; agent?: CellView }>>({});
  const chartsRef = useRef(charts);
  chartsRef.current = charts;
  useEffect(() => setSwitched((now) => {
    const kept = Object.entries(now).filter(([id, reader]) => charts.find((chart) => chart.id === id)?.view === reader.agent);
    return kept.length === Object.keys(now).length ? now : Object.fromEntries(kept);
  }), [charts]);
  const viewOf = useCallback((chart: ViewedChart): CellView => {
    if (drawsAsTable(chart.input.chart_spec.chartType)) return 'table';
    const reader = switched[chart.id];
    return reader && reader.agent === chart.view ? reader.view : chart.view ?? 'chart';
  }, [switched]);
  const setView = useCallback((id: string, view: CellView) => {
    const agent = chartsRef.current.find((chart) => chart.id === id)?.view;
    setSwitched((now) => ({ ...now, [id]: { view, agent } }));
  }, []);
  return { viewOf, setView };
}

/** The chart's table, built only while it is shown. */
export function useChartTable(input: ChartAssemblyInput | null | undefined, view: CellView): ChartTable | null {
  return useMemo(() => {
    if (view !== 'table' || !input) return null;
    try {
      return vegaLiteTable(input);
    } catch {
      return null;
    }
  }, [input, view]);
}

/** The switch a cell's heading carries, naming the view it turns to. */
export function ViewSwitch({ view, onView, name }: { view: CellView; onView: (view: CellView) => void; name: string }) {
  return (
    <button
      type="button"
      className="bar-link board-view-switch"
      aria-pressed={view === 'table'}
      aria-label={`${VIEW_SWITCH_LABEL[view]}: ${name}`}
      title={VIEW_SWITCH_LABEL[view]}
      onClick={() => onView(view === 'chart' ? 'table' : 'chart')}
    >
      <ViewSwitchIcon view={view} />
    </button>
  );
}

export const VIEW_SWITCH_LABEL: Record<CellView, string> = { chart: 'Show as table', table: 'Show as chart' };

/** The icon of the view the switch turns to. */
export function ViewSwitchIcon({ view }: { view: CellView }) {
  return view === 'chart' ? (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6.2H14.5M1.5 9.8H14.5M6 6.2V13.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 14.5H14.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M3.5 12.5V8M7.2 12.5V3.5M11 12.5V6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
