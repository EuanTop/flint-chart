import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VIEW_RESOURCE_URI, createServer } from '../src/server.js';

const rows = [
  { country: 'Japan', region: 'Asia', gdp: 4.2, life: 84 },
  { country: 'India', region: 'Asia', gdp: 3.7, life: 70 },
  { country: 'France', region: 'Europe', gdp: 3.0, life: 82 },
  { country: 'Brazil', region: 'Americas', gdp: 2.1, life: 76 },
];

const scatter = {
  id: 'countries',
  data: { values: rows },
  semantic_types: { country: 'Country', region: 'Category', gdp: 'Quantity', life: 'Quantity' },
  chart_spec: { chartType: 'Scatter Plot', title: 'Wealth and health', encodings: { x: 'gdp', y: 'life', color: 'region' } },
  interaction_spec: { interactions: [{ type: 'select' }] },
};

const bars = {
  id: 'by-country',
  data: { values: rows },
  semantic_types: { country: 'Country', gdp: 'Quantity' },
  chart_spec: { chartType: 'Bar Chart', title: 'GDP by country', encodings: { x: 'country', y: 'gdp' } },
};

let client: Client;
let server: McpServer;

beforeAll(async () => {
  server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: 'flint-board-test', version: '0.0.0' });
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client?.close();
  await server?.close();
});

const text = (result: any): string => result.content[0].text;
const boardIdOf = (result: any): string => text(result).match(/^Board (board-[0-9a-f]+)/)![1];

/** The board as show hands it to its card. */
async function shown(boardId: string): Promise<any> {
  const result: any = await client.callTool({ name: 'show', arguments: { id: boardId } });
  return result._meta.flint.board;
}

describe('board tools', () => {
  it('create_board opens the board view with every valid chart and reports what each chart links', async () => {
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: { title: 'Countries', charts: [scatter, bars], link_spec: { fields: ['country', 'region'] } },
    });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain('2 charts (countries, by-country)');
    expect(text(result)).toContain('## countries');
    expect(text(result)).toContain('Links (fields: country, region; one selection the whole board shares):');
    expect(text(result)).toContain('✓ countries: sends region by select; receives region; leaves out country: its marks do not carry country');
    expect(text(result)).toContain('✓ by-country: receives country; leaves out region: its marks do not carry region');
    expect(text(result)).toContain('sends nothing: no interaction that selects');
    expect(result._meta).toBeUndefined();
    const board = await shown(boardIdOf(result));
    expect(board.charts.map((chart: any) => chart.id)).toEqual(['countries', 'by-country']);
    expect(board.linked['by-country']).toMatchObject({ sends: [], receives: ['country'] });
    expect(board.version).toBe(1);

    const { tools } = await client.listTools();
    for (const name of ['create_board', 'add_chart', 'update_chart', 'remove_chart', 'update_board']) {
      expect((tools.find((entry) => entry.name === name) as any)._meta?.ui).toBeUndefined();
    }
    const show = tools.find((tool) => tool.name === 'show') as any;
    expect(show._meta.ui.resourceUri).toBe(VIEW_RESOURCE_URI);
    expect(show._meta.ui.visibility).toBeUndefined();
    const restore = tools.find((tool) => tool.name === 'restore_board') as any;
    expect(restore._meta.ui.visibility).toEqual(['app']);
  });

  it('marks a chart that joins no field, honours receive: false, and names an unknown chart', async () => {
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: { charts: [scatter, bars], link_spec: { fields: ['continent', 'region'], charts: { countries: { receive: false }, ghost: {} } } },
    });
    expect(text(result)).toContain('✓ countries: sends region by select; leaves out continent: no field continent in its data; receives nothing (receive: false)');
    expect(text(result)).toContain('✗ by-country: not linked; leaves out continent');
    expect(text(result)).toContain('✗ ghost: not linked; no chart "ghost" among the linked charts');
  });

  it('links a chart once its marks carry the field', async () => {
    const clickable = { ...bars, interaction_spec: { interactions: [{ type: 'click-highlight' }] } };
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: { charts: [scatter, clickable], link_spec: { fields: ['country'] } },
    });
    expect(text(result)).toContain('✗ countries: not linked; leaves out country: its marks do not carry country; encode it, on detail');
    const detailed = { ...scatter, chart_spec: { ...scatter.chart_spec, encodings: { ...scatter.chart_spec.encodings, detail: 'country' } } };
    const fixed: any = await client.callTool({
      name: 'create_board',
      arguments: { charts: [detailed, clickable], link_spec: { fields: ['country'] } },
    });
    expect(text(fixed)).toContain('✓ countries: sends country by select; receives country');
    expect(text(fixed)).toContain('✓ by-country: sends country by click-highlight; receives country');

    const hovering = { ...detailed, interaction_spec: { interactions: [{ type: 'select' }, { type: 'hover-group-focus', options: { groupBy: 'region' } }] } };
    const both: any = await client.callTool({
      name: 'create_board',
      arguments: { charts: [hovering, clickable], link_spec: { fields: ['country', 'region'] } },
    });
    expect(text(both)).toContain('✓ countries: sends country + region by select, region by hover-group-focus (hover); receives country, region');
    expect((await shown(boardIdOf(both))).linked.countries.gestures['hover-group-focus']).toEqual({ preset: 'hover-group-focus', fields: ['region'], hover: true });
  });

  it('leaves a chart with errors off the board and says why', async () => {
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: { charts: [scatter, { ...bars, chart_spec: { ...bars.chart_spec, chartType: 'Not A Chart' } }] },
    });
    expect(text(result)).toContain('1 chart (countries)');
    expect(text(result)).toMatch(/## by-country\n✗ not drawn: /);
  });

  it('add_chart, update_chart, remove_chart and update_board change the board off screen, and show shows its current version', async () => {
    const created: any = await client.callTool({ name: 'create_board', arguments: { charts: [scatter] } });
    const id = boardIdOf(created);
    expect(text(created)).toContain('Version 1, not on screen yet');
    const first = await shown(id);

    const added: any = await client.callTool({ name: 'add_chart', arguments: { id: id, chart: bars } });
    expect(text(added)).toContain('2 charts (countries, by-country)');
    expect(text(added)).toContain('Version 2, not on screen yet');
    expect(added._meta).toBeUndefined();
    const show: any = await client.callTool({ name: 'show', arguments: { id: id } });
    expect(text(show)).toContain(`Board ${id} version 2 is on screen in a new card`);
    expect(show._meta.flint.board.charts).toHaveLength(2);
    expect(first.charts).toHaveLength(1);

    const duplicate: any = await client.callTool({ name: 'add_chart', arguments: { id: id, chart: bars } });
    expect(duplicate.isError).toBe(true);

    const updated: any = await client.callTool({
      name: 'update_chart',
      arguments: { id: id, chart_id: 'by-country', chart_spec: { ...bars.chart_spec, title: 'Income by country' } },
    });
    expect(text(updated)).toContain('Chart "Income by country"');
    const chart = (await shown(id)).charts.find((entry: any) => entry.id === 'by-country');
    expect(chart.input.chart_spec.title).toBe('Income by country');
    expect(chart.input.data.values).toHaveLength(4);

    const broken: any = await client.callTool({
      name: 'update_chart',
      arguments: { id: id, chart_id: 'by-country', chart_spec: { ...bars.chart_spec, chartType: 'Not A Chart' } },
    });
    expect(text(broken)).toContain('✗ not drawn');
    expect((await shown(id)).charts[1].input.chart_spec.title).toBe('Income by country');

    const reordered: any = await client.callTool({ name: 'update_board', arguments: { id: id, order: ['by-country'], link_spec: { fields: ['country'], charts: { 'by-country': { send: false } } } } });
    expect((await shown(id)).charts.map((entry: any) => entry.id)).toEqual(['by-country', 'countries']);

    const removed: any = await client.callTool({ name: 'remove_chart', arguments: { id: id, chart_id: 'by-country' } });
    expect((await shown(id)).charts.map((entry: any) => entry.id)).toEqual(['countries']);
    expect((await shown(id)).link_spec).toEqual({ fields: ['country'], charts: {} });
    expect(Object.keys((await shown(id)).linked)).toEqual(['countries']);
  });

  it('tells the model to create a board when the id is unknown', async () => {
    const result: any = await client.callTool({ name: 'add_chart', arguments: { id: 'board-missing', chart: bars } });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain('Call create_chart or create_board to build it again, then show.');
  });

  it('reports the layout and what the board should still fix', async () => {
    const kpi = (id: string, metric: string) => ({ id, data: { values: [{ metric, value: 3, goal: 2 }] }, chart_spec: { chartType: 'KPI Card', encodings: { metric: 'metric', value: 'value', goal: 'goal' } } });
    const trend = {
      id: 'trend',
      data: { values: rows.map((row, at) => ({ ...row, year: 2020 + at })) },
      chart_spec: { chartType: 'Line Chart', encodings: { x: 'year', y: 'gdp', color: 'region' } },
    };
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: { charts: [kpi('k1', 'Sales'), kpi('k2', 'Margin'), kpi('k3', 'Churn'), trend, scatter, { ...bars, theme_spec: 'nyt' }] },
    });
    const report = text(result);
    expect(report).toContain('- row 1, KPI tiles (compact): k1 (a third), k2 (a third), k3 (a third)');
    expect(report).toContain('- row 2 (tall): trend (full width)');
    expect(report).toContain('- row 3 (standard): countries (half), by-country (half)');
    expect(report).toContain('- No board title');
    expect(report).toContain('- No title on trend:');
    expect(report).toContain('- trend, countries colour by region');

    const id = boardIdOf(result);
    const themed: any = await client.callTool({ name: 'update_board', arguments: { id: id, title: 'Countries', subtitle: 'GDP and life expectancy', theme_spec: 'economist' } });
    expect(text(themed)).toContain('Charts set their own themes');
    expect((await shown(id)).theme_spec).toBe('economist');
    expect((await shown(id)).charts.find((chart: any) => chart.id === 'countries').input.theme_spec).toBeUndefined();

    const narrowed: any = await client.callTool({ name: 'update_chart', arguments: { id: id, chart_id: 'trend', layout: { span: 1, height: 'compact' } } });
    expect(text(narrowed)).toContain('- row 2 (standard): trend (half), countries (half)');
  });

  it('splits five KPI tiles three and two, and leaves a measure on colour alone', async () => {
    const kpi = (id: string) => ({ id, data: { values: [{ metric: id, value: 1 }] }, chart_spec: { chartType: 'KPI Card', encodings: { metric: 'metric', value: 'value' } } });
    const heat = (id: string) => ({
      id,
      data: { values: rows.map((row) => ({ ...row, year: '2025' })) },
      chart_spec: { chartType: 'Heatmap', title: id, encodings: { x: 'year', y: 'country', color: 'gdp' } },
    });
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: { title: 'T', subtitle: 'S', charts: [kpi('a'), kpi('b'), kpi('c'), kpi('d'), kpi('e'), heat('h1'), heat('h2')] },
    });
    const report = text(result);
    expect(report).toContain('- row 1, KPI tiles (compact): a (a third), b (a third), c (a third)');
    expect(report).toContain('- row 2, KPI tiles (compact): d (half), e (half)');
    expect(report).not.toContain('colour by gdp');
  });

  it('keeps the arrangement the reader saves until the agent sets the rows again', async () => {
    const created: any = await client.callTool({ name: 'create_board', arguments: { title: 'T', subtitle: 'S', charts: [scatter, bars] } });
    const id = boardIdOf(created);
    const grid = [{ id: 'by-country', x: 0, y: 0, w: 12, h: 17 }, { id: 'countries', x: 0, y: 17, w: 6, h: 17 }];

    const stale: any = await client.callTool({ name: 'set_board_layout', arguments: { id: id, version: 7, grid } });
    expect(stale.isError).toBe(true);
    const clash: any = await client.callTool({ name: 'set_board_layout', arguments: { id: id, version: 1, grid: [grid[0], { ...grid[1], y: 5 }] } });
    expect(text(clash)).toContain('overlaps another chart');
    const missing: any = await client.callTool({ name: 'set_board_layout', arguments: { id: id, version: 1, grid: [grid[0]] } });
    expect(text(missing)).toContain('no place for countries');

    const saved: any = await client.callTool({ name: 'set_board_layout', arguments: { id: id, version: 1, grid } });
    expect(saved.structuredContent.board.grid).toEqual(grid);
    expect(saved.structuredContent.version).toBe(1);

    const added: any = await client.callTool({ name: 'add_chart', arguments: { id: id, chart: { ...bars, id: 'more' } } });
    expect(text(added)).toContain('Arranged by the reader');
    expect(text(added)).toContain('- by-country: columns 1–12, rows 1–17 (full width, 340px tall)');
    expect(text(added)).toContain('- more: columns 1–6, rows 35–51');
    const retitled: any = await client.callTool({ name: 'update_chart', arguments: { id: id, chart_id: 'more', chart_spec: { ...bars.chart_spec, title: 'More' } } });
    expect(text(retitled)).toContain('Arranged by the reader');

    const removed: any = await client.callTool({ name: 'remove_chart', arguments: { id: id, chart_id: 'more' } });
    expect(text(removed)).not.toContain('- more:');
    const relaid: any = await client.callTool({ name: 'update_chart', arguments: { id: id, chart_id: 'countries', layout: { span: 2 } } });
    expect(text(relaid)).toContain("The reader's arrangement was dropped: layout on countries");
    expect((await shown(id)).grid).toBeUndefined();
  });

  it('holds a Table of rows and a chart opened as its table, and a change of view keeps the reader\'s arrangement', async () => {
    const table = { id: 'list', data: { values: rows }, chart_spec: { chartType: 'Table', title: 'Countries', encodings: {} } };
    const created: any = await client.callTool({
      name: 'create_board',
      arguments: { title: 'T', subtitle: 'S', charts: [table, { ...bars, view: 'table' }], link_spec: { fields: ['country'] } },
    });
    expect(text(created)).toContain('Opens as the table of the rows it draws');
    expect(text(created)).toContain('list: receives country');
    const id = boardIdOf(created);
    expect((await shown(id)).charts.map((chart: any) => chart.view)).toEqual([undefined, 'table']);

    const grid = [{ id: 'list', x: 0, y: 0, w: 12, h: 17 }, { id: 'by-country', x: 0, y: 17, w: 6, h: 17 }];
    await client.callTool({ name: 'set_board_layout', arguments: { id: id, version: 1, grid } });
    const back: any = await client.callTool({ name: 'update_chart', arguments: { id: id, chart_id: 'by-country', view: 'chart' } });
    expect(text(back)).toContain('Arranged by the reader');
    const board = (await shown(id));
    expect(board.grid).toEqual(grid);
    expect(board.charts.find((chart: any) => chart.id === 'by-country').view).toBeUndefined();

    const encoded: any = await client.callTool({ name: 'add_chart', arguments: { id: id, chart: { ...table, id: 'bad', chart_spec: { chartType: 'Table', encodings: { x: 'country' } } } } });
    expect(text(encoded)).toContain('Table takes no encodings');
  });

  it('keeps the theme the reader picks until the agent sets the board\'s theme', async () => {
    const created: any = await client.callTool({ name: 'create_board', arguments: { title: 'T', subtitle: 'S', theme_spec: 'economist', charts: [scatter, bars] } });
    const id = boardIdOf(created);
    const picked: any = await client.callTool({ name: 'set_board_theme', arguments: { id: id, version: 1, theme: 'nyt' } });
    expect(picked.structuredContent.board.reader_theme).toEqual({ theme: 'nyt' });
    const added: any = await client.callTool({ name: 'add_chart', arguments: { id: id, chart: { ...bars, id: 'more' } } });
    expect(text(added)).toContain('The reader picked the theme nyt for every chart; keep it.');

    const plain: any = await client.callTool({ name: 'set_board_theme', arguments: { id: id, version: 2, theme: null } });
    expect(plain.structuredContent.board.reader_theme).toEqual({ theme: null });
    const back: any = await client.callTool({ name: 'set_board_theme', arguments: { id: id, version: 2, reset: true } });
    expect(back.structuredContent.board.reader_theme).toBeUndefined();

    await client.callTool({ name: 'set_board_theme', arguments: { id: id, version: 2, theme: 'swiss' } });
    const replaced: any = await client.callTool({ name: 'update_board', arguments: { id: id, theme_spec: 'datawrapper' } });
    expect(text(replaced)).toContain("The reader's theme (swiss) was replaced: theme_spec sets the board's theme again.");
    expect((await shown(id)).reader_theme).toBeUndefined();
  });

  it('keeps nothing a passed card sends, and tells it the newest version', async () => {
    const created: any = await client.callTool({ name: 'create_board', arguments: { title: 'T', subtitle: 'S', charts: [scatter] } });
    const id = boardIdOf(created);
    const first = await shown(id);
    await client.callTool({ name: 'add_chart', arguments: { id: id, chart: bars } });
    const theme: any = await client.callTool({ name: 'set_board_theme', arguments: { id: id, version: 1, theme: 'nyt' } });
    expect(theme.isError).toBe(true);
    expect(theme.structuredContent).toEqual({ version: 2 });
    const layout: any = await client.callTool({ name: 'set_board_layout', arguments: { id: id, version: 1, grid: null } });
    expect(layout.structuredContent).toEqual({ version: 2 });

    const held: any = await client.callTool({ name: 'restore_board', arguments: { board: first } });
    expect(held.structuredContent.version).toBe(2);
    expect(held.structuredContent.board.charts).toHaveLength(2);
  });

  it('flags a chart that stacks repeated rows as slices, and not once it sums them', async () => {
    const monthly = [1, 2, 3].flatMap((month) => rows.map((row) => ({ ...row, month })));
    const sliced = { id: 'sliced', data: { values: monthly }, chart_spec: { chartType: 'Bar Chart', title: 'GDP', encodings: { y: 'country', x: 'gdp', color: 'region' } } };
    const result: any = await client.callTool({ name: 'create_board', arguments: { title: 'T', subtitle: 'S', charts: [sliced] } });
    expect(text(result)).toContain('sliced draws 12 rows as 4 country × region groups, so each mark is a stack of slices, one per row: sum the rows first, or set encodings.x.aggregate to "sum"');
    const summed = { ...sliced, chart_spec: { ...sliced.chart_spec, encodings: { y: 'country', x: { field: 'gdp', aggregate: 'sum' }, color: 'region' } } };
    const fixed: any = await client.callTool({ name: 'create_board', arguments: { title: 'T', subtitle: 'S', charts: [summed] } });
    expect(text(fixed)).not.toContain('stack of slices');
  });

  it('takes back a board a restarted server lost, under its own id', async () => {
    const created: any = await client.callTool({ name: 'create_board', arguments: { title: 'T', subtitle: 'S', charts: [scatter, bars] } });
    const snapshot = await shown(boardIdOf(created));
    const restarted = createServer();
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await restarted.connect(serverSide);
    const fresh = new Client({ name: 'after-restart', version: '0.0.0' });
    await fresh.connect(clientSide);
    try {
      const lost: any = await fresh.callTool({ name: 'update_chart', arguments: { id: snapshot.id, chart_id: 'by-country', chart_spec: { ...bars.chart_spec, title: 'X' } } });
      expect(lost.isError).toBe(true);
      const back: any = await fresh.callTool({ name: 'restore_board', arguments: { board: snapshot } });
      expect(back.structuredContent.board.id).toBe(snapshot.id);
      const updated: any = await fresh.callTool({ name: 'update_chart', arguments: { id: snapshot.id, chart_id: 'by-country', chart_spec: { ...bars.chart_spec, title: 'X' } } });
      expect(updated.isError).toBeFalsy();
      expect(text(updated)).toContain('Chart "X"');
      const nothing: any = await fresh.callTool({ name: 'restore_board', arguments: { board: {} } });
      expect(nothing.isError).toBe(true);
    } finally {
      await fresh.close();
      await restarted.close();
    }
  });

  it('serves the board view as the chart bundle marked for the board', async () => {
    const { contents } = await client.readResource({ uri: VIEW_RESOURCE_URI });
    expect(contents[0].mimeType).toContain('mcp-app');
  });
});
