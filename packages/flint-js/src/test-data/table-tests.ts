// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Type } from './df-types';
import { TestCase, makeField } from './types';

const ORDERS = [
    ['2025-03-02', 'Lisbon', 'Analytics', 12, 18420.5],
    ['2025-03-04', 'Oslo', 'Storage', 3, 2310],
    ['2025-03-09', 'Lisbon', 'Security', 7, 9870.25],
    ['2025-03-11', 'Toronto', 'Analytics', 20, 30150],
    ['2025-03-15', 'Osaka', 'Storage', 5, 3925.75],
    ['2025-03-18', 'Toronto', 'Security', 2, 2840],
    ['2025-03-22', 'Oslo', 'Analytics', 9, 13505],
    ['2025-03-27', 'Osaka', 'Security', 4, 5610.5],
] as const;

/** Tables: the rows as given, titled, formatted and styled by Flint. */
export function genTableTests(): TestCase[] {
    const orders = ORDERS.map(([date, city, product, units, revenue]) => ({ date, city, product, units, revenue }));
    const meta = {
        date: { type: Type.Date, semanticType: 'Date', levels: [] },
        city: { type: Type.String, semanticType: 'City', levels: [] },
        product: { type: Type.String, semanticType: 'Category', levels: [] },
        units: { type: Type.Number, semanticType: 'Count', levels: [] },
        revenue: { type: Type.Number, semanticType: 'Amount', levels: [] },
    };
    return [
        {
            title: 'Orders in March',
            description: 'Eight orders as rows, each field a column in the order the rows hold them: dates as written, counts and amounts right-aligned in their formats.',
            tags: ['table', 'records', 'gallery'],
            chartType: 'Table',
            data: orders,
            fields: Object.keys(orders[0]).map((field) => makeField(field)),
            metadata: meta,
            encodingMap: {},
        },
    ];
}
