import { useMemo } from 'react';
import { MousePointerClick, Move, RotateCcw } from 'lucide-react';
import type { ChartAssemblyInput } from 'flint-chart';
import { clickGroupFocus, clickHighlight, navigate, select, type InteractionDef } from 'flint-chart/interactive';
import epoch from '../../data/epoch-ai-models.json';
import pisa from '../../data/pisa-oecd23-trends.json';
import coffeeGas from '../../data/bls-coffee-gas-1990s.json';
import { InteractionDemoChart } from '../InteractionDemoChart';
import { PisaDrawStage } from '../PisaDrawStage';
import type { InteractionDemoFixture } from '../interaction-demo-data';
import { gapminderRows } from '../gapminder-dashboard-data';
import {
  DASHBOARD_SELECTION_ID,
  DashboardPanel,
  dashboardFixture,
  dashboardTheme,
  useLinkedDashboard,
  type DashboardChart,
} from '../InteractionDashboardLab';
import { ArticleSection } from '../InteractiveDataReportLab';
import {
  emphasis,
  fullView,
  pointNote,
  preset,
  sentence,
  titleSlide,
  view,
  type SectionSpec,
} from '../interactive-data-report-model';
import '../axis-label-lab.css';
import '../interaction-transport.css';
import '../interaction-dashboard-lab.css';
import './application-demos.css';

const MODELS_FIXTURE: InteractionDemoFixture = {
  id: 'epoch-ai-models',
  title: 'Parameters and training cost of notable AI models',
  source: epoch.source,
  input: {
    data: { values: epoch.rows },
    semantic_types: {
      Model: 'Category',
      Organization: 'Category',
      Domain: 'Category',
      Year: 'Year',
      Parameters: 'Quantity',
      'Training cost (2023 USD)': 'Amount',
    },
    chart_spec: {
      chartType: 'Scatter Plot',
      title: 'Parameters and training cost of notable AI models',
      subtitle: `${epoch.rows.length} models with both estimates, 2012 to 2026`,
      encodings: { x: 'Parameters', y: 'Training cost (2023 USD)', color: 'Domain', detail: 'Model' },
      baseSize: { width: 820, height: 520 },
      chartProperties: { logScale_x: true, logScale_y: true },
    },
    interaction_spec: {
      interactions: [
        { type: 'inspect', id: 'inspect' },
        { type: 'legend-toggle', id: 'legend' },
      ],
    },
  } as ChartAssemblyInput,
};

const NO_INTERACTIONS: readonly InteractionDef[] = [];

/* ---------- 1. coffee and gasoline prices: hover readout, as in the Interactions page chat ---------- */

const PRICE_FIXTURE: InteractionDemoFixture = {
  id: 'coffee-gas-prices',
  title: 'U.S. average coffee and gasoline prices, 1990–2000',
  source: coffeeGas.source,
  input: {
    data: { values: coffeeGas.values.map(({ month, price, item }) => ({ Month: month, Price: price, Item: item })) },
    semantic_types: { Month: 'YearMonth', Price: 'Currency', Item: 'Category' },
    field_display_names: { Price: 'Average price (USD)' },
    chart_spec: {
      chartType: 'Line Chart',
      title: 'U.S. average coffee and gasoline prices, 1990–2000',
      subtitle: 'U.S. city average, monthly; coffee per pound, gasoline per gallon',
      encodings: { x: 'Month', y: 'Price', color: 'Item' },
      baseSize: { width: 720, height: 340 },
    },
    interaction_spec: { interactions: [{ type: 'inspect-index', options: { show: 'all' } }] },
  } as ChartAssemblyInput,
};

/* ---------- 2. Gapminder dashboard: three linked panels ---------- */

const SNAPSHOT_YEAR = 2007;
const gapminderCountryCount = new Set(gapminderRows.map((row) => row.Country)).size;
const observationsOf = (test: (row: (typeof gapminderRows)[number]) => boolean) =>
  gapminderRows.filter(test).map((row) => row.Observation);

const GAPMINDER_DASHBOARD: DashboardChart[] = (() => {
  const snapshot = gapminderRows.filter((row) => row.Year === SNAPSHOT_YEAR);
  const countries = snapshot.map((row) => ({
    ...row,
    'Population (M)': row.Population / 1_000_000,
    'Observation IDs': observationsOf((candidate) => candidate.Country === row.Country),
  }));
  const trends = gapminderRows.map((row) => ({ ...row, 'Year label': String(row.Year) }));
  const continents = [...new Set(snapshot.map((row) => row.Continent))].map((Continent) => ({
    Continent,
    'Population (M)': snapshot.filter((row) => row.Continent === Continent).reduce((sum, row) => sum + row.Population, 0) / 1_000_000,
    'Observation IDs': observationsOf((row) => row.Continent === Continent),
  }));
  return [
    {
      id: 'countries',
      fixture: dashboardFixture(
        'test-gapminder-countries',
        `Health and wealth, ${SNAPSHOT_YEAR}`,
        'Scatter Plot',
        { x: 'GDP per capita', y: 'Life expectancy', size: 'Population (M)', color: 'Continent', detail: 'Country' },
        countries,
        { logScale_x: true },
        { width: 520, height: 420 },
      ),
      interaction: select({ id: DASHBOARD_SELECTION_ID, dimOpacity: 0.22 }),
    },
    {
      id: 'trends',
      fixture: dashboardFixture(
        'test-gapminder-trends',
        'Life expectancy, 1952–2007',
        'Line Chart',
        { x: 'Year label', y: 'Life expectancy', color: 'Country' },
        trends,
        { showPoints: true },
        { width: 470, height: 230 },
      ),
      interaction: clickGroupFocus({ id: DASHBOARD_SELECTION_ID, groupBy: 'Country', dimOpacity: 0.22 }),
    },
    {
      id: 'continents',
      fixture: dashboardFixture(
        'test-gapminder-continents',
        `Population by continent, ${SNAPSHOT_YEAR}`,
        'Bar Chart',
        { x: 'Population (M)', y: 'Continent' },
        continents,
        undefined,
        { width: 470, height: 130 },
      ),
      interaction: clickHighlight({ id: DASHBOARD_SELECTION_ID, dimOpacity: 0.22, targets: ['mark'] }),
    },
  ];
})();

function GapminderDashboard() {
  const { selection, registerChart, routeSelection, clearSelection } = useLinkedDashboard();
  const selected = useMemo(() => {
    const ids = new Set(selection?.ids ?? []);
    const countries = new Set(gapminderRows.filter((row) => ids.has(row.Observation)).map((row) => row.Country));
    const snapshot = gapminderRows.filter((row) => row.Year === SNAPSHOT_YEAR && (countries.size === 0 || countries.has(row.Country)));
    const average = snapshot.reduce((sum, row) => sum + row['Life expectancy'], 0) / snapshot.length;
    return { count: countries.size, average };
  }, [selection]);
  const [scatter, trends, continents] = GAPMINDER_DASHBOARD;
  const panel = (chart: DashboardChart) => (
    <DashboardPanel key={chart.id} chart={chart} registerChart={registerChart} routeSelection={routeSelection} />
  );

  return (
    <div className="idash-page app-demo-dashboard">
      <div className="app-demo-dashboard-bar">
        <section className="idash-summary app-demo-dashboard-kpis" aria-label="Current selection" aria-live="polite">
          <div className="idash-summary-item">
            <span>Countries selected</span>
            <strong>{selected.count > 0 ? `${selected.count} of ${gapminderCountryCount}` : `All ${gapminderCountryCount}`}</strong>
          </div>
          <div className="idash-summary-item">
            <span>Average life expectancy, {SNAPSHOT_YEAR}</span>
            <strong>{selected.average.toFixed(1)} years</strong>
          </div>
        </section>
        <div className="idash-status">
          <button type="button" onClick={clearSelection} disabled={!selection} title="Clear linked selection">
            <RotateCcw size={15} aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>
      <div className="app-demo-dashboard-grid">
        <div className="app-demo-dashboard-main">{panel(scatter)}</div>
        <div className="app-demo-dashboard-side">
          {panel(trends)}
          {panel(continents)}
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. Gapminder story: the scroll article on life expectancy ---------- */

const LIFE_FIXTURE: InteractionDemoFixture = {
  id: 'gapminder-life',
  title: 'Life expectancy in twenty countries, 1952–2007',
  source: 'Gapminder five-year data via Jenny Bryan / Plotly datasets',
  input: {
    data: { values: gapminderRows.map(({ Country, Year, 'Life expectancy': life }) => ({ Country, Year, 'Life expectancy': life })) },
    semantic_types: { Country: 'Country', Year: 'Year', 'Life expectancy': 'Quantity' },
    field_display_names: { 'Life expectancy': 'Life expectancy (years)' },
    // Economist, with an extended palette so each of the twenty countries keeps its own ink.
    theme_spec: dashboardTheme,
    chart_spec: {
      chartType: 'Line Chart',
      title: 'Life expectancy in twenty countries, 1952–2007',
      subtitle: 'Years at birth, every five years',
      encodings: { x: 'Year', y: 'Life expectancy', color: 'Country' },
      baseSize: { width: 560, height: 380 },
      // Without points a key such as China/1962 names one segment; with them it names the point too and a note cannot anchor.
      chartProperties: { showPoints: false },
    },
  } as ChartAssemblyInput,
};

/** The countries whose 1952 life expectancy was under 50 years, read from the data. */
const UNDER_50_IN_1952 = gapminderRows
  .filter((row) => row.Year === 1952 && row['Life expectancy'] < 50)
  .map((row) => ({ Country: row.Country }));

/** A year on the story's temporal x axis, as the timestamp the viewport takes. */
const year = (value: number) => Date.UTC(value, 0, 1);

const LIFE_STORY: SectionSpec = {
  id: 'gapminder-life',
  title: 'Six decades of longer lives',
  lede: 'Life expectancy at birth in twenty countries, 1952 to 2007.',
  byline: 'Gapminder five-year data',
  fixture: LIFE_FIXTURE,
  presets: [
    preset('set-style', 'Click highlight', MousePointerClick, clickHighlight({ id: 'focus', targets: ['mark', 'legend'] })),
    preset('set-viewport', 'Pan & zoom', Move, navigate({ id: 'navigate' })),
  ],
  paragraphs: [
    [titleSlide('title', 'Six decades of longer lives', fullView('xy'))],
    [sentence('1952', 'In 1952, nine of these twenty countries could expect to live less than 50 years; the average was 53.9.', view({ x: [year(1952), year(1967)] }), emphasis(...UNDER_50_IN_1952))],
    [sentence('china', 'China’s line dips in 1962, from 50.5 years to 44.5, before climbing to 58.4 by 1967.', view({ x: [year(1952), year(1977)] }), emphasis({ Country: 'China' }), pointNote({ Country: 'China', Year: 1962 }, '44.5 years'))],
    [sentence('2007', 'By 2007, sixteen of the twenty were above 70, and Japan led at 82.6 years.', fullView('xy'), emphasis({ Country: 'Japan' }), pointNote({ Country: 'Japan', Year: 2007 }, '82.6 years'))],
    [sentence('south-africa', 'South Africa went the other way: from 61.9 years in 1992 to 49.3 in 2007.', view({ x: [year(1987), year(2007)] }), emphasis({ Country: 'South Africa' }), pointNote({ Country: 'South Africa', Year: 2007 }, '49.3 years'))],
    [sentence('average', 'Across the twenty countries, average life expectancy rose from 53.9 years in 1952 to 72.4 in 2007.', fullView('xy'))],
  ],
};

const PISA_INK = {
  Science: '#5b8fd6',
  Mathematics: '#f2a89b',
  Reading: '#e3120b',
} as const;

export function TestExamples() {
  return <section className="axis-label-lab">
    <header className="axis-label-heading"><h1>Test examples</h1></header>
    <section className="axis-label-compact app-demo-section" id="coffee-gas-prices" aria-labelledby="coffee-gas-prices-heading">
      <h2 id="coffee-gas-prices-heading">U.S. coffee and gasoline prices, 1990–2000</h2>
      <p className="axis-label-source">{coffeeGas.source}. Hover along the timeline to read both prices.</p>
      <div className="app-demo-full">
        <InteractionDemoChart fixture={PRICE_FIXTURE} interactions={NO_INTERACTIONS} chartId="coffee-gas-prices" />
      </div>
    </section>
    <section className="axis-label-compact app-demo-section" id="gapminder-dashboard" aria-labelledby="gapminder-dashboard-heading">
      <h2 id="gapminder-dashboard-heading">Gapminder dashboard: linked charts</h2>
      <p className="axis-label-source">Gapminder five-year data, 20 countries, 1952–2007. Brush countries in the scatter, click a line, or click a continent; the other panels follow.</p>
      <div className="app-demo-full">
        <GapminderDashboard />
      </div>
    </section>
    <section className="axis-label-compact app-demo-section" id="gapminder-story" aria-labelledby="gapminder-story-heading">
      <h2 id="gapminder-story-heading">Gapminder story: six decades of longer lives</h2>
      <p className="axis-label-source">Gapminder five-year data, 20 countries, 1952–2007. Scroll the text; each paragraph updates the chart.</p>
      <div className="it-page idr-page app-demo-embed">
        <ArticleSection spec={LIFE_STORY} editable={false} />
      </div>
    </section>
    <section className="axis-label-compact app-demo-section" id="epoch-ai-models" aria-labelledby="epoch-ai-models-heading">
      <h2 id="epoch-ai-models-heading">AI models: parameters and training cost</h2>
      <p className="axis-label-source">{epoch.source}. Hover a point to inspect a model; click a legend entry to hide a domain.</p>
      <div className="app-demo-full">
        <InteractionDemoChart fixture={MODELS_FIXTURE} interactions={NO_INTERACTIONS} chartId="epoch-ai-models" />
      </div>
    </section>
    <section className="axis-label-compact app-demo-section" id="pisa-you-draw-it" aria-labelledby="pisa-you-draw-it-heading">
      <h2 id="pisa-you-draw-it-heading">You draw it: PISA scores after 2012</h2>
      <p className="axis-label-source">{pisa.meta.source} Pick a subject, draw its line to 2025; the real lines appear once all three are drawn.</p>
      <div className="app-demo-full">
        <PisaDrawStage theme="economist" ink={PISA_INK} />
      </div>
    </section>
  </section>;
}
