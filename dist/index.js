/**
 * Computes the signed millisecond difference between two dates.
 * Positive = `from` is in the past. Negative = `from` is in the future.
 */
export class TimeDiff {
    constructor(from, to = new Date()) {
        this.diffMs = to.getTime() - from.getTime();
    }
    /**
     * Raw signed milliseconds (positive = past, negative = future).
     * Useful to compare exact numeric offsets manually.
     */
    getMs() {
        return this.diffMs;
    }
    /** Absolute milliseconds regardless of direction. */
    getAbsMs() {
        return Math.abs(this.diffMs);
    }
    getSeconds() {
        return Math.floor(this.getAbsMs() / 1000);
    }
    getMinutes() {
        return Math.floor(this.getAbsMs() / 60000);
    }
    getHours() {
        return Math.floor(this.getAbsMs() / 3600000);
    }
    getDays() {
        return Math.floor(this.getAbsMs() / 86400000);
    }
    getWeeks() {
        return Math.floor(this.getAbsMs() / 604800000);
    }
    /** Approximate — uses 30-day month. Fine for display. */
    getMonths() {
        return Math.floor(this.getAbsMs() / 2592000000);
    }
    /** Approximate — uses average year length (365.25 days). Fine for display. */
    getYears() {
        return Math.floor(this.getAbsMs() / 31556952000);
    }
    isFuture() {
        return this.diffMs < 0;
    }
}
export const DEFAULT_CONFIG = {
    smoothMs: 90000,
    weekCutoff: 7,
    monthCutoff: 4,
};
function assertValidConfig(config) {
    if (!Number.isFinite(config.smoothMs) ||
        config.smoothMs < 0 ||
        !Number.isFinite(config.weekCutoff) ||
        config.weekCutoff <= 0 ||
        !Number.isFinite(config.monthCutoff) ||
        config.monthCutoff <= 0) {
        throw new Error("Invalid TimeConfig");
    }
}
export const enUSDictionary = {
    smoothed: {
        past: "Just now",
        future: "In a moment",
    },
    relative: {
        past: (val) => `${val} ago`,
        future: (val) => `In ${val}`,
    },
    units: {
        short: {
            minute: "m",
            hour: "h",
            day: "d",
            week: "w",
            month: "mo",
        },
        long: {
            minute: { one: "minute", other: "minutes" },
            hour: { one: "hour", other: "hours" },
            day: { one: "day", other: "days" },
            week: { one: "week", other: "weeks" },
            month: { one: "month", other: "months" },
        },
    },
};
function resolveUnit(diff, config) {
    if (diff.getAbsMs() < config.smoothMs) {
        return { unit: "smoothed" };
    }
    const totalSeconds = diff.getSeconds();
    if (totalSeconds < 60) {
        return { unit: "smoothed" }; // hard floor — minutes are never 0
    }
    const m = diff.getMinutes();
    if (m < 60) {
        return { value: m, unit: "minute" };
    }
    const h = diff.getHours();
    if (h < 24) {
        return { value: h, unit: "hour" };
    }
    const d = diff.getDays();
    if (d < config.weekCutoff) {
        return { value: d, unit: "day" };
    }
    const w = diff.getWeeks();
    const mo = diff.getMonths();
    // If we've hit the month cutoff but mathematically haven't accrued a full month yet
    // (e.g. 28-29 days), continue to show weeks to avoid dropping out to absolute date prematurely.
    if (w < config.monthCutoff || mo < 1) {
        return { value: w, unit: "week" };
    }
    if (mo < 12) {
        return { value: mo, unit: "month" };
    }
    return { unit: "date" };
}
/** Cache plural rules locally so we don't recreate them unless the locale changes */
const pluralRulesCache = new Map();
function getPluralRules(locale) {
    if (!pluralRulesCache.has(locale)) {
        // Falls back gracefully in V8 if locale is syntactically correct but missing rules
        pluralRulesCache.set(locale, new Intl.PluralRules(locale));
    }
    return pluralRulesCache.get(locale);
}
function _formatCore(date, options, formatValue) {
    if (isNaN(date.getTime()))
        throw new Error("human-time: invalid Date");
    const compareDate = options?.compareDate ?? new Date();
    const locale = options?.locale ?? "en-US";
    const config = options?.config ?? DEFAULT_CONFIG;
    const dict = options?.dictionary ?? enUSDictionary;
    assertValidConfig(config);
    const diff = new TimeDiff(date, compareDate);
    const resolved = resolveUnit(diff, config);
    const isFuture = diff.isFuture();
    if (resolved.unit === "smoothed")
        return isFuture ? dict.smoothed.future : dict.smoothed.past;
    if (resolved.unit === "date") {
        return date.toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            year: date.getFullYear() !== compareDate.getFullYear()
                ? "numeric"
                : undefined,
        });
    }
    const formattedVal = formatValue(resolved.value, resolved.unit, dict, locale);
    return isFuture
        ? dict.relative.future(formattedVal)
        : dict.relative.past(formattedVal);
}
/**
 * Compact relative format — suited for tight UI spaces like notification drawers.
 *
 * @example
 * formatRelative(date); // "5m ago" · "In 3h" · "Just now"
 */
export function formatRelative(date, options) {
    return _formatCore(date, options, (value, unit, dict) => `${value}${dict.units.short[unit]}`);
}
/**
 * Long-form relative format — suited for full-page listings where readability matters.
 *
 * @example
 * formatRelativeLong(date); // "5 minutes ago" · "In 3 hours" · "Just now"
 */
export function formatRelativeLong(date, options) {
    return _formatCore(date, options, (value, unit, dict, locale) => {
        const pluralRule = getPluralRules(locale).select(value);
        const pluralForms = dict.units.long[unit];
        const stringForRule = pluralForms[pluralRule] ?? pluralForms.other;
        return `${value} ${stringForRule}`;
    });
}
