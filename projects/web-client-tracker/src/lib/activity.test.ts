import { describe, expect, it } from "vitest";
import {
  appendActivities,
  createActivity,
  formatActivitySummary,
  getClientTimeline,
  hasReminderActivity,
  isValidNoteInput,
} from "./activity";
import type { Client } from "./types";

const baseClient: Client = {
  id: "c1",
  name: "Test Client",
  company: "Acme",
  email: "test@acme.com",
  status: "active",
  nextFollowUp: "2026-08-01",
};

describe("activity helpers", () => {
  it("appends activities to a client record", () => {
    const note = createActivity("note", { text: "Intro call went well" });
    const updated = appendActivities(baseClient, [note]);

    expect(updated.activities).toHaveLength(1);
    expect(updated.activities?.[0].text).toBe("Intro call went well");
  });

  it("sorts timeline newest first", () => {
    const older = createActivity("note", {
      text: "Older",
      createdAt: "2026-07-01T10:00:00.000Z",
    });
    const newer = createActivity("note", {
      text: "Newer",
      createdAt: "2026-07-05T10:00:00.000Z",
    });
    const client = appendActivities(baseClient, [older, newer]);
    const timeline = getClientTimeline(client);

    expect(timeline[0].text).toBe("Newer");
    expect(timeline[1].text).toBe("Older");
  });

  it("backfills legacy reminder dates into the timeline", () => {
    const client: Client = {
      ...baseClient,
      lastReminderAt: "2026-07-03",
    };

    expect(hasReminderActivity(client)).toBe(false);
    const timeline = getClientTimeline(client);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe("reminder_sent");
  });

  it("formats status change summaries", () => {
    const entry = createActivity("status_changed", {
      meta: { from: "lead", to: "active" },
    });

    expect(formatActivitySummary(entry)).toBe("lead → active");
  });

  it("validates note input", () => {
    expect(isValidNoteInput("  hello  ")).toBe(true);
    expect(isValidNoteInput("")).toBe(false);
    expect(isValidNoteInput("   ")).toBe(false);
    expect(isValidNoteInput(null)).toBe(false);
  });
});
