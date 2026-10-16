import type { ChartAssemblyInput } from 'flint-chart';
import { BASKET_SPEC, COUNTY_SPEC, RESIZE_CASES, SCORERS, TEAMS, TEAM_TYPES } from '../layout-plan-shared';
import classicDatasets from '../../data/classic-datasets.json';
import timeUse from '../../data/time-use-companions.json';

export interface Preset { id: string; label: string; input: ChartAssemblyInput }

const SORTED_TEAMS = [...TEAMS].sort((a, b) => b.Goals - a.Goals);

/** A dataset stored as column names and rows, as row objects. */
const tableRows = ({ columns, rows }: { columns: string[]; rows: unknown[][] }): Record<string, unknown>[] =>
  rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])));

export const PRESETS: Preset[] = [
  {
    id: 'teams',
    label: 'Bars · 16 teams, Datawrapper',
    input: {
      data: { values: SORTED_TEAMS.slice(0, 16) },
      semantic_types: TEAM_TYPES,
      theme_spec: { extends: 'datawrapper' },
      chart_spec: {
        chartType: 'Bar Chart',
        title: 'Goals per team',
        encodings: { x: 'Team', y: 'Goals', color: 'Confederation' },
        baseSize: { width: 520, height: 300 },
        canvasSize: { width: 520, height: 300 },
      },
    },
  },
  { id: 'basket', label: 'Stacked bars · 10 years, Datawrapper', input: BASKET_SPEC },
  ...RESIZE_CASES.map(({ id, label, spec }) => ({
    id,
    label,
    input: { ...spec, chart_spec: { ...spec.chart_spec, baseSize: { width: 520, height: 320 }, canvasSize: { width: 520, height: 320 } } },
  })),
  {
    id: 'facets',
    label: 'Facets · goals by confederation',
    input: {
      data: { values: SORTED_TEAMS },
      semantic_types: TEAM_TYPES,
      theme_spec: { extends: 'economist' },
      chart_spec: {
        chartType: 'Bar Chart',
        title: 'Goals per team by confederation',
        encodings: { x: 'Team', y: 'Goals', column: 'Confederation' },
        baseSize: { width: 720, height: 360 },
        canvasSize: { width: 720, height: 360 },
      },
    },
  },
  { id: 'county', label: 'Bars · 3 000 counties (overflow)', input: { ...COUNTY_SPEC, chart_spec: { ...COUNTY_SPEC.chart_spec, canvasSize: { width: 520, height: 300 }, baseSize: { width: 520, height: 300 } } } },
  {
    id: 'basket-tight',
    label: 'Stacked bars · tight box (canvas fit)',
    input: { ...BASKET_SPEC, theme_spec: 'nyt', chart_spec: { ...BASKET_SPEC.chart_spec, baseSize: { width: 320, height: 220 }, canvasSize: { width: 320, height: 220 } } },
  },
  {
    id: 'keys',
    label: 'Scatter · colour and size keys',
    input: {
      data: { values: tableRows(classicDatasets.autoMpg) },
      semantic_types: { Horsepower: 'Quantity', MPG: 'Quantity', Origin: 'Category', 'Model year': 'Year' },
      theme_spec: 'nyt',
      chart_spec: {
        chartType: 'Scatter Plot',
        title: 'Heavier engines, fewer miles per gallon',
        encodings: { x: 'Horsepower', y: 'MPG', color: 'Origin', size: 'Model year' },
        baseSize: { width: 480, height: 320 },
        canvasSize: { width: 480, height: 320 },
      },
    },
  },
  {
    id: 'axis-titles',
    label: 'Scatter · axis titles longer than their axes',
    input: {
      data: { values: tableRows(classicDatasets.penguins) },
      semantic_types: { Species: 'Category', Sex: 'Category', 'Flipper length (mm)': 'Quantity', 'Body mass (g)': 'Quantity' },
      theme_spec: 'economist',
      chart_spec: {
        chartType: 'Scatter Plot',
        title: 'Longer flippers, heavier birds',
        encodings: {
          x: { field: 'Flipper length (mm)', title: 'Flipper length of each adult penguin, measured in millimetres at the colony' },
          y: { field: 'Body mass (g)', title: 'Body mass of each penguin, weighed in grams on arrival' },
          color: 'Species',
        },
        baseSize: { width: 360, height: 260 },
        canvasSize: { width: 360, height: 260 },
      },
    },
  },
  {
    id: 'names',
    label: 'Bars · long names down y, Datawrapper',
    input: {
      data: { values: SCORERS.slice(0, 8).map(({ Player, Team, Goals }) => ({ Scorer: `${Player} (${Team})`, Goals })) },
      semantic_types: { Scorer: 'Name', Goals: 'Count' },
      theme_spec: 'datawrapper',
      chart_spec: {
        chartType: 'Bar Chart',
        title: 'Top scorers',
        encodings: { x: 'Goals', y: 'Scorer' },
        baseSize: { width: 440, height: 320 },
        canvasSize: { width: 440, height: 320 },
      },
    },
  },
  {
    id: 'chrome',
    label: 'Line · figure label and source line, Economist',
    input: {
      data: { values: tableRows(classicDatasets.keeling) },
      semantic_types: { Year: 'Year', 'CO₂ (ppm)': 'Quantity' },
      theme_spec: 'economist',
      chart_spec: {
        chartType: 'Line Chart',
        title: 'Carbon dioxide at Mauna Loa',
        label: 'Chart 1',
        source: 'NOAA Global Monitoring Laboratory; Scripps',
        encodings: { x: 'Year', y: 'CO₂ (ppm)' },
        baseSize: { width: 480, height: 300 },
        canvasSize: { width: 480, height: 300 },
      },
    },
  },
  {
    id: 'violin',
    label: 'Violin · body mass by species',
    input: {
      data: { values: tableRows(classicDatasets.penguins) },
      semantic_types: { Species: 'Category', Sex: 'Category', 'Flipper length (mm)': 'Quantity', 'Body mass (g)': 'Quantity' },
      theme_spec: 'nyt',
      chart_spec: { chartType: 'Violin Plot', title: 'Body mass by species', encodings: { x: 'Species', y: 'Body mass (g)' }, baseSize: { width: 480, height: 320 }, canvasSize: { width: 480, height: 320 } },
    },
  },
  {
    id: 'ridgeline',
    label: 'Ridgeline · petal length by species',
    input: {
      data: { values: tableRows(classicDatasets.iris) },
      semantic_types: { Species: 'Category', 'Petal length (cm)': 'Quantity' },
      chart_spec: { chartType: 'Ridgeline Plot', title: 'Petal length by species', encodings: { x: 'Petal length (cm)', color: 'Species' }, baseSize: { width: 480, height: 300 }, canvasSize: { width: 480, height: 300 } },
    },
  },
  {
    id: 'radar',
    label: 'Radar · hours with each companion',
    input: {
      data: { values: timeUse.values.filter((row) => row.Group === 'All people' && [20, 40, 60, 80].includes(row.Age)).map((row) => ({ ...row, Age: `Age ${row.Age}` })) },
      semantic_types: { Who: 'Category', Hours: 'Quantity', Age: 'Category' },
      theme_spec: 'economist',
      chart_spec: { chartType: 'Radar Chart', title: 'Who Americans spend their day with', encodings: { x: 'Who', y: 'Hours', color: 'Age' }, baseSize: { width: 440, height: 360 }, canvasSize: { width: 440, height: 360 } },
    },
  },
];
