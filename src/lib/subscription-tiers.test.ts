import { describe, expect, it } from "vitest";
import { foldSubscriptionTiers } from "./subscription-tiers";

const s = (key: string) => ({ key, label: key });
const view = (keys: string[]) => foldSubscriptionTiers(keys.map(s)).map((c) => `${c.sub.key}${c.orHigher ? "+" : ""}`);

describe("구독 등급 접기", () => {
  it("스페셜과 디럭스가 함께면 스페셜 이상 하나만 선다", () => {
    expect(view(["psplus_deluxe", "psplus_special"])).toEqual(["psplus_special+"]);
  });
  it("맨 위 등급만 있으면 이상을 붙이지 않는다", () => {
    expect(view(["psplus_deluxe"])).toEqual(["psplus_deluxe"]);
    expect(view(["gamepass_console"])).toEqual(["gamepass_console"]);
  });
  it("Essential 에 든 게임은 Essential 이상 하나다", () => {
    expect(view(["gamepass_console", "gamepass_essential", "gamepass_pc"])).toEqual(["gamepass_essential+", "gamepass_pc"]);
  });
  it("사다리 밖 구독은 그대로 선다", () => {
    expect(view(["psplus_special", "ea_play_ps", "ubisoft_plus_ps"])).toEqual(["psplus_special+", "ea_play_ps", "ubisoft_plus_ps"]);
  });
});
