import { describe, expect, it } from "vitest";
import type { Lead } from "../types.js";
import { toStackedChartSeries } from "./lead-chart-series.js";
import { computeLeadStats } from "./lead-stats.js";
import {
  buildDigestEmailHtml,
  buildDigestStackedBarChartSvg,
} from "./weekly-digest-email-html.js";
import { buildWeeklyDigest } from "./weekly-digest.js";

function makeLead(overrides: Partial<Lead> & Pick<Lead, "email">): Lead {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Test User",
    source: "landing",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildDigestStackedBarChartSvg", () => {
  it("renders stacked bars and axis labels for chart data", () => {
    const chart = toStackedChartSeries([
      {
        date: "2026-07-18",
        count: 3,
        bySource: { landing: 1, referral: 1, ads: 1, other: 0 },
      },
      {
        date: "2026-07-19",
        count: 2,
        bySource: { landing: 0, referral: 2, ads: 0, other: 0 },
      },
    ]);

    const svg = buildDigestStackedBarChartSvg(chart);

    expect(svg).toContain("<svg");
    expect(svg).toContain('fill="#3b82f6"');
    expect(svg).toContain('fill="#22c55e"');
    expect(svg).toContain('fill="#f59e0b"');
    expect(svg).toContain("Jul 18");
    expect(svg).toContain("Jul 19");
    expect(svg).toContain("<rect");
  });

  it("shows a placeholder when there is no data", () => {
    const svg = buildDigestStackedBarChartSvg({
      labels: [],
      datasets: [],
    });

    expect(svg).toContain("No leads this week");
  });
});

describe("buildDigestEmailHtml", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");

  it("builds a table-based HTML email with inline chart and source rows", async () => {
    const digest = await buildWeeklyDigest(
      {
        stats: async () =>
          computeLeadStats(
            [
              makeLead({
                email: "prev@example.com",
                source: "landing",
                createdAt: "2026-07-10T10:00:00.000Z",
              }),
              makeLead({
                email: "curr1@example.com",
                source: "ads",
                createdAt: "2026-07-18T10:00:00.000Z",
              }),
              makeLead({
                email: "curr2@example.com",
                source: "ads",
                createdAt: "2026-07-19T10:00:00.000Z",
              }),
            ],
            { bucketDays: 14 },
            now,
          ),
      } as never,
      { now },
    );

    const html = buildDigestEmailHtml(digest);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Weekly lead digest");
    expect(html).toContain(digest.period.label);
    expect(html).toContain("Daily volume by source");
    expect(html).toContain("<svg");
    expect(html).toContain("Ads");
    expect(html).toContain("This week");
    expect(html).toContain("Last week");
    expect(html).toContain("Change");
  });

  it("escapes HTML in period labels", async () => {
    const digest = await buildWeeklyDigest(
      {
        stats: async () =>
          computeLeadStats(
            [
              makeLead({
                email: "a@example.com",
                createdAt: "2026-07-20T10:00:00.000Z",
              }),
            ],
            { bucketDays: 14 },
            now,
          ),
      } as never,
      { now },
    );

    const html = buildDigestEmailHtml({
      ...digest,
      period: {
        ...digest.period,
        label: 'Jul 14 – Jul 20 <script>alert("x")</script>',
      },
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
