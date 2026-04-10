/**
 * Computes the signed millisecond difference between two dates.
 * Positive = `from` is in the past. Negative = `from` is in the future.
 */
export declare class TimeDiff {
    private readonly diffMs;
    constructor(from: Date, to?: Date);
    /**
     * Raw signed milliseconds (positive = past, negative = future).
     * Useful to compare exact numeric offsets manually.
     */
    getMs(): number;
    /** Absolute milliseconds regardless of direction. */
    getAbsMs(): number;
    getSeconds(): number;
    getMinutes(): number;
    getHours(): number;
    getDays(): number;
    getWeeks(): number;
    /** Approximate — uses 30-day month. Fine for display. */
    getMonths(): number;
    /** Approximate — uses average year length (365.25 days). Fine for display. */
    getYears(): number;
    isFuture(): boolean;
}
export interface TimeConfig {
    /** Milliseconds within which we show "Just now" / "In a moment". Default: 90 000 (90 s). */
    smoothMs: number;
    /** Day count at which we switch from days to weeks. Default: 7. */
    weekCutoff: number;
    /** Week count at which we switch from weeks to months. Default: 4. */
    monthCutoff: number;
}
export declare const DEFAULT_CONFIG: TimeConfig;
export type Unit = "smoothed" | "minute" | "hour" | "day" | "week" | "month" | "date";
export type TieredUnit = Exclude<Unit, "smoothed" | "date">;
export type PluralRule = Intl.LDMLPluralRule;
export interface LocaleDictionary {
    /** Smoothing window strings (< smoothMs) */
    smoothed: {
        past: string;
        future: string;
    };
    /** Prefix/suffix wrappers for relative format
     * (e.g. \`In \${val}\`, \`\${val} ago\`).
     * Used as an escape hatch for complex languages that drop words or change structure entirely.
     */
    relative: {
        past: (formattedValue: string) => string;
        future: (formattedValue: string) => string;
    };
    /** Unit label definitions */
    units: {
        /** Compact formats (e.g. "m", "h") */
        short: Record<TieredUnit, string>;
        /** Explicit Intl.PluralRules-driven long formats */
        long: Record<TieredUnit, Partial<Record<PluralRule, string>> & {
            other: string;
        }>;
    };
}
export declare const enUSDictionary: LocaleDictionary;
export interface HumanTimeOptions {
    compareDate?: Date;
    locale?: string;
    config?: TimeConfig;
    dictionary?: LocaleDictionary;
}
/**
 * Compact relative format — suited for tight UI spaces like notification drawers.
 *
 * @example
 * formatRelative(date); // "5m ago" · "In 3h" · "Just now"
 */
export declare function formatRelative(date: Date, options?: HumanTimeOptions): string;
/**
 * Long-form relative format — suited for full-page listings where readability matters.
 *
 * @example
 * formatRelativeLong(date); // "5 minutes ago" · "In 3 hours" · "Just now"
 */
export declare function formatRelativeLong(date: Date, options?: HumanTimeOptions): string;
