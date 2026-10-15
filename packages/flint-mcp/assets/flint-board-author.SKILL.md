---
name: flint-board-author
description: "Use when: several Flint charts should be read together in one view: a dashboard, KPI tiles over a trend, a side-by-side comparison, an overview with its detail; or a board on screen should change (add, retitle, resize, relink a chart). Produce one create_board call whose headline, chart choice, layout and links are decided, then refine it from the report."
---

# flint-board: several charts, one view

A board is one live card that holds several Flint charts under one headline.
The agent writes it with `create_board`, then changes the same card with
`add_chart`, `update_chart`, `remove_chart` and `update_board`; a new
`create_board` opens a second card, so it is only for a second board.

Each chart on a board is a full chart spec (`flint-chart-author`), plus an
`id` and a `layout`. This skill covers what a board adds: the headline, which
charts, where they sit, how they connect, and how they look as one piece.

Work through the steps in order. A board is done when the `create_board`
report shows no `✗` and its `Review:` section is empty or says only that a
colour field is shared.

## Step 1 — write the headline

The board's `title` is what the reader takes away, or what the board is for,
in one line. Its `subtitle` is the deck: the data, its scope, period and
units. `source` is the footer: where the data comes from and when.

```
title:    "Europe carried the third-quarter recovery"
subtitle: "Monthly revenue by region and product line, Jan–Sep 2025, $m"
source:   "Source: finance ledger, closed books to 30 Sep 2025"
```

A monitoring board with no single finding names its purpose instead:
`"Operations at a glance"`. The card draws the title largest, so it is the
first thing read; every board gets one.

## Step 2 — choose the charts

Start from the questions the reader brings, one chart per question, and keep
the board to the charts that answer them: three to five KPI tiles and up to
six charts. More than that is two boards.

| The reader asks | Chart |
|---|---|
| How are we doing on the numbers we steer by? | `KPI Card` per number, with `goal` when there is a target |
| How did it move over time? | `Line Chart` (few series), `Area Chart` (parts of a total) |
| Which is largest, how do they rank? | `Bar Chart` sorted by value, `Bar Table` for many rows with labels |
| What is it made of? | `Stacked Bar Chart`, or `Pie Chart` with `innerRadius` for up to five parts |
| How do two measures relate? | `Scatter Plot` |
| Where? | `Choropleth`, `Map` |
| How is it spread? | `Histogram`, `Boxplot` |
| Each series' trend at a glance | `Sparkline` |

Pick the lead chart, the one the headline is about, and put it first after the
KPI tiles. The charts after it explain it: a breakdown, a ranking, a relation.

Give each chart its own data, aggregated to what it draws. A KPI tile takes
one row: `{ metric, value, goal }`. It prints `value` as given and draws
progress only when `value` and `goal` are both numbers, so pass them in the
units the reader reads and name the unit in `metric`:
`{ "metric": "Gross margin, %", "value": 37.8, "goal": 40 }`.

## Step 3 — give each chart a heading

The card lifts each chart's `chart_spec.title` and `subtitle` out of the chart
and sets them as the cell's heading, in the board's type. Write the title as
that chart's own finding, short enough for one line at half width, and the
subtitle as its units:

```
title:    "Europe climbed every month after the April dip"
subtitle: "Revenue by region, $m"
```

A `KPI Card` names itself with its `metric` field and needs no title.

## Step 4 — place them

The board is a grid of `columns` (default 2 once it has two charts that are
not KPI tiles). Charts fill rows in the order given:

- **KPI Cards in a row** share one row, up to four; a short row spreads its tiles.
- **`layout.span`** is how many columns a chart takes. Time series, maps and
  Gantt charts take the full row by default; everything else takes one column.
  A row left short stretches to the full width.
- **`layout.height`** is `compact` (~130 px), `standard` (~280 px, the default)
  or `tall` (~420 px). A row takes its tallest chart's height, so the plots of
  a row line up. A time series alone in its row defaults to `tall`: Flint
  banks a line toward readable slopes, and the height is what lets it spread
  across the width.

| Shape | Layout |
|---|---|
| KPI row, lead trend, two explaining charts | tiles; trend (full row); two charts (one column each) |
| Side-by-side comparison | `columns: 2`, both charts `span: 1`, same height |
| Overview with its detail | detail `span: 2, height: tall`; overview strip below it `height: compact` |
| Many small series | one `Sparkline` chart, `height: compact` or `standard` |

On a narrow card each chart takes its own row; the layout needs no second version.

## Step 5 — connect them

A link makes a selection on one chart emphasize the matching marks on others:
`{ from, to: [...], field }`. Link only where the reader's next question is
"and where is that over there?", usually from the chart that splits by a
category to the charts that show the same category.

Each link needs:

- **A selecting interaction on `from`**, in its `interaction_spec`, by chart:

  | Chart | Interaction |
  |---|---|
  | Bar, Stacked Bar, Pie, Heatmap | `click-highlight` |
  | Line | `click-group-focus` (a series), `brush-x` (a period) |
  | Scatter Plot | `select` (drag a region) |

- **`field` on every `to` chart's marks.** Marks match only on fields the chart
  encodes. When a chart shows the field nowhere else, encode it on `detail`
  (`encodings.detail: "product"`); the report's `✗` on a link names the fix.

Links can run both ways; a selection does not bounce back.

Colour does the quiet linking: charts that colour by the same field (on
`color`, or `group` on a grouped bar chart) get one value order, so a value
keeps one colour across the board. Colour each chart
by the same field as the others when it shows the same categories, and give
it the same set of values, since a chart missing a value shifts the colours
after it.

## Step 6 — theme the board once

Set `theme_spec` on the board, not on the charts. Every chart takes it, and
the card takes its paper, ink and type for the headline, headings and footer;
a theme's branding mark (the Economist's red tab) is drawn once, above the
headline. Pick it with `list_themes` as for one chart.

## Step 7 — read the report and refine

`create_board` and every later call return the board as the model must judge
it:

- `Layout:` the rows as the card draws them. Check that the lead chart sits
  where the headline points and no row holds an orphan.
- `## <id>` per chart: its encodings and each update op, `✓` or `✗`.
- `Links:` each link, `✓` or `✗` with the fix.
- `Review:` what the board should still fix: a missing headline, deck or chart
  title, too many tiles or charts, themes set per chart.

Fix each `✗` and each review note with the narrowest call: `update_chart` for
one chart (pass only the fields that change), `update_board` for the headline,
theme, columns, order or links, `remove_chart` for a chart the board does not
need. Each redraws the same card.

What the reader then does on the board (selections, link emphasis) reaches the
model with their next message, one section per chart.

The reader can also arrange the board: **Edit layout** lets them move a chart,
swap two, and resize one on a 12-column grid. Their arrangement then replaces the
rows: `Layout:` reads "Arranged by the reader" and lists each chart's columns and
rows. Keep it. `add_chart` places a new chart below it and `update_chart` keeps
it; `layout` on a chart, or `columns` or `order` on the board, drops it and lays
the board out in rows again, so pass those only when the user asks for a new
layout.

## Worked example

```json
{
  "title": "Europe carried the third-quarter recovery",
  "subtitle": "Monthly revenue by region and product line, Jan–Sep 2025, $m",
  "source": "Source: finance ledger, closed books to 30 Sep 2025",
  "theme_spec": "economist",
  "charts": [
    { "id": "k-revenue", "data": { "values": [{ "metric": "Revenue, Q3 ($m)", "value": 38.6, "goal": 36 }] },
      "chart_spec": { "chartType": "KPI Card", "encodings": { "metric": "metric", "value": "value", "goal": "goal" } } },
    { "id": "k-margin", "data": { "values": [{ "metric": "Gross margin, %", "value": 37, "goal": 40 }] },
      "chart_spec": { "chartType": "KPI Card", "encodings": { "metric": "metric", "value": "value", "goal": "goal" } } },
    { "id": "trend", "data": { "url": "./flint-data/revenue-by-month.csv" },
      "semantic_types": { "month": "YearMonth", "region": "Category", "revenue": "Amount" },
      "chart_spec": { "chartType": "Line Chart", "title": "Europe climbed every month after the April dip",
        "subtitle": "Revenue by region, $m", "encodings": { "x": "month", "y": "revenue", "color": "region" } },
      "interaction_spec": { "interactions": [{ "type": "click-group-focus" }] } },
    { "id": "by-product", "data": { "url": "./flint-data/revenue-by-product.csv" },
      "semantic_types": { "product": "Category", "region": "Category", "revenue": "Amount" },
      "chart_spec": { "chartType": "Bar Chart", "title": "Analytics leads in every region",
        "subtitle": "Revenue by product, Jan–Sep, $m", "encodings": { "y": "product", "x": "revenue", "color": "region" } },
      "interaction_spec": { "interactions": [{ "type": "click-highlight" }] } },
    { "id": "margin", "data": { "url": "./flint-data/revenue-by-product.csv" },
      "semantic_types": { "product": "Category", "region": "Category", "revenue": "Amount", "margin": "Percentage" },
      "chart_spec": { "chartType": "Scatter Plot", "title": "Security earns the widest margin",
        "subtitle": "Revenue vs gross margin, by product and region",
        "encodings": { "x": "revenue", "y": "margin", "color": "region", "detail": "product" } } }
  ],
  "links": [
    { "from": "by-product", "to": ["margin"], "field": "product" },
    { "from": "trend", "to": ["by-product", "margin"], "field": "region" }
  ]
}
```

Rows: two KPI tiles; the trend across the row, tall; the bar chart and the
scatter side by side. A click on a product's bar lights its points on the
scatter; a click on a region's line lights its segments and points on both.

## Checklist

- [ ] `title` says the finding or the purpose; `subtitle` says data, scope, period, units; `source` is set.
- [ ] Three to five KPI tiles at most, up to six charts, the lead chart first after the tiles.
- [ ] Every chart but a KPI tile has a one-line `title` and a units `subtitle`.
- [ ] `layout` set where the default is wrong: the lead chart wide, a comparison at equal spans and heights.
- [ ] Every link's `from` has a selecting interaction; every `to` encodes `field`.
- [ ] `theme_spec` on the board only.
- [ ] The report has no `✗` and no review note left but the shared colour field.
