// 기기를 주소에 싣는 값 — 목록의 "내 기기로 돌아가요" 필터가 쓰는 한 칸.
//
// **왜 기기 id 가 아니라 티어를 싣나.** 세 가지 이유가 한 방향을 가리킨다.
//   1) 비회원의 기기는 브라우저에만 있다. 서버가 id 로 되찾을 수 있는 값이 아니다(설계 §4)
//   2) 목록은 필터 조합마다 캐시된다(services/games/list). id 를 실으면 캐시가 사람 수만큼 쪼개지는데,
//      티어를 실으면 **같은 급의 컴퓨터를 쓰는 사람들이 같은 캐시를 나눠 쓴다**
//   3) 주소가 곧 상태다 — 이 링크를 그대로 보내면 받은 사람도 같은 목록을 본다
//
// 사전이 좋아지면 같은 기기가 다른 티어로 접힐 수 있다. 그래도 낡은 주소가 깨지지는 않는다 —
// 그 주소는 "그때의 급" 으로 답할 뿐이고, 칩을 다시 누르면 새 값이 실린다.
import type { OsFamily } from "@/server/db/schema";
import { findModel } from "./index";
import type { DeviceSpec } from "./verdict";

/** 주소에서 되찾은 기기. 문턱(game_requirement_floors)과 그대로 견준다 */
export type RigSpec = {
  osFamily: OsFamily;
  cpuTier: number | null;
  gpuTier: number | null;
  ramMb: number | null;
};

/** 모르는 값 자리. 빈 칸으로 두면 "w..16" 처럼 읽기 어려워진다 */
const UNKNOWN = "-";

const OS_CODE: Record<OsFamily, string> = { windows: "w", mac: "m", linux: "l" };
const OS_BY_CODE: Record<string, OsFamily> = { w: "windows", m: "mac", l: "linux" };

/** 티어표가 자랄 수 있는 한도. 주소로 들어온 값이 이 범위 밖이면 장난으로 보고 버린다 */
const MAX_TIER = 99;
/** 메모리 상한(GB). 실제 기기의 값이 아니라 "이보다 크면 입력이 아니다" 는 선이다 */
const MAX_RAM_GB = 1024;

function num(raw: string, max: number): number | null {
  if (raw === UNKNOWN) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n <= max ? n : null;
}

/**
 * 기기 → 주소에 실을 값. 모양은 `<os>.<cpu티어>.<gpu티어>.<메모리GB>` 다.
 *
 * 판정에 쓸 값이 하나도 없으면 null 이다 — 아무것도 못 거르는 필터를 주소에 남기지 않는다.
 * 저장공간은 싣지 않는다: 남은 용량은 게임 하나 지우면 바뀌는 값이라 주소에 굳혀 둘 값이 아니고,
 * 목록에서 "설치할 자리가 없다" 는 이유로 게임이 사라지면 그 이유를 화면에서 읽을 방법도 없다.
 */
export function encodeRig(device: DeviceSpec & { osFamily: OsFamily }): string | null {
  const cpuTier = device.cpuModelKey ? findModel("cpu", device.cpuModelKey)?.tier ?? null : null;
  const gpuTier = device.gpuModelKey ? findModel("gpu", device.gpuModelKey)?.tier ?? null : null;
  const ramGb = device.ramMb ? Math.round(device.ramMb / 1024) : null;
  if (cpuTier === null && gpuTier === null && ramGb === null) return null;
  return [
    OS_CODE[device.osFamily],
    cpuTier ?? UNKNOWN,
    gpuTier ?? UNKNOWN,
    ramGb ?? UNKNOWN,
  ].join(".");
}

/** 주소의 값 → 기기. 모양이 어긋나면 null 이고 그때 필터는 아예 안 걸린다(모르는 값은 조용히 버린다) */
export function parseRig(raw: string | undefined): RigSpec | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const osFamily = OS_BY_CODE[parts[0]];
  if (!osFamily) return null;
  const cpuTier = num(parts[1], MAX_TIER);
  const gpuTier = num(parts[2], MAX_TIER);
  const ramGb = num(parts[3], MAX_RAM_GB);
  if (cpuTier === null && gpuTier === null && ramGb === null) return null;
  return { osFamily, cpuTier, gpuTier, ramMb: ramGb === null ? null : ramGb * 1024 };
}
