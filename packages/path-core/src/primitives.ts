import type { CivilDate, ZonedInstant } from './model.ts';

export function isCivilDate(value: unknown): value is CivilDate {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(0);
    date.setUTCFullYear(y, m - 1, d);
    date.setUTCHours(0, 0, 0, 0);
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isZonedInstant(value: unknown): value is ZonedInstant {
    return typeof value === 'string'
        && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
        && isCivilDate(value.slice(0, 10))
        && Number(value.slice(11, 13)) < 24
        && Number(value.slice(14, 16)) < 60
        && Number(value.slice(17, 19)) < 60
        && (value.endsWith('Z') || (Number(value.slice(-5, -3)) < 24 && Number(value.slice(-2)) < 60))
        && !Number.isNaN(Date.parse(value));
}
