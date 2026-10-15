// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { ThemePreset } from '../types';
import { DATAWRAPPER_ICON } from './icons';

/**
 * Datawrapper.
 *
 * Measured from Datawrapper's own published charts (its Academy examples, rendered at
 * datawrapper.dwcdn.net) and its open-source `defaultColors`, which mixes one text ink, `#181818`,
 * toward the background: tick labels at 0.2 and 0.4, gridlines at 0.82, the baseline at 0. Roboto
 * throughout — a 22px bold black headline, a 14px description, 12px labels, values and key, an 11px
 * grey source line; no footer rule. Bar charts print their values and draw no value axis; a ruler,
 * where there is one, has a few solid light gridlines, a dark zero line and its unit on the last
 * tick. The palette is Datawrapper's default, ordered so neighbouring series differ and its pale
 * yellows come last.
 */
export const datawrapper: ThemePreset = {
    id: 'datawrapper',
    label: "Datawrapper",
    description: "Embedded web chart: Roboto, a plain headline and description, values on bars and no value axis.",
    guidance: [
        "- `title` and `subtitle` do all the naming; annotate the measure with `unit` (it goes on the last tick).",
        "- Bar charts carry their numbers, so state the values precisely; a long category name goes on its own line above its bar.",
        "- Colour can tell 5 categories apart.",
    ].join('\n'),
    icon: DATAWRAPPER_ICON,
    spec: {
        "id": "datawrapper",
        "label": "Datawrapper",
        "ink": {
            "surface": {
                "source": "host"
            },
            "text": {
                "primary": "#181818",
                "secondary": "#747474",
                "muted": "#888888"
            },
            "structure": {
                "grid": "#e7e7e7",
                "rule": "#d8d8d8",
                "connector": "#c4c4c4",
                "axis": "#181818"
            },
            "series": {
                "single": "#18a1cd",
                "categorical": [
                    "#18a1cd",
                    "#c71e1d",
                    "#fa8c00",
                    "#09bb9f",
                    "#15607a"
                ],
                "categoricalExtended": [
                    "#18a1cd",
                    "#c71e1d",
                    "#fa8c00",
                    "#09bb9f",
                    "#15607a",
                    "#009076",
                    "#ffca76",
                    "#1d81a2",
                    "#00dca6",
                    "#c4c4c4",
                    "#ffe59c"
                ],
                "sequential": {
                    "stops": [
                        "#d3eef8",
                        "#9cd6ec",
                        "#5bbbe0",
                        "#18a1cd",
                        "#15607a"
                    ],
                    "space": "lab",
                    "consumption": "quantize",
                    "quantizeCount": 5
                },
                "diverging": {
                    "stops": [
                        "#15607a",
                        "#719aae",
                        "#e8e8e8",
                        "#ff6954",
                        "#c71e1d"
                    ],
                    "neutral": "#e8e8e8",
                    "space": "lab",
                    "endpointsAgainstSurface": true,
                    "consumption": "quantize",
                    "quantizeCount": 5
                },
                "selection": {},
                "overflow": "#c4c4c4"
            },
            "accent": "#18a1cd"
        },
        "type": {
            "minSize": 11,
            "headline": {
                "family": "Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif",
                "size": 22,
                "weight": "bold",
                "color": "#000000"
            },
            "deck": {
                "size": 14,
                "color": "#181818"
            },
            "axisLabel": {
                "family": "Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif",
                "size": 12
            },
            "valueLabel": {
                "size": 12,
                "color": "#181818"
            },
            "keyLabel": {
                "size": 12,
                "color": "#181818"
            },
            "footnote": {
                "size": 11,
                "color": "#888888"
            }
        },
        "structure": {
            "axis": {
                "categorical": {
                    "line": "omit",
                    "ticks": "omit",
                    "tickLabels": "sparse"
                },
                "measure": {
                    "line": "omit",
                    "ticks": "omit",
                    "tickDensity": "sparse",
                    "suppressWhenValuesPrinted": true
                }
            },
            "grid": {
                "measure": "full",
                "category": "omit",
                "style": "solid"
            },
            "frame": "omit",
            "baseline": {
                "presence": "full",
                "color": "#181818",
                "weight": 1
            }
        },
        "marks": {
            "bandFraction": 0.65,
            "separator": {
                "presence": "omit"
            },
            "point": {
                "size": 48
            },
            "connector": {
                "presence": "full",
                "weight": 1
            }
        },
        "geometry": {
            "arc": {
                "gap": 1
            },
            "cell": {
                "gap": 1
            }
        },
        "labels": {
            "truncation": "never",
            "rowNames": "auto"
        },
        "legend": {
            "show": "always",
            "placement": [
                "top"
            ],
            "direction": "horizontal",
            "title": "whenAmbiguous"
        },
        "dataLabels": {
            "show": "whenTheyFit",
            "placement": "outsideMark",
            "inkMode": "contrastWithMark"
        },
        "annotation": {
            "axisTitles": "omit",
            "unit": "lastTick",
            "numberFormat": {
                "precision": "auto"
            }
        },
        "interaction": {
            "tooltipFormat": "matchKey"
        },
        "layout": {
            "density": "normal",
            "targetWidth": 360,
            "bandStepFit": 1,
            "titleBlock": {
                "anchor": "start"
            }
        },
        "compileDefaults": {
            "baseSize": { "width": 420, "height": 340 }
        }
    },
};
