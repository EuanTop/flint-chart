// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Type } from './df-types';
import { TestCase, makeField, makeEncodingItem } from './types';
import { seededRandom } from './generators';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function gauss(rand: () => number): number {
    return rand() + rand() + rand() - 1.5;
}

// ------ Ridgeline Plot ------
export function genRidgelineTests(): TestCase[] {
    const tests: TestCase[] = [];
    const rand = seededRandom(1203);

    // 1. Monthly temperature distributions, one ridge per month.
    {
        const data: any[] = [];
        MONTHS.forEach((month, index) => {
            const mean = 5 + 15 * (1 - Math.abs(index - 6.5) / 6.5);
            for (let i = 0; i < 60; i++) data.push({ Month: month, Temperature: Math.round((mean + gauss(rand) * 5) * 10) / 10 });
        });
        tests.push({
            title: 'Monthly Temperatures (12 ridges)',
            description: 'Kernel density of daily temperature readings, one ridge per month',
            tags: ['quantitative', 'color', 'medium', 'gallery-showcase'],
            chartType: 'Ridgeline Plot',
            data,
            fields: [makeField('Temperature'), makeField('Month')],
            metadata: {
                Temperature: { type: Type.Number, semanticType: 'Temperature', levels: [] },
                Month: { type: Type.String, semanticType: 'Month', levels: MONTHS },
            },
            encodingMap: { x: makeEncodingItem('Temperature'), color: makeEncodingItem('Month') },
        });
    }

    // 1b. The same ridges on a floor seen in perspective.
    {
        const last = tests[tests.length - 1];
        tests.push({
            ...last,
            title: 'Monthly Temperatures (perspective)',
            description: 'The same densities standing on a floor seen in perspective',
            chartProperties: { perspective: true },
        });
    }

    // 1c. The same months named on y instead of colour.
    {
        const last = tests[tests.length - 2];
        tests.push({
            ...last,
            tags: ['quantitative', 'color', 'medium'],
            title: 'Monthly Temperatures (months on y)',
            description: 'The month names the ridge from the y channel; colour is free',
            encodingMap: { x: makeEncodingItem('Temperature'), y: makeEncodingItem('Month') },
        });
    }

    // 2. Four treatment groups' scores.
    {
        const groups = ['Control', 'Low dose', 'Medium dose', 'High dose'];
        const data: any[] = [];
        groups.forEach((group, index) => {
            for (let i = 0; i < 120; i++) data.push({ Group: group, Score: Math.round(50 + index * 8 + gauss(rand) * 18) });
        });
        tests.push({
            title: 'Treatment Scores (4 ridges)',
            description: 'Score distributions by treatment group',
            tags: ['quantitative', 'color', 'small'],
            chartType: 'Ridgeline Plot',
            data,
            fields: [makeField('Score'), makeField('Group')],
            metadata: {
                Score: { type: Type.Number, semanticType: 'Score', levels: [] },
                Group: { type: Type.String, semanticType: 'Category', levels: groups },
            },
            encodingMap: { x: makeEncodingItem('Score'), color: makeEncodingItem('Group') },
        });
    }

    // 3. Measured curves layered one behind another.
    {
        const series = ['A', 'B', 'C', 'D'];
        const data: any[] = [];
        series.forEach((name, index) => {
            for (let k = 0; k <= 40; k++) {
                const t = k / 40;
                data.push({ Series: name, Time: Math.round(t * 1000) / 1000, Signal: Math.round((0.25 * rand() + 0.3 * Math.abs(Math.sin(t * 6 + index))) * 1000) / 1000 });
            }
        });
        const measured: TestCase = {
            title: 'Layered Signals (measured y)',
            description: 'Each series\' measured signal over time, raised on its own baseline',
            tags: ['quantitative', 'color', 'small', 'gallery-showcase'],
            chartType: 'Ridgeline Plot',
            data,
            fields: [makeField('Time'), makeField('Signal'), makeField('Series')],
            metadata: {
                Time: { type: Type.Number, semanticType: 'Quantity', levels: [] },
                Signal: { type: Type.Number, semanticType: 'Quantity', levels: [] },
                Series: { type: Type.String, semanticType: 'Category', levels: series },
            },
            encodingMap: { x: makeEncodingItem('Time'), y: makeEncodingItem('Signal'), color: makeEncodingItem('Series') },
        };
        // 4. The same curves in perspective, shown before the flat ones on the wall.
        tests.push({
            ...measured,
            title: 'Layered Signals (perspective)',
            description: 'The layered signals with the back ridges shifted left',
            chartProperties: { skew: 0.15 },
        });
        tests.push(measured);
        tests.push({
            ...measured,
            tags: ['quantitative', 'color', 'small'],
            title: 'Layered Signals (isometric)',
            description: 'The layered signals on a floor whose x axis rises across its range',
            chartProperties: { perspective: true },
        });
    }

    // 5. Cooperation over rounds for each level of a numeric factor: translucent ridges in
    //    perspective, a value axis, a gradient legend, and marked values joined across ridges.
    {
        const data: any[] = [];
        for (let level = 0; level <= 6; level++) {
            const start = 0.15 + level * 0.04;
            const end = 0.5 + level * 0.07;
            for (let round = 0; round <= 14; round++) {
                const t = round / 14;
                const rate = start + (end - start) * (1 - Math.exp(-3 * t)) / (1 - Math.exp(-3)) + (rand() - 0.5) * 0.04;
                data.push({ A1: level, Round: round, 'Cooperation Rate': Math.round(Math.max(0, Math.min(1, rate)) * 100) / 100 });
            }
        }
        tests.push({
            title: 'Cooperation Rate by Round (marked values)',
            description: 'One ridge per level of A1 in perspective, with values marked at rounds 3, 7 and 14',
            tags: ['quantitative', 'color', 'small', 'gallery-showcase'],
            chartType: 'Ridgeline Plot',
            data,
            fields: [makeField('Round'), makeField('Cooperation Rate'), makeField('A1')],
            metadata: {
                Round: { type: Type.Number, semanticType: 'Quantity', levels: [] },
                'Cooperation Rate': { type: Type.Number, semanticType: 'Percentage', levels: [] },
                A1: { type: Type.Number, semanticType: 'Quantity', levels: [] },
            },
            encodingMap: { x: makeEncodingItem('Round'), y: makeEncodingItem('Cooperation Rate'), color: makeEncodingItem('A1') },
            chartProperties: { perspective: true, opacity: 0.45, valueMax: 1, markAt: [3, 7, 14] },
        });
    }

    return tests;
}

// ------ Marginal Plot ------
export function genMarginalScatterTests(): TestCase[] {
    const tests: TestCase[] = [];
    const rand = seededRandom(1204);
    const species = ['setosa', 'versicolor', 'virginica'];
    const centres: Record<string, [number, number, number, number]> = {
        setosa: [5.0, 3.4, 0.35, 0.38], versicolor: [5.9, 2.8, 0.5, 0.3], virginica: [6.6, 3.0, 0.6, 0.32],
    };
    const data: any[] = [];
    for (const name of species) {
        const [mx, my, sx, sy] = centres[name];
        for (let i = 0; i < 50; i++) {
            data.push({
                'Sepal Length': Math.round((mx + gauss(rand) * sx * 1.4) * 10) / 10,
                'Sepal Width': Math.round((my + gauss(rand) * sy * 1.4) * 10) / 10,
                Species: name,
            });
        }
    }
    const fields = [makeField('Sepal Length'), makeField('Sepal Width'), makeField('Species')];
    const metadata = {
        'Sepal Length': { type: Type.Number, semanticType: 'Quantity', levels: [] },
        'Sepal Width': { type: Type.Number, semanticType: 'Quantity', levels: [] },
        Species: { type: Type.String, semanticType: 'Category', levels: species },
    };

    tests.push({
        title: 'Iris sepal length × width, density margins',
        description: 'Sepal measurements with each axis\'s density by species along it',
        tags: ['quantitative', 'color', 'small', 'real'],
        chartType: 'Marginal Plot',
        data, fields, metadata,
        encodingMap: { x: makeEncodingItem('Sepal Length'), y: makeEncodingItem('Sepal Width'), color: makeEncodingItem('Species') },
    });
    tests.push({
        title: 'Iris sepal length × width, histogram margins',
        description: 'The same scatter with binned counts along each axis',
        tags: ['quantitative', 'color', 'small'],
        chartType: 'Marginal Plot',
        data, fields, metadata,
        encodingMap: { x: makeEncodingItem('Sepal Length'), y: makeEncodingItem('Sepal Width'), color: makeEncodingItem('Species') },
        chartProperties: { marginal: 'histogram' },
    });
    tests.push({
        title: 'Iris sepal length × width, boxplot margins',
        description: 'The same scatter with a box and whiskers per species along each axis',
        tags: ['quantitative', 'color', 'small', 'real'],
        chartType: 'Marginal Plot',
        data, fields, metadata,
        encodingMap: { x: makeEncodingItem('Sepal Length'), y: makeEncodingItem('Sepal Width'), color: makeEncodingItem('Species') },
        chartProperties: { marginal: 'boxplot' },
    });
    tests.push({
        title: 'Iris species × sepal length',
        description: 'A category against a measure: a strip plot with counts per species above and the measure\'s density to the right',
        tags: ['nominal', 'quantitative', 'color', 'small', 'real'],
        chartType: 'Marginal Plot',
        data, fields, metadata,
        encodingMap: { x: makeEncodingItem('Species'), y: makeEncodingItem('Sepal Length'), color: makeEncodingItem('Species') },
    });
    {
        const regions = ['North', 'South', 'East', 'West'];
        const segments = ['Consumer', 'Corporate', 'Home Office'];
        const weights = [[5, 3, 1], [2, 4, 3], [1, 2, 6], [3, 3, 3]];
        const pairs: any[] = [];
        regions.forEach((region, r) => segments.forEach((segment, s) => {
            for (let i = 0; i < weights[r][s] * 6; i++) pairs.push({ Region: region, Segment: segment });
        }));
        tests.push({
            title: 'Orders by sales region × customer segment',
            description: 'Two categories: a heatmap of counts with the counts per category along each axis',
            tags: ['nominal', 'small', 'real'],
            chartType: 'Marginal Plot',
            data: pairs,
            fields: [makeField('Region'), makeField('Segment')],
            metadata: {
                Region: { type: Type.String, semanticType: 'Category', levels: regions },
                Segment: { type: Type.String, semanticType: 'Category', levels: segments },
            },
            encodingMap: { x: makeEncodingItem('Region'), y: makeEncodingItem('Segment') },
        });
    }
    tests.push({
        title: 'Iris sepal length × width, one series',
        description: 'Sepal measurements with pooled margins',
        tags: ['quantitative', 'small'],
        chartType: 'Marginal Plot',
        data, fields, metadata,
        encodingMap: { x: makeEncodingItem('Sepal Length'), y: makeEncodingItem('Sepal Width') },
    });
    return tests;
}
