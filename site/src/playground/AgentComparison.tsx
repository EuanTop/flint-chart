import './agent-comparison.css';

/**
 * How an agent fares building and revising a dashboard with D3 versus Flint: the method (setup and
 * prompts, verbatim) and the results so far. The runs themselves are not kept; the harness that
 * reproduces them is in talk/demo (prepare.sh, run.sh, prompts-*.json).
 */

const BUILD_PROMPT = `I have UNESCO data in school_completion.csv: the share of young people who finished upper secondary school, by country and year, 2000–2025 (columns: country, iso3, map_id = ISO numeric code used by world maps, region, year, completion, completion_girls, completion_boys, all in %). Build an interactive dashboard with three charts and a table: (1) a world map of completion in 2025, (2) a line chart of completion over time, one line per country, (3) a scatter plot of girls' vs boys' completion in 2025, and (4) a table of countries with their 2025 completion, girls, boys and region. Clicking a country in any chart should highlight it in all three charts and select its row in the table; clicking a table row should highlight that country in the charts. {HOW} Before you finish, read over your code and double-check it.`;

const ADAPT_PROMPT = `Two changes: restyle the whole dashboard in The Economist's visual style, and change the interaction: let me drag a rectangle on the scatter plot to select a group of countries; highlight them on the map and in the line chart, and show only those countries in the table. Before you finish, read over your code and double-check it.`;

const HOW_D3 = `Build it as one page, dashboard.html, using D3 v7 from a CDN; load school_completion.csv with fetch (the page is served from this folder).`;

const HOW_FLINT = `Build it as one page, dashboard.html, with the flint-chart library (version 1.0.0 is vendored in ./flint; starter.html shows how to import it). Author from the Flint skills only: don't search the web or GitHub, and don't read the files in ./flint. Load school_completion.csv with fetch (the page is served from this folder).`;

interface Row {
  approach: string;
  time: string;
  cost: string;
  output: string;
  calls?: string;
  adapt: string;
  file: string;
  best?: (keyof Row)[];
}

const MAIN: Row[] = [
  { approach: 'D3 · Opus 5.5', time: '9m 53s', cost: '243', output: '66.0k', calls: '34', adapt: '+338 −168', file: '558' },
  { approach: 'Flint · Opus 5.5', time: '4m 6s', cost: '171', output: '25.6k', calls: '22', adapt: '+109 −87', file: '387', best: ['time', 'cost', 'output', 'calls', 'adapt', 'file'] },
  { approach: 'D3 · Haiku 5.5', time: '5m 41s', cost: '6.2', output: '72.5k', calls: '18', adapt: '+154 −79', file: '494' },
  { approach: 'Flint · Haiku 5.5', time: '2m 11s', cost: '4.4', output: '25.0k', calls: '20', adapt: '+24 −22', file: '251', best: ['time', 'cost', 'output', 'adapt', 'file'] },
];

const OPEN_LOOKUP: Row[] = [
  { approach: 'Flint · Opus 5.5', time: '8m 11s', cost: '385', output: '45.4k', calls: '62', adapt: '+152 −35', file: '500' },
  { approach: 'Flint · Haiku 5.5', time: '3m 13s', cost: '5.4', output: '34.9k', calls: '17', adapt: '+50 −26', file: '284' },
];

const FOUR_TURNS: { dataset: string; rows: Row[] }[] = [
  {
    dataset: 'UNESCO: build, Economist style, box select, region filter',
    rows: [
      { approach: 'D3 · Opus 5.5', time: '8m 52s', cost: '223', output: '53.4k', adapt: '+730 −115', file: '615' },
      { approach: 'Flint · Opus 5.5', time: '7m 20s', cost: '322', output: '45.9k', adapt: '+641 −159', file: '482' },
      { approach: 'D3 · Haiku 5.5', time: '4m 27s', cost: '4.5', output: '52.0k', adapt: '+507 −88', file: '419' },
      { approach: 'Flint · Haiku 5.5', time: '3m 7s', cost: '5.3', output: '34.8k', adapt: '+289 −33', file: '256' },
    ],
  },
  {
    dataset: 'Gapminder: build, Economist style, box select, year slider',
    rows: [
      { approach: 'D3 · Opus 5.5', time: '9m 55s', cost: '214', output: '62.3k', adapt: '+774 −179', file: '595' },
      { approach: 'Flint · Opus 5.5', time: '6m 6s', cost: '237', output: '37.1k', adapt: '+485 −65', file: '420' },
      { approach: 'D3 · Haiku 5.5', time: '5m 22s', cost: '5.3', output: '65.5k', adapt: '+541 −94', file: '447' },
      { approach: 'Flint · Haiku 5.5', time: '3m 1s', cost: '5.2', output: '34.4k', adapt: '+373 −52', file: '321' },
    ],
  },
];

function ResultTable({ rows, adaptLabel = 'Adapt turn: lines +/−', showCalls = true }: { rows: Row[]; adaptLabel?: string; showCalls?: boolean }) {
  const cols: [keyof Row, string][] = [
    ['time', 'Time'],
    ['cost', 'Cost (AIU)'],
    ['output', 'Output tokens'],
    ...(showCalls ? [['calls', 'Model calls'] as [keyof Row, string]] : []),
    ['adapt', adaptLabel],
    ['file', 'Final file (lines)'],
  ];
  return (
    <table className="ac-totals">
      <thead>
        <tr><th />{cols.map(([, label]) => <th key={label}>{label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.approach}>
            <th scope="row">{r.approach}</th>
            {cols.map(([key]) => <td key={key} className={r.best?.includes(key) ? 'is-best' : ''}>{r[key] as string}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AgentComparison() {
  return (
    <div className="dev-page ac-page">
      <header className="dev-page-heading ac-heading">
        <h1>Agent comparison: building and revising a dashboard with D3 or Flint</h1>
        <p>
          A coding agent builds an interactive dashboard from a data file, then revises it. One run writes D3; the
          other uses the flint-chart library with the Flint skills. We compare time, tokens, cost and how much code
          each turn writes, and look at the rendered dashboards side by side. The runs are not kept here; the harness
          that reproduces them is in <code>talk/demo</code>.
        </p>
      </header>

      <section className="ac-block ac-findings">
        <h2>Findings</h2>
        <ul>
          <li>
            <b>Authoring from the skills, Flint was faster and cheaper on both models.</b> Opus: 4m 6s and 171 AIU
            against 9m 53s and 243 AIU for D3, with 25.6k output tokens against 66.0k. Haiku: 2m 11s and 4.4 AIU
            against 5m 41s and 6.2 AIU, with 25.0k output tokens against 72.5k.
          </li>
          <li>
            <b>Revising is where Flint is smallest.</b> The adapt turn (Economist style and a box-select interaction)
            took +109 −87 lines (Opus) and +24 −22 (Haiku) with Flint, against +338 −168 and +154 −79 with D3. The
            final files were about a third smaller (Opus) to half the size (Haiku).
          </li>
          <li>
            <b>All four dashboards worked.</b> After the adapt turn, clicking a country highlights it across the
            charts, the Economist style applies, and a box drawn on the scatter highlights the map and lines and
            filters the table to the selected countries.
          </li>
          <li>
            <b>Left free to look things up, Opus verified Flint against its source, and that cost more than D3.</b>{' '}
            With no shell or browser, "double-check" became reading the vendored bundle and searching Flint's GitHub
            source (62 model calls against 22). It finished sooner than D3 but cost 385 AIU against 243. About half of
            what it looked up the skills already state; the rest were real gaps (below). Haiku did not explore and
            stayed cheap either way.
          </li>
          <li>
            <b>The skills are a fixed cost.</b> Even authoring from the skills, Flint's context ends the build turn
            near 85k tokens against D3's 48k; the chart and interaction skills are about 27k tokens of it. Flint wins
            back that cost in fewer calls and less output.
          </li>
          <li>
            <b>The longer four-turn sessions (below) agree on time and code</b>: Flint was faster on every run, wrote
            14–47% fewer output tokens and ended with smaller files. Cost was mixed: about even on Haiku, higher for
            Flint on Opus (322 vs 223 and 237 vs 214 AIU), where lookups were allowed.
          </li>
        </ul>
      </section>

      <section className="ac-block">
        <h2>Main result: build, then adapt</h2>
        <p className="ac-note">
          UNESCO school completion, 164 countries, 2000–2025. Fresh session per row; Flint authored from the skills
          only. Bold: the better of D3 and Flint on the same model. One run per row.
        </p>
        <ResultTable rows={MAIN} />
      </section>

      <section className="ac-block">
        <h2>Same task, Flint free to look things up</h2>
        <p className="ac-note">
          The Flint prompt said "Use the Flint skills." instead of the skills-only line, and web search, web fetch and
          GitHub code search were available. Compare with the rows above; D3 is unchanged.
        </p>
        <ResultTable rows={OPEN_LOOKUP} />
        <h3 className="ac-sub">What Opus looked up</h3>
        <ul className="ac-list">
          <li>Already in the skills: overlay style keys and roles, how a numeric <code>Year</code> is read, linking a map through <code>detail</code>.</li>
          <li>Partly there: which presets <code>linkCharts</code> sends from. The skill says "each selecting interaction" without listing them.</li>
          <li>Missing from the chart skill: which presets a Choropleth supports; that the world map geometry is fetched at run time; what a theme does with more categories than its palette (only in the theme skill).</li>
        </ul>
      </section>

      <section className="ac-block">
        <h2>Earlier: four requests in one session</h2>
        <p className="ac-note">
          Build, Economist style, box select, then a fourth change, in one session. Flint used the library and skills
          with lookups allowed. Lines are the whole session's +/−.
        </p>
        {FOUR_TURNS.map(({ dataset, rows }) => (
          <div key={dataset} className="ac-four">
            <h3 className="ac-sub">{dataset}</h3>
            <ResultTable rows={rows} adaptLabel="Session: lines +/−" showCalls={false} />
          </div>
        ))}
      </section>

      <section className="ac-block">
        <h2>Method</h2>
        <h3 className="ac-sub">Setup</h3>
        <ul className="ac-list">
          <li>Agent: GitHub Copilot CLI in non-interactive mode, one fresh session per approach and model, both turns in that session. Models: Claude Opus 5.5 and Claude Haiku 5.5.</li>
          <li>Sandbox: a new folder with only the data file (and for Flint, the vendored flint-chart 1.0.0 bundle, a 23-line <code>starter.html</code> showing the import map, and the chart, interaction and theme author skills under <code>.github/skills</code>, loaded on demand). No custom instructions, no MCP servers.</li>
          <li>Tools: file view, search and edit for both; no shell and no sub-agents, so neither agent can run or open its page. The Flint arm also had web search, web fetch and GitHub code search switched off, matching its prompt.</li>
          <li>Verification asked of the agent: only "read over your code and double-check it" at the end of each turn.</li>
          <li>Data: UNESCO Institute for Statistics, SDG 4 bulk release (February 2026, CC BY-SA 3.0 IGO), modelled upper secondary completion rates for 164 countries, 2000–2025, both sexes and by sex, with ISO numeric map ids and SDG regions.</li>
        </ul>

        <h3 className="ac-sub">Prompts (verbatim)</h3>
        <p className="ac-label">Turn 1 · build</p>
        <blockquote className="ac-prompt">{BUILD_PROMPT}</blockquote>
        <p className="ac-label"><code>{'{HOW}'}</code> for D3</p>
        <blockquote className="ac-prompt">{HOW_D3}</blockquote>
        <p className="ac-label"><code>{'{HOW}'}</code> for Flint</p>
        <blockquote className="ac-prompt">{HOW_FLINT}</blockquote>
        <p className="ac-label">Turn 2 · adapt</p>
        <blockquote className="ac-prompt">{ADAPT_PROMPT}</blockquote>

        <h3 className="ac-sub">Measures</h3>
        <ul className="ac-list">
          <li>Time: wall clock per turn. Tokens, model calls and cost: the session's usage events. Cost is Copilot's AIU, which follows the price-weighted tokens (cache reads about 0.1× input, cache writes 1.25×, output 5×).</li>
          <li>Code: the sandbox is a git repository committed after each turn; lines are that turn's diff of <code>dashboard.html</code>.</li>
          <li>Quality is not scored. Each turn's page is opened in headless Chrome, screenshotted, then screenshotted again after the turn's gesture (click a country's table row; after the adapt turn, drag a box over the scatter's lower-left points) for a person to compare.</li>
        </ul>

        <h3 className="ac-sub">Caveats</h3>
        <ul className="ac-list">
          <li>One run per cell. Across our runs the same cell's cost varied by about ±30%; the time and token gaps in the main result are larger than that, the cost gaps are not by much.</li>
          <li>The skills-only instruction is given to Flint alone. D3 needs no reference, as it is in the models' training; Flint is not. Skills-only measures the language and its docs; the open-lookup run shows an agent left alone with a new library.</li>
          <li>Flint was built from this repository, including fixes made while running these comparisons (links from presets mounted in code, world maps keyed by ISO numbers, currency axis labels, diverging theme ramps) and skill corrections.</li>
        </ul>

        <h3 className="ac-sub">Reproduce</h3>
        <pre className="ac-code-block">{`npm run build
talk/demo/prepare.sh            # data, vendored flint-chart bundle, skills
PROMPTS=talk/demo/prompts-uis3.json talk/demo/run.sh d3  claude-opus-5.5  uis3-d3-opus
PROMPTS=talk/demo/prompts-uis3.json talk/demo/run.sh lib claude-opus-5.5  uis3-lib-opus
node talk/demo/render-d3.mjs    # screenshots, before and after each turn's gesture
python3 talk/demo/metrics.py    # time, tokens, cost and lines per turn`}</pre>
      </section>
    </div>
  );
}
