import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { assembleVegaLite } from 'flint-chart';
import { navigate, viewportUpdate, type InteractiveChartSurface } from 'flint-chart/interactive';
import { FlintChart, type FlintChartHandle } from 'flint-chart/react';
import { openVegaLiteSession } from '../../../packages/flint-js/src/vegalite/assemble';

import {
  Plot,
  AxisLabels,
  Row,
  BASKET_ROWS,
  BASKET_MONTHS,
  TEAMS,
  COUNTIES,
  BASKET_SPEC,
  RESIZE_CASES,
  COUNTY_SPEC,
  toMs,
  time,
  px,
  plotText,
  ms,
  labelText,
  SvgChart,
  Facts,
} from './layout-plan-shared';
import { DashboardDemo } from './LayoutPlanDashboardDemo';
import { ThemeExplorerDemo } from './LayoutPlanThemeExplorer';
import { PinsDemo } from './LayoutPlanPinsDemo';
import { MonitorDemo } from './LayoutPlanMonitorDemo';
import { MorphDemo } from './LayoutPlanMorphDemo';
import { ThemeFuserDemo } from './LayoutPlanThemeDemos';
import './overflow-viewport-lab.css';
import './layout-plan-lab.css';
// ─── 1. Live layout ────────────────────────────────────────────────────────

const ZOOM_ID = 'basket-zoom';
const BASKET_INTERACTIONS = [navigate({
  id: ZOOM_ID,
  axes: 'x',
  domainGuard: { minVisibleFraction: 6 / BASKET_MONTHS.length, maxVisibleFraction: 1, overscrollFraction: 0 },
})];

const monthStart = (month: string): number => Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
const lastMonth = BASKET_MONTHS[BASKET_MONTHS.length - 1];
const windowOf = (months: number): [number, number] => {
  const last = monthStart(lastMonth);
  const first = new Date(last);
  first.setUTCMonth(first.getUTCMonth() - (months - 1));
  return [first.getTime() - 15 * 86400000, last + 15 * 86400000];
};
const PRESETS: { label: string; window: [number, number] | null }[] = [
  { label: 'All 10 years', window: null },
  { label: '3 years', window: windowOf(36) },
  { label: '1 year', window: windowOf(12) },
  { label: '6 months', window: windowOf(6) },
];

interface LivePlan {
  months: number;
  pinned: { plot: Plot; labels: AxisLabels; ms: number };
  fresh?: { plot: Plot; labels: AxisLabels; ms: number };
}

function LiveLayoutDemo() {
  const chartRef = useRef<FlintChartHandle>(null);
  const session = useMemo(() => openVegaLiteSession(structuredClone(BASKET_SPEC)), []);
  const [plan, setPlan] = useState<LivePlan | null>(null);
  const freshTimer = useRef<number>();
  const lastWindow = useRef('');

  const planWindow = useCallback((start: number, end: number) => {
    const key = `${start}:${end}`;
    if (key === lastWindow.current) return;
    lastWindow.current = key;
    const inWindow = (row: Row) => {
      const at = toMs(row.Month);
      return at >= start && at <= end;
    };
    const months = new Set(BASKET_ROWS.filter((row) => inWindow({ Month: monthStart(row.Month) })).map(({ Month }) => Month)).size;
    const pinned = time(() => session.replan({ keep: inWindow, pinPlot: true }));
    setPlan({ months, pinned: { plot: pinned.value.plot, labels: pinned.value.axisLabels, ms: pinned.ms } });
    window.clearTimeout(freshTimer.current);
    freshTimer.current = window.setTimeout(() => {
      const visible = BASKET_ROWS.filter((row) => inWindow({ Month: monthStart(row.Month) }));
      const fresh = time(() => openVegaLiteSession({ ...structuredClone(BASKET_SPEC), data: { values: visible } }));
      setPlan((current) => current && { ...current, fresh: { plot: fresh.value.plot, labels: fresh.value.axisLabels, ms: fresh.ms } });
    }, 250);
  }, [session]);

  const follow = useCallback(() => {
    const x = chartRef.current?.getState()?.viewport?.x;
    if (x?.kind === 'interval') planWindow(toMs(x.start), toMs(x.end));
    else planWindow(-Infinity, Infinity);
  }, [planWindow]);

  useEffect(() => () => window.clearTimeout(freshTimer.current), []);

  const zoom = (window: [number, number] | null) => {
    void chartRef.current?.applyUpdate(viewportUpdate(ZOOM_ID, window ? { x: window } : null), { transition: { duration: 500 } })
      .then(follow);
  };

  return (
    <section className="ov-demo lp-demo" data-demo="live">
      <header className="ov-demo-header">
        <div>
          <h2>Zoom, and the chart lays itself out again</h2>
          <p>Scroll on the chart or pick a window. Each window is planned again for the months in view: bars widen, labels straighten, and values appear once they fit.</p>
        </div>
        <div className="ov-backends" role="group" aria-label="Window">
          {PRESETS.map((preset) => (
            <button type="button" key={preset.label} onClick={() => zoom(preset.window)}>{preset.label}</button>
          ))}
        </div>
      </header>
      <div className="lp-split">
        <div className="lp-chart-cell">
          <FlintChart
            ref={chartRef}
            spec={BASKET_SPEC}
            interactions={BASKET_INTERACTIONS}
            renderer="svg"
            chartId="layout-plan-live"
            onRender={follow}
            onChange={follow}
          />
        </div>
        <aside className="lp-panel" data-panel="live">
          <h3>This window's plan</h3>
          {plan ? (
            <>
              <Facts rows={[
                ['Months in view', String(plan.months)],
                ['Plot', plotText(plan.pinned.plot)],
                ['x labels', labelText(plan.pinned.labels.x)],
                ['y labels', labelText(plan.pinned.labels.y)],
                ['Re-plan', ms(plan.pinned.ms)],
              ]} />
              <h3>Compiling the window instead</h3>
              {plan.fresh ? (
                <Facts rows={[
                  ['Plot', plotText(plan.fresh.plot)],
                  ['x labels', labelText(plan.fresh.labels.x)],
                  ['Compile', ms(plan.fresh.ms)],
                ]} />
              ) : <p className="lp-muted">Compiling…</p>}
            </>
          ) : <p className="lp-muted">Waiting for the chart…</p>}
        </aside>
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function LayoutPlanLab() {
  return (
    <div className="dev-page ov-page lp-page">
      <header className="dev-page-heading ov-heading">
        <h1>Layout plan</h1>
        <p>Flint analyses the data once, plans the layout, then writes the spec. A chart that keeps its analysis can plan again whenever its window, rows, size or theme change.</p>
      </header>

      <GroupHeading title="When the data in view changes" />
      <LiveLayoutDemo />

      <GroupHeading title="When a chart outgrows its type" />
      <MonitorDemo />
      <MorphDemo />

      <GroupHeading title="When the room changes" />
      <DashboardDemo />

      <GroupHeading title="When the theme changes" />
      <ThemeFuserDemo />
      <ThemeExplorerDemo />

      <GroupHeading title="Steering the plan" />
      <PinsDemo />
    </div>
  );
}

function GroupHeading({ title }: { title: string }) {
  return (
    <div className="ov-section-heading lp-group-heading">
      <span>{title}</span>
    </div>
  );
}
