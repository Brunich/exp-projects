# Stacked lead volume chart

Use `GET /leads/stats` `dailyBuckets.bySource` to plot daily lead volume split by source (landing, referral, ads, other).

## Quick demo

Open [`stacked-chart.html`](./stacked-chart.html) in a browser:

- **Sample data** loads immediately (no server required).
- **Load from API** fetches live stats when the dev server is running (`npm run dev`) and you enter the base URL plus `x-api-key`.

```bash
cd projects/api-leads-capture
npm run dev
# open docs/stacked-chart.html and point it at http://localhost:3001
```

## API response shape

Each bucket includes total `count` and per-source counts in `bySource`:

```json
{
  "data": {
    "dailyBuckets": [
      {
        "date": "2026-07-05",
        "count": 3,
        "bySource": { "landing": 2, "referral": 1, "ads": 0, "other": 0 }
      }
    ]
  }
}
```

Query parameters:

| Param        | Description                         |
| ------------ | ----------------------------------- |
| `bucketDays` | Window length in days (1–90, default 14) |
| `since`      | Only leads on/after `YYYY-MM-DD`    |

## TypeScript helper

`src/lib/lead-chart-series.ts` converts buckets into a Chart.js-friendly series:

```ts
import { toStackedChartSeries } from "./lib/lead-chart-series.js";

const stats = await fetch("/leads/stats?bucketDays=30", {
  headers: { "x-api-key": process.env.LEADS_API_KEY! },
}).then((r) => r.json());

const { labels, datasets } = toStackedChartSeries(stats.data.dailyBuckets);
// labels → x-axis dates
// datasets → one stacked series per source (landing, referral, ads, other)
```

`sumBySource(buckets)` totals each source across the window for donut or KPI tiles.

## Chart.js (React or vanilla)

The HTML demo mirrors the helper. Pass `stack: "leads"` on each dataset and enable `stacked: true` on both axes:

```js
new Chart(canvas, {
  type: "bar",
  data: toStackedChartSeries(stats.data.dailyBuckets),
  options: {
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
  },
});
```

Source colors and labels are exported as `LEAD_SOURCE_COLORS` and `LEAD_SOURCE_LABELS` for consistent dashboards.

## Recharts example

```tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { LEAD_SOURCE_ORDER, LEAD_SOURCE_LABELS } from "./lead-chart-series";

const rows = stats.data.dailyBuckets.map((bucket) => ({
  date: bucket.date,
  ...bucket.bySource,
}));

<ResponsiveContainer width="100%" height={320}>
  <BarChart data={rows}>
    <XAxis dataKey="date" />
    <YAxis allowDecimals={false} />
    <Tooltip />
    <Legend />
    {LEAD_SOURCE_ORDER.map((source) => (
      <Bar
        key={source}
        dataKey={source}
        name={LEAD_SOURCE_LABELS[source]}
        stackId="leads"
      />
    ))}
  </BarChart>
</ResponsiveContainer>;
```

## CORS note

Browser fetches from `stacked-chart.html` require the API to allow your dashboard origin. For local file opens, use sample data or serve the docs folder from the same origin as the API.
