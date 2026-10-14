import { useEffect, useState } from 'react';
import type { ChartAssemblyInput } from 'flint-chart';
import { compile as compileVegaLite } from 'vega-lite';
import { parse as parseVega, View as VegaView } from 'vega';
import type { VegaLiteSession } from '../../../packages/flint-js/src/vegalite/assemble';
import foodPrices from '../data/cpi-food-prices.json';
import worldCup from '../data/world-cup-2026.json';
import gistemp from '../data/gistemp-monthly.json';
import timeUse from '../data/time-use-companions.json';
import election from '../data/election-2024.json';

export type Plot = { width: number; height: number } | undefined;
export type AxisLabels = VegaLiteSession['axisLabels'];
export type Row = Record<string, unknown>;

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Data ──────────────────────────────────────────────────────────────────

export const BASKET_FOODS = new Set(['Bananas', 'Eggs', 'Ground beef', 'White bread', 'Whole milk']);
export const BASKET_ROWS = foodPrices.values
  .filter(({ item }) => BASKET_FOODS.has(item))
  .map(({ month, item, price }) => ({ Month: month.slice(0, 7), Price: price, Food: item }));
export const BASKET_MONTHS = [...new Set(BASKET_ROWS.map(({ Month }) => Month))].sort();

export const TEAMS = worldCup.teams.map(({ team, confed, goals }) => ({ Team: team, Confederation: confed, Goals: goals }));

export const SCORERS = worldCup.scorers.map(({ player, team, goals }) => ({ Player: player, Team: team, Goals: goals }));

export const COUNTIES = election.counties.map(({ county, state, margin }) => ({ County: county, State: state, Margin: margin }));

export const ANNUAL = gistemp.years
  .filter(({ annual }) => annual !== null)
  .map(({ year, annual }) => ({ Year: year, Anomaly: annual }));
export const MONTHLY_GRID = gistemp.years
  .filter(({ year }) => year >= 1975 && year <= 2024)
  .flatMap(({ year, months }) => months.map((value, index) => ({ Year: String(year), Month: MONTHS[index], Anomaly: value })));

export const COMPANIONS = Object.entries(
  timeUse.values
    .filter(({ Group }) => Group === 'All people')
    .reduce<Record<string, number>>((hours, { Who, Hours }) => ({ ...hours, [Who]: (hours[Who] ?? 0) + Hours }), {}),
).map(([Who, Hours]) => ({ Who, Hours: Number(Hours.toFixed(1)) }));

// ─── Specs ─────────────────────────────────────────────────────────────────

export const BASKET_SPEC: ChartAssemblyInput = {
  data: { values: BASKET_ROWS },
  semantic_types: { Month: 'YearMonth', Price: { semanticType: 'Price', unit: 'USD' }, Food: 'Category' },
  field_display_names: { Price: 'U.S. average price', Food: 'Food' },
  theme_spec: { extends: 'datawrapper', geometry: { band: { cornerRadius: 2 } } },
  options: { addTooltips: false, targetBandAR: 0 },
  chart_spec: {
    chartType: 'Stacked Bar Chart',
    title: 'What is driving the food basket?',
    subtitle: 'Monthly U.S. average prices for five foods · BLS, Aug 2015–Aug 2025',
    encodings: { x: 'Month', y: 'Price', color: 'Food' },
    baseSize: { width: 640, height: 340 },
    canvasSize: { width: 640, height: 340 },
  },
};

export const TEAM_TYPES = { Team: 'Country', Confederation: 'Category', Goals: 'Count' };

export const RESIZE_CASES: { id: string; label: string; model: string; spec: ChartAssemblyInput }[] = [
  {
    id: 'bars',
    label: 'Bars · 48 teams',
    model: 'Bands shrink as the box narrows, then the axis scrolls.',
    spec: {
      data: { values: TEAMS },
      semantic_types: TEAM_TYPES,
      chart_spec: { chartType: 'Bar Chart', title: 'Goals per team, World Cup 2026', encodings: { x: 'Team', y: 'Goals' } },
    },
  },
  {
    id: 'line',
    label: 'Line · 145 years',
    model: 'The plot fills the box; ticks thin out as it narrows.',
    spec: {
      data: { values: ANNUAL },
      semantic_types: { Year: 'Year', Anomaly: { semanticType: 'Temperature', unit: '°C' } },
      chart_spec: { chartType: 'Line Chart', title: 'Global temperature anomaly', encodings: { x: 'Year', y: 'Anomaly' } },
    },
  },
  {
    id: 'heatmap',
    label: 'Heatmap · 50 × 12',
    model: 'Cells share whatever room both axes leave.',
    spec: {
      data: { values: MONTHLY_GRID },
      semantic_types: { Year: 'Year', Month: 'Month', Anomaly: { semanticType: 'Temperature', unit: '°C' } },
      chart_spec: { chartType: 'Heatmap', title: 'Monthly anomaly, 1975–2024', encodings: { x: 'Year', y: 'Month', color: 'Anomaly' } },
    },
  },
  {
    id: 'pie',
    label: 'Pie · 7 slices',
    model: 'The radius follows the shorter side, down to a minimum.',
    spec: {
      data: { values: COMPANIONS },
      semantic_types: { Who: 'Category', Hours: { semanticType: 'Duration', unit: 'hours' } },
      chart_spec: { chartType: 'Pie Chart', title: 'Who Americans spend their day with', encodings: { size: 'Hours', color: 'Who' } },
    },
  },
];

export const COUNTY_SPEC: ChartAssemblyInput = {
  data: { values: COUNTIES },
  semantic_types: { County: 'Name', State: 'Category', Margin: { semanticType: 'SignedMeasure', unit: 'pts' } },
  field_display_names: { Margin: 'Trump minus Harris' },
  chart_spec: { chartType: 'Bar Chart', encodings: { x: 'County', y: 'Margin' }, baseSize: { width: 300, height: 180 } },
};

export const SCORER_SPEC: ChartAssemblyInput = {
  data: { values: SCORERS },
  semantic_types: { Player: 'Name', Team: 'Country', Goals: 'Count' },
  chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Player', y: 'Goals' }, baseSize: { width: 300, height: 180 } },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

export const toMs = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return Date.parse(String(value));
};

export const time = <T,>(run: () => T): { value: T; ms: number } => {
  const start = performance.now();
  const value = run();
  return { value, ms: performance.now() - start };
};

export const px = (value: number | undefined): string => (value === undefined ? '–' : `${Math.round(value)}`);
export const plotText = (plot: Plot): string => (plot ? `${px(plot.width)} × ${px(plot.height)}` : '–');
export const ms = (value: number): string => `${value < 10 ? value.toFixed(1) : Math.round(value)} ms`;

export function labelText(label: AxisLabels['x'] | undefined): string {
  if (!label) return '–';
  const parts = [`${label.fontSize}px`];
  if (label.angle) parts.push(`${label.angle}°`);
  return parts.join(' · ');
}

export function labelReasons(label: AxisLabels['x']): string[] {
  const reasons: string[] = [];
  if (label.crowdedFrom !== undefined) reasons.push(`crowded: the theme asked ${label.crowdedFrom}px, the plan kept ${label.fontSize}px`);
  if (label.overflowFit) reasons.push(`the names do not stand flat and whole in a ${Math.round(label.overflowFit.band)}px band: step ${label.overflowFit.step}${label.overflowFit.trimmed ? ' + trim' : ''}`);
  return reasons;
}

/** The band step a Vega-Lite spec states for a dimension, wherever in the spec it sits. */
export function specStep(spec: any, dimension: 'width' | 'height'): number | undefined {
  if (!spec || typeof spec !== 'object') return undefined;
  const own = spec[dimension];
  if (own && typeof own === 'object' && typeof own.step === 'number') return own.step;
  for (const child of [spec.spec, ...(spec.layer ?? []), ...(spec.vconcat ?? []), ...(spec.hconcat ?? []), ...(spec.concat ?? [])]) {
    const step = specStep(child, dimension);
    if (step !== undefined) return step;
  }
  return undefined;
}

function walk(node: unknown, visit: (node: Record<string, any>) => void): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((child) => walk(child, visit)); return; }
  visit(node as Record<string, any>);
  Object.values(node).forEach((child) => walk(child, visit));
}

/** The legend orient and whether value labels print, as the emitted spec states them. */
export function specFacts(spec: any): { legend: string; values: boolean } {
  let legend: string | undefined;
  let hasLegend = false;
  let values = false;
  walk(spec, (node) => {
    if (node.color && typeof node.color === 'object' && node.color.legend !== null && node.color.field) hasLegend = true;
    if (node.legend && typeof node.legend === 'object' && typeof node.legend.orient === 'string') legend ??= node.legend.orient;
    const mark = typeof node.mark === 'string' ? node.mark : node.mark?.type;
    if (mark === 'text' && node.encoding?.text) values = true;
  });
  return { legend: hasLegend ? legend ?? 'right' : 'none', values };
}

export async function specToSvg(spec: any): Promise<string> {
  const view = new VegaView(parseVega(compileVegaLite(spec).spec as any), { renderer: 'none' } as any);
  return view.toSVG();
}

export function SvgChart({ spec, className }: { spec: any; className?: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let live = true;
    specToSvg(spec).then((markup) => { if (live) setSvg(markup); }).catch((error) => { if (live) setSvg(`<p>${String(error)}</p>`); });
    return () => { live = false; };
  }, [spec]);
  return <div className={className ?? 'lp-svg'} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="lp-facts">
      {rows.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionHeading({ index, title, summary }: { index: number; title: string; summary: string }) {
  return (
    <div className="ov-section-heading">
      <span>{index}. {title}</span>
      <small>{summary}</small>
    </div>
  );
}
