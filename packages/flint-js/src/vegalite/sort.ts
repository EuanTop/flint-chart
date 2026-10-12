import type { CategoryOrder } from '../core/channel-decisions';
import { escapeVlFieldName } from './field-name';

/** A category order as a Vega-Lite `sort`. */
export function vegaLiteSort(order: CategoryOrder): any {
    switch (order.by) {
        case 'values': return order.values;
        case 'data': return null;
        case 'value': return order.descending ? 'descending' : 'ascending';
        case 'channel': return `${order.descending ? '-' : ''}${order.channel}`;
        case 'field': return { field: escapeVlFieldName(order.field), op: 'min', order: order.descending ? 'descending' : 'ascending' };
    }
}
