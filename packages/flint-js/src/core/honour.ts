/** A decision the plan made that the backend's spec does not draw as made. */
export interface PlanDeparture {
    /** The plan field, down to the property: `axisLabels.x.angle`, `rulers.y.values`, `legend.keys.color.orient`. */
    decision: string;
    /** Where in the spec, for decisions a spec states per view. */
    at?: string;
    planned: unknown;
    drawn: unknown;
}

/** Equal as JSON: the same numbers, strings and arrays, in the same order. */
export function sameDecision(planned: unknown, drawn: unknown): boolean {
    return JSON.stringify(planned) === JSON.stringify(drawn);
}
