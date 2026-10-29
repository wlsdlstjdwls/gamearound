import { describe, expect, it } from "vitest";
import { joinSyncFilter, splitSyncFilter, syncFilterHref } from "@/lib/admin/sync-filter";

describe("sync-filter", () => {
  it("둘을 한 값으로 묶고 푼다", () => {
    expect(splitSyncFilter(joinSyncFilter("steam", "failed"))).toEqual(["steam", "failed"]);
    expect(splitSyncFilter("")).toEqual(["all", "all"]);
  });

  it("전체는 주소에 싣지 않는다", () => {
    expect(syncFilterHref("/admin/sync", joinSyncFilter("all", "all"))).toBe("/admin/sync");
    expect(syncFilterHref("/admin/sync", joinSyncFilter("steam", "all"))).toBe("/admin/sync?source=steam");
    expect(syncFilterHref("/admin/sync-logs", joinSyncFilter("all", "partial"))).toBe("/admin/sync-logs?status=partial");
    expect(syncFilterHref("/admin/sync", joinSyncFilter("psstore", "attention"))).toBe("/admin/sync?source=psstore&status=attention");
  });
});
