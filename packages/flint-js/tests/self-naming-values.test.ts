import { describe, expect, it } from 'vitest';
import { namedAsItsKind, selfNamingKind } from '../src/core/self-naming-values';

describe('values that prove their kind', () => {
    it('recognises closed vocabularies by name', () => {
        expect(selfNamingKind(['Jan', 'Feb', 'March'])).toBe('month');
        expect(selfNamingKind(['Monday', 'Tue'])).toBe('weekday');
        expect(selfNamingKind(['Q1', 'Q2', '2024 Q3'])).toBe('quarter');
        expect(selfNamingKind([2019, '2020', 2021])).toBe('year');
        expect(selfNamingKind(['2024-01-31', '2024-02'])).toBe('date');
        expect(selfNamingKind(['France', 'Japan', 'United States'])).toBe('country');
        expect(selfNamingKind(['Texas', 'Ohio', 'New York'])).toBe('state');
        expect(selfNamingKind(['Asia', 'Europe', 'Africa'])).toBe('continent');
    });

    it('takes every value or none: one stranger, a code, or an open set proves nothing', () => {
        expect(selfNamingKind(['France', 'Japan', 'Other'])).toBeUndefined();
        expect(selfNamingKind(['US', 'FR', 'JP'])).toBeUndefined();
        expect(selfNamingKind(['CA', 'TX'])).toBeUndefined();
        expect(selfNamingKind(['Some', 'Not much', 'A great deal'])).toBeUndefined();
        expect(selfNamingKind(['Adelie', 'Gentoo'])).toBeUndefined();
        expect(selfNamingKind(['FY24', 'FY25'])).toBeUndefined();
        expect(selfNamingKind([])).toBeUndefined();
    });

    it('lets a field name stand aside only where it says no more than the values', () => {
        expect(namedAsItsKind('Country', 'country')).toBe(true);
        expect(namedAsItsKind('countries', 'country')).toBe(true);
        expect(namedAsItsKind('country_name', 'country')).toBe(true);
        expect(namedAsItsKind('Month', 'month')).toBe(true);
        expect(namedAsItsKind('Origin', 'country')).toBe(false);
        expect(namedAsItsKind('Home team', 'country')).toBe(false);
        expect(namedAsItsKind('Release month', 'month')).toBe(false);
    });
});
