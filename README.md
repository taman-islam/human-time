# @appents/human-time

A zero-dependency relative time formatter built on native `Intl.PluralRules` — designed for UI systems that treat time perception as a first-class concern.

```
3m ago · In 2h · Just now · Mar 15
```

## Why this exists

Time formatting looks simple until it isn't.

The moment a product spans multiple surfaces — feeds, notifications, dashboards, activity logs — time stops being a formatting problem and becomes a consistency problem.

"Just now" lasts 30 seconds in one place and 2 minutes in another.
"5m ago" becomes "0h ago" when rounding leaks through.
A week boundary behaves differently depending on who implemented it.

None of these are bugs in isolation. They're the natural result of each surface reimplementing its own idea of time perception.

`human-time` exists to remove that drift. It defines time as a single, explicit set of rules — how quickly it fades, how it groups, how it transitions between units — and applies them deterministically across every surface.

## Installation

```bash
npm install @appents/human-time
```

## Usage

### Compact format (feeds, notifications)

```typescript
import { formatRelative } from '@appents/human-time';

const past = new Date(Date.now() - 5 * 60_000);
formatRelative(past); // "5m ago"

const future = new Date(Date.now() + 3 * 3_600_000);
formatRelative(future); // "In 3h"
```

### Long format (tables, dashboards, timelines)

```typescript
import { formatRelativeLong } from '@appents/human-time';

const past = new Date(Date.now() - 5 * 60_000);
formatRelativeLong(past); // "5 minutes ago"
```

## Configuration

Every threshold is explicit and overridable:

```typescript
formatRelative(date, {
  config: {
    smoothMs: 30_000, // "Just now" window — 30s instead of default 90s
    weekCutoff: 5, // switch to weeks after 5 days, not 7
    monthCutoff: 6, // switch to months after 6 weeks, not 4
  },
});
```

| Option        | Default  | Effect                           |
| ------------- | -------- | -------------------------------- |
| `smoothMs`    | `90_000` | Milliseconds shown as "Just now" |
| `weekCutoff`  | `7`      | Days before switching to weeks   |
| `monthCutoff` | `4`      | Weeks before switching to months |

Beyond 12 months, output falls back to a localized absolute date (`Mar 15` or `Mar 15, 2023`).

## Localization

Supply a full dictionary to override every string:

```typescript
import { formatRelative, LocaleDictionary } from '@appents/human-time';

const esDictionary: LocaleDictionary = {
  smoothed: {
    past: 'Hace un momento',
    future: 'En un momento',
  },
  relative: {
    past: (val) => `Hace ${val}`,
    future: (val) => `En ${val}`,
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
      minute: { one: 'minuto', other: 'minutos' },
      hour: { one: 'hora', other: 'horas' },
      day: { one: 'día', other: 'días' },
      week: { one: 'semana', other: 'semanas' },
      month: { one: 'mes', other: 'meses' },
    },
  },
};

formatRelative(date, { locale: 'es', dictionary: esDictionary });
```

Plural forms are resolved via `Intl.PluralRules` — no hardcoded rules, no locale bundles.

## Features

- **Zero dependencies** — native platform APIs only
- **2.3 KB minified, ~1.0 KB gzipped**
- **Tree-shakeable** — import only what you use
- **Native `Intl.PluralRules` pluralization** — correct across locales
- **Configurable thresholds** — tune every time perception boundary
- **Symmetric past/future formatting**
- **Full TypeScript support** — strictly typed options, configs, and dictionaries
- **Dictionary-based i18n** — override any string, any language

## Bundle size

| Library                 | Minified                            | Gzipped                    |
| ----------------------- | ----------------------------------- | -------------------------- |
| moment                  | ~290 KB                             | ~65 KB                     |
| luxon                   | ~40 KB                              | ~14 KB                     |
| date-fns                | ~1–10 KB per function (tree-shaken) | up to ~70 KB (full import) |
| **@appents/human-time** | **2.3 KB**                          | **~1.0 KB**                |

No dependencies. No date parsing. No locale bundles.

## When to use

Social feeds · notifications · messaging apps · activity timelines · dashboards · CRMs
