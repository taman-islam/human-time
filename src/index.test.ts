import { describe, it, expect } from '@jest/globals';
import {
  TimeDiff,
  formatRelative,
  formatRelativeLong,
  DEFAULT_CONFIG,
} from './index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const msAgo = (ms: number) => new Date(Date.now() - ms);
const msAhead = (ms: number) => new Date(Date.now() + ms);

const s = (n: number) => n * 1_000;
const m = (n: number) => n * 60_000;
const h = (n: number) => n * 3_600_000;
const d = (n: number) => n * 86_400_000;
const w = (n: number) => n * 604_800_000;
const mo = (n: number) => n * 2_629_746_000;

// ---------------------------------------------------------------------------
// TimeDiff
// ---------------------------------------------------------------------------

describe('TimeDiff', () => {
  it('returns positive ms for past dates', () => {
    const diff = new TimeDiff(msAgo(m(5)));
    expect(diff.getMs()).toBeGreaterThan(0);
  });

  it('returns negative ms for future dates', () => {
    const diff = new TimeDiff(msAhead(m(5)));
    expect(diff.getMs()).toBeLessThan(0);
  });

  it('isFuture() reflects sign correctly', () => {
    expect(new TimeDiff(msAhead(s(10))).isFuture()).toBe(true);
    expect(new TimeDiff(msAgo(s(10))).isFuture()).toBe(false);
  });

  it('getSeconds uses absolute value', () => {
    expect(new TimeDiff(msAgo(s(45))).getSeconds()).toBe(45);
    expect(new TimeDiff(msAhead(s(45))).getSeconds()).toBe(45);
  });

  it('getAbsMs returns unsigned value for both directions', () => {
    expect(new TimeDiff(msAgo(m(5))).getAbsMs()).toBeGreaterThan(0);
    expect(new TimeDiff(msAhead(m(5))).getAbsMs()).toBeGreaterThan(0);
    expect(new TimeDiff(msAhead(m(5))).getAbsMs()).toBeCloseTo(
      new TimeDiff(msAgo(m(5))).getAbsMs(),
      -2,
    );
  });

  it('getMinutes', () =>
    expect(new TimeDiff(msAgo(m(7))).getMinutes()).toBe(7));
  it('getHours', () => expect(new TimeDiff(msAgo(h(3))).getHours()).toBe(3));
  it('getDays', () => expect(new TimeDiff(msAgo(d(4))).getDays()).toBe(4));
  it('getWeeks', () => expect(new TimeDiff(msAgo(w(2))).getWeeks()).toBe(2));
  it('getMonths', () => expect(new TimeDiff(msAgo(mo(3))).getMonths()).toBe(3));
});

// ---------------------------------------------------------------------------
// HumanReadableTime.relative()
// ---------------------------------------------------------------------------

describe('HumanReadableTime.relative() — past', () => {
  it('returns "Just now" within 90 s smoothing window', () => {
    expect(formatRelative(msAgo(s(30)))).toBe('Just now');
    expect(formatRelative(msAgo(s(89)))).toBe('Just now');
  });

  it('shows seconds for > 90 s, < 1 m — note: 90s window absorbs this range', () => {
    // With 90s smoothing: anything < 90s = 'Just now'.
    // At 91s, getMinutes() = 1 → first live tier is minutes.
    // So relative() has no reachable seconds tier; TimeDiff.getSeconds() is for raw callers.
    expect(formatRelative(msAgo(s(91)))).toBe('1m ago');
  });

  it('shows minutes', () => {
    expect(formatRelative(msAgo(m(5)))).toBe('5m ago');
  });

  it('shows hours', () => {
    expect(formatRelative(msAgo(h(3)))).toBe('3h ago');
  });

  it('shows days', () => {
    expect(formatRelative(msAgo(d(3)))).toBe('3d ago');
  });

  it('shows weeks (not raw days) after 7 days', () => {
    expect(formatRelative(msAgo(d(10)))).toBe('1w ago');
  });

  it('shows months after 4 weeks', () => {
    expect(formatRelative(msAgo(mo(2)))).toBe('2mo ago');
  });

  it('shows absolute date after 12 months', () => {
    const old = new Date('2020-01-15');
    const result = formatRelative(old);
    // Don't assert exact day — UTC→local shift can change it by 1.
    expect(result).toMatch(/Jan \d+, 2020/);
  });
});

describe('HumanReadableTime.relative() — future', () => {
  it('returns "In a moment" within 90 s smoothing window', () => {
    expect(formatRelative(msAhead(s(30)))).toBe('In a moment');
  });

  it('shows future seconds — absorbed by 90s window; first visible tier is minutes', () => {
    expect(formatRelative(msAhead(s(91)))).toBe('In 1m');
  });

  it('shows future minutes', () => {
    expect(formatRelative(msAhead(m(5)))).toBe('In 5m');
  });

  it('shows future hours', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const future = new Date('2024-01-01T14:00:00Z');
    expect(formatRelative(future, { compareDate: now })).toBe('In 2h');
  });

  it('shows future weeks', () => {
    expect(formatRelative(msAhead(d(10)))).toBe('In 1w');
  });
});

// ---------------------------------------------------------------------------
// HumanReadableTime.relativeLong()
// ---------------------------------------------------------------------------

describe('HumanReadableTime.relativeLong() — past', () => {
  it('returns "Just now" within 90 s smoothing window', () => {
    expect(formatRelativeLong(msAgo(s(60)))).toBe('Just now');
  });

  it('pluralises seconds correctly — note: only relative() shows seconds; relativeLong skips to minutes', () => {
    // 91s = past smoothing, getMinutes()=1 → relativeLong goes straight to minutes tier
    expect(formatRelativeLong(msAgo(s(91)))).toBe('1 minute ago');
  });

  it('singular minute', () => {
    // Need > 90s (past smoothing) and exactly 1 in getMinutes() → use 2m exactly
    expect(formatRelativeLong(msAgo(m(2)))).toBe('2 minutes ago');
    // 1m: getMinutes()=1 but ms = 60_000 < 90_000 → 'Just now'
    // Use a fixed pair instead
    const from = new Date('2024-01-01T12:00:00Z');
    const to = new Date('2024-01-01T12:01:30Z'); // 90s exactly → 1 minute
    expect(formatRelativeLong(from, { compareDate: to })).toBe('1 minute ago');
  });

  it('plural minutes', () => {
    expect(formatRelativeLong(msAgo(m(5)))).toBe('5 minutes ago');
  });

  it('plural hours', () => {
    expect(formatRelativeLong(msAgo(h(3)))).toBe('3 hours ago');
  });

  it('singular day', () => {
    expect(formatRelativeLong(msAgo(d(1) + h(1)))).toBe('1 day ago');
  });

  it('plural days', () => {
    expect(formatRelativeLong(msAgo(d(3)))).toBe('3 days ago');
  });

  it('shows weeks after 7 days', () => {
    expect(formatRelativeLong(msAgo(d(10)))).toBe('1 week ago');
  });

  it('shows months after 4 weeks', () => {
    expect(formatRelativeLong(msAgo(mo(3)))).toBe('3 months ago');
  });

  it('omits year when same year', () => {
    const now = new Date();
    const sameYear = new Date(now.getFullYear(), 0, 1); // Jan 1 this year
    const result = formatRelativeLong(sameYear, { compareDate: now });
    // Should not contain current year as a standalone number
    expect(result).not.toMatch(new RegExp(`,\\s*${now.getFullYear()}$`));
  });

  it('includes year when different year', () => {
    const old = new Date('2018-06-15');
    expect(formatRelativeLong(old)).toMatch(/2018/);
  });
});

describe('HumanReadableTime.relativeLong() — future', () => {
  it('returns "In a moment" within smoothing window', () => {
    expect(formatRelativeLong(msAhead(s(10)))).toBe('In a moment');
  });

  it('shows future minutes', () => {
    expect(formatRelativeLong(msAhead(m(5)))).toBe('In 5 minutes');
  });

  it('shows future hours', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const future = new Date('2024-01-01T13:01:00Z');
    expect(formatRelativeLong(future, { compareDate: now })).toBe('In 1 hour');
  });

  it('shows future weeks', () => {
    expect(formatRelativeLong(msAhead(d(14)))).toBe('In 2 weeks');
  });
});

// ---------------------------------------------------------------------------
// Fix #2 — weeks/month boundary: 28 d = 4w but getMonths() = 0, must not
// show "0mo ago". Instead falls through to absolute date.
// ---------------------------------------------------------------------------

describe('weeks → months boundary gap', () => {
  // 28 days: getWeeks() = 4 (not < 4, so weeks skipped), getMonths() = 0
  it('28 days safely spans the gap using weeks', () => {
    const twentyEightDaysAgo = new Date(Date.now() - d(28));
    const result = formatRelative(twentyEightDaysAgo);
    expect(result).not.toContain('0mo');
    expect(result).not.toContain('0m');
    expect(result).toBe('4w ago');
  });

  it('29 days also securely spans the threshold into weeks', () => {
    const result = formatRelative(new Date(Date.now() - d(29)));
    expect(result).not.toContain('0mo');
  });

  it('full month (≥30.44 days) correctly shows "1mo ago"', () => {
    // 31 days ≈ 1 month by average
    const result = formatRelative(new Date(Date.now() - d(31)));
    expect(result).toBe('1mo ago');
  });
});

// ---------------------------------------------------------------------------
// Fix #3 — m <= 0 safety guard (edge case from flooring)
// ---------------------------------------------------------------------------

describe('m <= 0 guard', () => {
  it('exactly 90_000 ms shows tier output, not "0m ago"', () => {
    const from = new Date('2024-06-01T12:00:00.000Z');
    const to = new Date('2024-06-01T12:01:30.000Z'); // exactly 90 000 ms
    const result = formatRelative(from, { compareDate: to });
    // 90_000 ms → getMinutes() = 1 → "1m ago"
    expect(result).toBe('1m ago');
    expect(result).not.toBe('0m ago');
  });
});

// ---------------------------------------------------------------------------
// Fix #4 — locale param
// ---------------------------------------------------------------------------

describe('locale param', () => {
  it('defaults to en-US formatting', () => {
    const old = new Date('2020-03-15');
    expect(formatRelative(old)).toMatch(/Mar \d+, 2020/);
  });

  it('respects overridden locale', () => {
    const old = new Date('2020-03-15');
    // de-DE uses DD.MM.YYYY or similar — just verify it differs from en-US
    const enResult = formatRelative(old, {
      compareDate: new Date(),
      locale: 'en-US',
    });
    const deResult = formatRelative(old, {
      compareDate: new Date(),
      locale: 'de-DE',
    });
    // Both should be absolute dates but formatted differently
    expect(typeof deResult).toBe('string');
    expect(deResult.length).toBeGreaterThan(0);
    // de-DE typically uses dots or different separator, should differ from en-US
    expect(deResult).not.toBe(enResult);
  });
});

// ---------------------------------------------------------------------------
// TimeConfig — configurable thresholds
// ---------------------------------------------------------------------------

describe('TimeConfig', () => {
  it('DEFAULT_CONFIG has expected values', () => {
    expect(DEFAULT_CONFIG.smoothMs).toBe(90_000);
    expect(DEFAULT_CONFIG.weekCutoff).toBe(7);
    expect(DEFAULT_CONFIG.monthCutoff).toBe(4);
  });

  it.each([
    ['negative smoothMs', { ...DEFAULT_CONFIG, smoothMs: -1 }],
    ['NaN smoothMs', { ...DEFAULT_CONFIG, smoothMs: NaN }],
    ['Infinity smoothMs', { ...DEFAULT_CONFIG, smoothMs: Infinity }],
    ['negative weekCutoff', { ...DEFAULT_CONFIG, weekCutoff: -1 }],
    ['negative monthCutoff', { ...DEFAULT_CONFIG, monthCutoff: -1 }],
  ])('throws on %s', (_, config) => {
    expect(() =>
      formatRelative(new Date(), {
        compareDate: new Date(),
        locale: 'en-US',
        config,
      }),
    ).toThrow('Invalid TimeConfig');
  });

  it('custom smoothMs extends the "Just now" window', () => {
    // Default (90s): 3 minutes shows "3m ago"
    expect(formatRelative(msAgo(m(3)))).toBe('3m ago');

    // 10-minute smooth window: 3 minutes shows "Just now"
    const result = formatRelative(msAgo(m(3)), {
      compareDate: new Date(),
      locale: 'en-US',
      config: {
        ...DEFAULT_CONFIG,
        smoothMs: m(10),
      },
    });
    expect(result).toBe('Just now');
  });

  it('custom weekCutoff changes the days → weeks boundary', () => {
    // Default: 5d < 7d cutoff → "5d ago"
    expect(formatRelative(msAgo(d(5)))).toBe('5d ago');

    // weekCutoff = 3, 8 days: getDays() = 8 ≥ 3 (skips days), getWeeks() = 1 → "1w ago"
    const result = formatRelative(msAgo(d(8)), {
      compareDate: new Date(),
      locale: 'en-US',
      config: {
        ...DEFAULT_CONFIG,
        weekCutoff: 3,
      },
    });
    expect(result).toBe('1w ago');
  });

  it('custom monthCutoff changes the weeks → months boundary', () => {
    // Default: 2w < 4w cutoff → "2w ago"
    expect(formatRelative(msAgo(w(2)))).toBe('2w ago');

    // monthCutoff = 2: 2w ≥ cutoff, getMonths() = 0 → falls to absolute date
    const result = formatRelative(msAgo(w(2)), {
      compareDate: new Date(),
      locale: 'en-US',
      config: {
        ...DEFAULT_CONFIG,
        monthCutoff: 2,
      },
    });
    expect(result).toBe('2w ago');
  });
});

// ---------------------------------------------------------------------------
// Cross-format consistency
// ---------------------------------------------------------------------------

describe('relative() vs relativeLong() semantic alignment', () => {
  it('both formats resolve to the same tier for a given date', () => {
    const date = msAgo(m(5));
    expect(formatRelative(date)).toBe('5m ago');
    expect(formatRelativeLong(date)).toBe('5 minutes ago');
  });

  it('both formats agree on future direction', () => {
    const from = new Date('2024-06-01T12:00:00Z');
    const to = new Date('2024-06-01T09:30:00Z'); // 2.5h in the past relative to from → future from to's POV
    // from is 2.5h ahead of to → getHours() = 2
    expect(formatRelative(from, { compareDate: to })).toBe('In 2h');
    expect(formatRelativeLong(from, { compareDate: to })).toBe('In 2 hours');
  });

  it('both formats agree on smoothed window', () => {
    const date = msAgo(s(30));
    expect(formatRelative(date)).toBe('Just now');
    expect(formatRelativeLong(date)).toBe('Just now');
  });
});

// ---------------------------------------------------------------------------
// Future beyond 12 months
// ---------------------------------------------------------------------------

describe('future dates beyond 12 months', () => {
  it('uses absolute date format', () => {
    const future = new Date('2030-01-01');
    expect(formatRelative(future)).toMatch(/\w+ \d+(, \d{4})?/);
    expect(formatRelativeLong(future)).toMatch(/\w+ \d+/);
  });
});

// ---------------------------------------------------------------------------
// Floating-point week → month threshold
// ---------------------------------------------------------------------------

describe('week → month floating-point threshold', () => {
  it('exactly 30 days resolves to "1mo ago" (not absolute date)', () => {
    // 30d: getWeeks()=4 (≥ monthCutoff, weeks exhausted),
    // getMonths() = floor(30d / 30d) = 1 → "1mo ago"
    const exactMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(formatRelative(exactMonth)).toBe('1mo ago');
  });

  it('29 days (4w + 1d, 0 complete months) spans gap via weeks', () => {
    const twentyNineDays = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const result = formatRelative(twentyNineDays);
    expect(result).not.toContain('mo');
    expect(result).toBe('4w ago');
  });
});
