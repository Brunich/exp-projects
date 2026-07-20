import {
  LEAD_SOURCE_LABELS,
  LEAD_SOURCE_ORDER,
  type StackedChartSeries,
} from "./lead-chart-series.js";
import type { WeeklyDigest } from "./weekly-digest.js";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 16, right: 16, bottom: 36, left: 40 };

export function buildDigestStackedBarChartSvg(
  chart: StackedChartSeries,
  options: { width?: number; height?: number } = {},
): string {
  const width = options.width ?? CHART_WIDTH;
  const height = options.height ?? CHART_HEIGHT;
  const plotWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const dayCount = chart.labels.length;

  if (dayCount === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="No lead data"><text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-size="14">No leads this week</text></svg>`;
  }

  const dailyTotals = chart.labels.map((_, index) =>
    chart.datasets.reduce((sum, dataset) => sum + dataset.data[index], 0),
  );
  const maxTotal = Math.max(...dailyTotals, 1);
  const barSlotWidth = plotWidth / dayCount;
  const barWidth = Math.max(12, barSlotWidth * 0.65);

  const bars: string[] = [];
  const labels: string[] = [];

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const centerX =
      CHART_PADDING.left + barSlotWidth * dayIndex + barSlotWidth / 2;
    const barLeft = centerX - barWidth / 2;
    let stackTop = CHART_PADDING.top + plotHeight;

    for (const dataset of chart.datasets) {
      const value = dataset.data[dayIndex];
      if (value <= 0) continue;

      const segmentHeight = (value / maxTotal) * plotHeight;
      stackTop -= segmentHeight;
      bars.push(
        `<rect x="${barLeft.toFixed(1)}" y="${stackTop.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${segmentHeight.toFixed(1)}" fill="${escapeHtml(dataset.backgroundColor)}" />`,
      );
    }

    labels.push(
      `<text x="${centerX.toFixed(1)}" y="${(height - 10).toFixed(1)}" text-anchor="middle" fill="#64748b" font-size="11">${escapeHtml(chart.labels[dayIndex])}</text>`,
    );
  }

  const yTicks = buildYAxisTicks(maxTotal);
  const gridLines = yTicks
    .map((tick) => {
      const y =
        CHART_PADDING.top + plotHeight - (tick / maxTotal) * plotHeight;
      return `<line x1="${CHART_PADDING.left}" y1="${y.toFixed(1)}" x2="${(width - CHART_PADDING.right).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" />
<text x="${(CHART_PADDING.left - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#94a3b8" font-size="10">${tick}</text>`;
    })
    .join("");

  const legend = chart.datasets
    .filter((dataset) => dataset.data.some((value) => value > 0))
    .map((dataset, index) => {
      const x = CHART_PADDING.left + index * 110;
      return `<g transform="translate(${x}, 4)">
  <rect width="10" height="10" rx="2" fill="${escapeHtml(dataset.backgroundColor)}" />
  <text x="16" y="9" fill="#334155" font-size="11">${escapeHtml(dataset.label)}</text>
</g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="Daily leads by source">
  <rect width="100%" height="100%" fill="#ffffff" />
  ${legend}
  ${gridLines}
  ${bars.join("\n  ")}
  ${labels.join("\n  ")}
</svg>`;
}

export function buildDigestEmailHtml(digest: WeeklyDigest): string {
  const { currentWeek, previousWeek, trends } = digest;
  const changeLabel = formatChangeLabel(trends.totalDelta, trends.totalPercentChange);
  const changeColor =
    trends.totalDelta > 0
      ? "#15803d"
      : trends.totalDelta < 0
        ? "#b91c1c"
        : "#64748b";
  const chartSvg = buildDigestStackedBarChartSvg(digest.chart);

  const sourceRows = LEAD_SOURCE_ORDER.map((source) => {
    const count = currentWeek.bySource[source];
    const delta = trends.bySourceDelta[source];
    const deltaLabel =
      delta === 0
        ? ""
        : `<span style="color:${delta > 0 ? "#15803d" : "#b91c1c"};font-size:12px;"> (${delta > 0 ? "+" : ""}${delta})</span>`;

    return `<tr>
  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(LEAD_SOURCE_LABELS[source])}</td>
  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#0f172a;">${count}${deltaLabel}</td>
</tr>`;
  }).join("");

  const highlights: string[] = [];
  if (trends.busiestDay) {
    highlights.push(
      `Busiest day: <strong>${escapeHtml(trends.busiestDay.date)}</strong> (${trends.busiestDay.count} leads)`,
    );
  }
  if (trends.topSource) {
    highlights.push(
      `Top source: <strong>${escapeHtml(LEAD_SOURCE_LABELS[trends.topSource])}</strong>`,
    );
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly lead digest</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 12px;">
              <p style="margin:0 0 4px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Weekly lead digest</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;">${escapeHtml(digest.period.label)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="padding:12px;background:#f8fafc;border-radius:8px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#64748b;">This week</p>
                    <p style="margin:0;font-size:24px;font-weight:700;">${currentWeek.total}</p>
                  </td>
                  <td width="8"></td>
                  <td width="33%" style="padding:12px;background:#f8fafc;border-radius:8px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#64748b;">Last week</p>
                    <p style="margin:0;font-size:24px;font-weight:700;">${previousWeek.total}</p>
                  </td>
                  <td width="8"></td>
                  <td width="33%" style="padding:12px;background:#f8fafc;border-radius:8px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#64748b;">Change</p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:${changeColor};">${escapeHtml(changeLabel)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${
            highlights.length > 0
              ? `<tr><td style="padding:0 28px 16px;font-size:14px;color:#475569;">${highlights.join(" &middot; ")}</td></tr>`
              : ""
          }
          <tr>
            <td style="padding:0 28px 8px;">
              <h2 style="margin:0 0 8px;font-size:15px;">Daily volume by source</h2>
              ${chartSvg}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <h2 style="margin:0 0 8px;font-size:15px;">By source</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                ${sourceRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
              Sent by Lead Capture API &middot; ${escapeHtml(digest.previousPeriod.label)} compared to prior week
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildYAxisTicks(maxValue: number): number[] {
  if (maxValue <= 4) {
    return Array.from({ length: maxValue + 1 }, (_, index) => index);
  }

  const step = Math.ceil(maxValue / 4);
  const ticks: number[] = [];
  for (let value = 0; value <= maxValue; value += step) {
    ticks.push(value);
  }
  if (ticks.at(-1) !== maxValue) {
    ticks.push(maxValue);
  }
  return ticks;
}

function formatChangeLabel(
  delta: number,
  percent: number | null,
): string {
  const sign = delta > 0 ? "+" : "";
  const percentLabel =
    percent === null ? "n/a" : `${percent >= 0 ? "+" : ""}${percent}%`;
  return `${sign}${delta} (${percentLabel})`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
