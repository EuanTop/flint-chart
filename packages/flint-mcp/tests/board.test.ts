import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BOARD_VIEW_RESOURCE_URI, createServer } from '../src/server.js';

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
const boardIdOf = (result: any): string => result._meta.flint.board.id;

async function read(boardId: string, version?: number): Promise<any> {
  const result: any = await client.callTool({ name: 'read_board', arguments: { board_id: boardId, ...(version ? { version } : {}) } });
  return result.structuredContent;
}

describe('board tools', () => {
  it('create_board opens the board view with every valid chart and reports each link', async () => {
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: { title: 'Countries', charts: [scatter, bars], links: [{ from: 'countries', to: ['by-country'], field: 'country' }] },
    });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain('2 charts (countries, by-country)');
    expect(text(result)).toContain('## countries');
    expect(text(result)).toContain('✓ countries → by-country on country');
    const board = result._meta.flint.board;
    expect(board.charts.map((chart: any) => chart.id)).toEqual(['countries', 'by-country']);
    expect(board.version).toBe(1);

    const { tools } = await client.listTools();
    const create = tools.find((tool) => tool.name === 'create_board') as any;
    const readTool = tools.find((tool) => tool.name === 'read_board') as any;
    expect(create._meta.ui.resourceUri).toBe(BOARD_VIEW_RESOURCE_URI);
    expect(readTool._meta.ui.visibility).toEqual(['app']);
  });

  it('flags a link whose source cannot select or whose field is missing', async () => {
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: {
        charts: [scatter, bars],
        links: [
          { from: 'by-country', to: ['countries'], field: 'country' },
          { from: 'countries', to: ['by-country'], field: 'continent' },
        ],
      },
    });
    expect(text(result)).toContain('✗ by-country → countries on country: "by-country" has no interaction that selects marks');
    expect(text(result)).toContain('✗ countries → by-country on continent: "countries" has no field continent in its data.');
  });

  it('flags a link target whose marks do not carry the link field', async () => {
    const clickable = { ...bars, interaction_spec: { interactions: [{ type: 'click-highlight' }] } };
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: { charts: [scatter, clickable], links: [{ from: 'by-country', to: ['countries'], field: 'country' }] },
    });
    expect(text(result)).toContain('✗ by-country → countries on country: "countries" cannot emphasize marks by country');
    const detailed = { ...scatter, chart_spec: { ...scatter.chart_spec, encodings: { ...scatter.chart_spec.encodings, detail: 'country' } } };
    const fixed: any = await client.callTool({
      name: 'create_board',
      arguments: { charts: [detailed, clickable], links: [{ from: 'by-country', to: ['countries'], field: 'country' }] },
    });
    expect(text(fixed)).toContain('✓ by-country → countries on country');
  });

  it('leaves a chart with errors off the board and says why', async () => {
    const result: any = await client.callTool({
      name: 'create_board',
      arguments: { charts: [scatter, { ...bars, chart_spec: { ...bars.chart_spec, chartType: 'Not A Chart' } }] },
    });
    expect(text(result)).toContain('1 chart (countries)');
    expect(text(result)).toMatch(/## by-country\n✗ not drawn: /);
  });

  it('add_chart, update_chart, remove_chart and update_board change the board in place and bump its version', async () => {
    const created: any = await client.callTool({ name: 'create_board', arguments: { charts: [scatter] } });
    const id = boardIdOf(created);
    expect((await read(id, 1)).board).toBeUndefined();

    const added: any = await client.callTool({ name: 'add_chart', arguments: { board_id: id, chart: bars } });
    expect(text(added)).toContain('2 charts (countries, by-country)');
    expect(added._meta).toBeUndefined();
    const afterAdd = await read(id, 1);
    expect(afterAdd.version).toBe(2);
    expect(afterAdd.board.charts).toHaveLength(2);

    const duplicate: any = await client.callTool({ name: 'add_chart', arguments: { board_id: id, chart: bars } });
    expect(duplicate.isError).toBe(true);

    const updated: any = await client.callTool({
      name: 'update_chart',
      arguments: { board_id: id, chart_id: 'by-country', chart_spec: { ...bars.chart_spec, title: 'Income by country' } },
    });
    expect(text(updated)).toContain('Chart "Income by country"');
    const afterUpdate = await read(id);
    const chart = afterUpdate.board.charts.find((entry: any) => entry.id === 'by-country');
    expect(chart.input.chart_spec.title).toBe('Income by country');
    expect(chart.input.data.values).toHaveLength(4);

    const broken: any = await client.callTool({
      name: 'update_chart',
      arguments: { board_id: id, chart_id: 'by-country', chart_spec: { ...bars.chart_spec, chartType: 'Not A Chart' } },
    });
    expect(text(broken)).toContain('✗ not drawn');
    expect((await read(id)).board.charts[1].input.chart_spec.title).toBe('Income by country');

    await client.callTool({ name: 'update_board', arguments: { board_id: id, order: ['by-country'], links: [{ from: 'countries', to: ['by-country'], field: 'country' }] } });
    const reordered = await read(id);
    expect(reordered.board.charts.map((entry: any) => entry.id)).toEqual(['by-country', 'countries']);

    await client.callTool({ name: 'remove_chart', arguments: { board_id: id, chart_id: 'by-country' } });
    const removed = await read(id);
    expect(removed.board.charts.map((entry: any) => entry.id)).toEqual(['countries']);
    expect(removed.board.links).toEqual([]);
  });

  it('tells the model to create a board when the id is unknown', async () => {
    const result: any = await client.callTool({ name: 'add_chart', arguments: { board_id: 'board-missing', chart: bars } });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain('Call create_board');
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
    const themed: any = await client.callTool({ name: 'update_board', arguments: { board_id: id, title: 'Countries', subtitle: 'GDP and life expectancy', theme_spec: 'economist' } });
    expect(text(themed)).toContain('Charts set their own themes');
    expect((await read(id)).board.theme_spec).toBe('economist');
    expect((await read(id)).board.charts.find((chart: any) => chart.id === 'countries').input.theme_spec).toBeUndefined();

    const narrowed: any = await client.callTool({ name: 'update_chart', arguments: { board_id: id, chart_id: 'trend', layout: { span: 1, height: 'compact' } } });
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

    const stale: any = await client.callTool({ name: 'set_board_layout', arguments: { board_id: id, version: 7, grid } });
    expect(stale.isError).toBe(true);
    const clash: any = await client.callTool({ name: 'set_board_layout', arguments: { board_id: id, version: 1, grid: [grid[0], { ...grid[1], y: 5 }] } });
    expect(text(clash)).toContain('overlaps another chart');
    const missing: any = await client.callTool({ name: 'set_board_layout', arguments: { board_id: id, version: 1, grid: [grid[0]] } });
    expect(text(missing)).toContain('no place for countries');

    const saved: any = await client.callTool({ name: 'set_board_layout', arguments: { board_id: id, version: 1, grid } });
    expect(saved.structuredContent.board.grid).toEqual(grid);
    expect(saved.structuredContent.version).toBe(2);

    const added: any = await client.callTool({ name: 'add_chart', arguments: { board_id: id, chart: { ...bars, id: 'more' } } });
    expect(text(added)).toContain('Arranged by the reader');
    expect(text(added)).toContain('- by-country: columns 1–12, rows 1–17 (full width, 340px tall)');
    expect(text(added)).toContain('- more: columns 1–6, rows 35–51');
    const retitled: any = await client.callTool({ name: 'update_chart', arguments: { board_id: id, chart_id: 'more', chart_spec: { ...bars.chart_spec, title: 'More' } } });
    expect(text(retitled)).toContain('Arranged by the reader');

    const removed: any = await client.callTool({ name: 'remove_chart', arguments: { board_id: id, chart_id: 'more' } });
    expect(text(removed)).not.toContain('- more:');
    const relaid: any = await client.callTool({ name: 'update_chart', arguments: { board_id: id, chart_id: 'countries', layout: { span: 2 } } });
    expect(text(relaid)).toContain("The reader's arrangement was dropped: layout on countries");
    expect((await read(id)).board.grid).toBeUndefined();
  });

  it('serves the board view as the chart bundle marked for the board', async () => {
    const { contents } = await client.readResource({ uri: BOARD_VIEW_RESOURCE_URI });
    expect(contents[0].mimeType).toContain('mcp-app');
  });
});
