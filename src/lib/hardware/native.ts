// "이 게임에 그 OS 빌드가 있나" — 사양 설계 문서 §5.
//
// 사양보다 이 질문이 먼저다. 맥 빌드가 없으면 맥 사양을 견줄 이유가 없고,
// 반대로 빌드가 있는데 스토어가 맥 사양을 따로 안 적었다고 해서 "지원 안 함" 이 되면 안 된다.
//
// 지금까지 화면은 **사양 행이 없다** 는 사실로 지원 여부를 추측했다. 그 추측이 틀리는 자리가 둘이다.
// 하나, 맥 빌드가 있는데 스토어가 사양을 윈도우 하나로만 적은 게임(실측에 흔하다).
// 둘, 사양 자체를 아무도 안 적은 게임 — 그때는 윈도우조차 "지원 안 함" 이 된다.
// 스토어가 플랫폼 지원을 따로 알려 주므로(game_platforms 의 native_*) 그 값을 그대로 쓴다.
import type { OsFamily } from "@/server/db/schema";

/** 그 OS 빌드가 있나. `unknown` 은 "스토어가 말을 안 했다" 지 "없다" 가 아니다 */
export type NativeSupport = "yes" | "no" | "unknown";

/** 판정에 쓰는 플랫폼 한 줄. 화면 DTO(PlatformDto)의 부분집합이라 그대로 넘겨 쓸 수 있다 */
export type NativeFlags = {
  nativeWindows: boolean | null;
  nativeMac: boolean | null;
  nativeLinux: boolean | null;
};

const FIELD: Record<OsFamily, keyof NativeFlags> = {
  windows: "nativeWindows",
  mac: "nativeMac",
  linux: "nativeLinux",
};

/**
 * 스토어 여럿이 말한 것을 하나로 접는다. **한 곳이라도 있다고 하면 있는 것이다** —
 * 에픽에 윈도우판만 올라온 게임이 스팀에는 맥판도 있는 일이 흔하고, 그때 사람이 사는 곳은 스팀이다.
 *
 * 콘솔 플랫폼은 세 값이 모두 null 이라 아무 말도 보태지 않는다. 그래서 PC 가 없는 게임은
 * 언제나 `unknown` 이고, 화면은 단정하지 않는다.
 */
export function nativeSupport(platforms: NativeFlags[], osFamily: OsFamily): NativeSupport {
  const key = FIELD[osFamily];
  let sawFalse = false;
  for (const p of platforms) {
    const v = p[key];
    if (v === true) return "yes";
    if (v === false) sawFalse = true;
  }
  return sawFalse ? "no" : "unknown";
}
