export type ChinaLevel = 'province' | 'prefecture' | 'county';

/** One region's population in the two censuses: a province, a prefecture or a county. */
export interface ChinaChangeRow extends Record<string, unknown> {
  /** The level and the national administrative code, `county:429004`: the join key on the map. */
  Key: string;
  Code: string;
  Place: string;
  Province: string;
  Prefecture: string;
  Level: ChinaLevel;
  Pop2010: number;
  Pop2020: number;
  /** 2020 against 2010, as a fraction: -0.12 is a twelfth fewer people. */
  Change: number;
  /** Counties it holds with both counts, and how many of them lost people. */
  Counties: number;
  CountiesShrinking: number;
}

export interface ChinaChangeData {
  metadata: {
    years: [number, number];
    counts: Record<ChinaLevel, number>;
    countiesWithoutBothCounts: number;
    countiesShrinking: number;
    nationalChangePct: number;
  };
  rows: ChinaChangeRow[];
}

/** The boundaries of all three levels, one TopoJSON object each. */
export const CHINA_CHANGE_MAP_URL = `${import.meta.env.BASE_URL}map-data/china-population-change.topojson`;
/** Every province, Taiwan, Hong Kong and Macau included: the land drawn beneath the data. */
export const CHINA_PROVINCES_URL = `${import.meta.env.BASE_URL}map-data/china-provinces.geojson`;

let changeData: Promise<ChinaChangeData> | undefined;

export function loadChinaChangeData(): Promise<ChinaChangeData> {
  changeData ??= fetch(`${import.meta.env.BASE_URL}map-data/china-population-change.json`)
    .then(async response => {
      if (!response.ok) throw new Error(`Census data request failed (${response.status})`);
      return await response.json() as ChinaChangeData;
    })
    .catch(error => {
      changeData = undefined;
      throw error;
    });
  return changeData;
}
