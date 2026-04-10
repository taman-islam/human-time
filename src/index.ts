/**
 * Computes the signed millisecond difference between two dates.
 * Positive = `from` is in the past. Negative = `from` is in the future.
 */
export class TimeDiff {
  private readonly diffMs: number;

  constructor(from: Date, to: Date = new Date()) {
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
    return Math.floor(this.getAbsMs() / 1_000);
  }

  getMinutes() {
    return Math.floor(this.getAbsMs() / 60_000);
  }

  getHours() {
    return Math.floor(this.getAbsMs() / 3_600_000);
  }

  getDays() {
    return Math.floor(this.getAbsMs() / 86_400_000);
  }

  getWeeks() {
    return Math.floor(this.getAbsMs() / 604_800_000);
  }

  /** Approximate — uses 30-day month. Fine for display. */
  getMonths() {
    return Math.floor(this.getAbsMs() / 2_592_000_000);
  }

  /** Approximate — uses average year length (365.25 days). Fine for display. */
  getYears() {
    return Math.floor(this.getAbsMs() / 31_556_952_000);
  }

  isFuture() {
    return this.diffMs < 0;
  }
}

// ---------------------------------------------------------------------------
// Threshold config — one place to tune time perception per surface.
// ---------------------------------------------------------------------------

export interface TimeConfig {
  /** Milliseconds within which we show "Just now" / "In a moment". Default: 90 000 (90 s). */
  smoothMs: number;
  /** Day count at which we switch from days to weeks. Default: 7. */
  weekCutoff: number;
  /** Week count at which we switch from weeks to months. Default: 4. */
  monthCutoff: number;
}

export const DEFAULT_CONFIG: TimeConfig = {
  smoothMs: 90_000,
  weekCutoff: 7,
  monthCutoff: 4,
};

function assertValidConfig(config: TimeConfig): void {
  if (
    !Number.isFinite(config.smoothMs) ||
    config.smoothMs < 0 ||
    !Number.isFinite(config.weekCutoff) ||
    config.weekCutoff <= 0 ||
    !Number.isFinite(config.monthCutoff) ||
    config.monthCutoff <= 0
  ) {
    throw new Error('Invalid TimeConfig');
  }
}

// ---------------------------------------------------------------------------
// Localization & Dictionaries
// ---------------------------------------------------------------------------

export type Unit =
  | 'smoothed'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'date';

export type TieredUnit = Exclude<Unit, 'smoothed' | 'date'>;

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
    long: Record<
      TieredUnit,
      Partial<Record<PluralRule, string>> & { other: string }
    >;
  };
}

export const enUSDictionary: LocaleDictionary = {
  smoothed: {
    past: 'Just now',
    future: 'In a moment',
  },
  relative: {
    past: (val) => `${val} ago`,
    future: (val) => `In ${val}`,
  },
  units: {
    short: {
      minute: 'm',
      hour: 'h',
      day: 'd',
      week: 'w',
      month: 'mo',
    },
    long: {
      minute: { one: 'minute', other: 'minutes' },
      hour: { one: 'hour', other: 'hours' },
      day: { one: 'day', other: 'days' },
      week: { one: 'week', other: 'weeks' },
      month: { one: 'month', other: 'months' },
    },
  },
};

// ---------------------------------------------------------------------------
// Unit resolution — single source of threshold truth.
// ---------------------------------------------------------------------------

type ResolvedUnit =
  | { unit: 'smoothed' }
  | { unit: 'date' }
  | { unit: TieredUnit; value: number };

function resolveUnit(diff: TimeDiff, config: TimeConfig): ResolvedUnit {
  if (diff.getAbsMs() < config.smoothMs) {
    return { unit: 'smoothed' };
  }

  const totalSeconds = diff.getSeconds();
  if (totalSeconds < 60) {
    return { unit: 'smoothed' }; // hard floor — minutes are never 0
  }

  const m = diff.getMinutes();
  if (m < 60) {
    return { value: m, unit: 'minute' };
  }

  const h = diff.getHours();
  if (h < 24) {
    return { value: h, unit: 'hour' };
  }

  const d = diff.getDays();
  if (d < config.weekCutoff) {
    return { value: d, unit: 'day' };
  }

  const w = diff.getWeeks();
  const mo = diff.getMonths();

  // If we've hit the month cutoff but mathematically haven't accrued a full month yet
  // (e.g. 28-29 days), continue to show weeks to avoid dropping out to absolute date prematurely.
  if (w < config.monthCutoff || mo < 1) {
    return { value: w, unit: 'week' };
  }

  if (mo < 12) {
    return { value: mo, unit: 'month' };
  }

  return { unit: 'date' };
}

// ---------------------------------------------------------------------------
// Core Formatting API
// ---------------------------------------------------------------------------

export interface HumanTimeOptions {
  compareDate?: Date;
  locale?: string;
  config?: TimeConfig;
  dictionary?: LocaleDictionary;
}

/** Cache plural rules locally so we don't recreate them unless the locale changes */
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralRules(locale: string): Intl.PluralRules {
  if (!pluralRulesCache.has(locale)) {
    // Falls back gracefully in V8 if locale is syntactically correct but missing rules
    pluralRulesCache.set(locale, new Intl.PluralRules(locale));
  }
  return pluralRulesCache.get(locale)!;
}

function _formatCore(
  date: Date,
  options: HumanTimeOptions | undefined,
  formatValue: (
    value: number,
    unit: TieredUnit,
    dict: LocaleDictionary,
    locale: string,
  ) => string,
): string {
  if (isNaN(date.getTime())) throw new Error('human-time: invalid Date');

  const compareDate = options?.compareDate ?? new Date();
  const locale = options?.locale ?? 'en-US';
  const config = options?.config ?? DEFAULT_CONFIG;
  const dict = options?.dictionary ?? enUSDictionary;

  assertValidConfig(config);

  const diff = new TimeDiff(date, compareDate);
  const resolved = resolveUnit(diff, config);
  const isFuture = diff.isFuture();

  if (resolved.unit === 'smoothed')
    return isFuture ? dict.smoothed.future : dict.smoothed.past;

  if (resolved.unit === 'date') {
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year:
        date.getFullYear() !== compareDate.getFullYear()
          ? 'numeric'
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
export function formatRelative(date: Date, options?: HumanTimeOptions): string {
  return _formatCore(
    date,
    options,
    (value, unit, dict) => `${value}${dict.units.short[unit]}`,
  );
}

/**
 * Long-form relative format — suited for full-page listings where readability matters.
 *
 * @example
 * formatRelativeLong(date); // "5 minutes ago" · "In 3 hours" · "Just now"
 */
export function formatRelativeLong(
  date: Date,
  options?: HumanTimeOptions,
): string {
  return _formatCore(date, options, (value, unit, dict, locale) => {
    const pluralRule = getPluralRules(locale).select(value);
    const pluralForms = dict.units.long[unit];
    const stringForRule = pluralForms[pluralRule] ?? pluralForms.other;
    return `${value} ${stringForRule}`;
  });
}
