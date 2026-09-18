// 기기 입력 검증 — 서버(액션)와 클라이언트(폼)가 같은 스키마 하나를 본다(AGENTS §2).
//
// 비회원의 기기도 이 모양을 그대로 쓴다. 브라우저에 저장했다가 로그인하면 계정으로 옮기는데,
// 두 곳의 모양이 다르면 그 이사가 조용히 값을 흘린다.
import { z } from "zod";

/** 한 사람이 등록할 수 있는 기기 수. 화면에서 고르는 일이 일이 되지 않는 선이다 */
export const DEVICE_LIMIT = 10;

/** 비회원 기기를 담는 브라우저 열쇠. 판(版)을 붙여 두면 모양이 바뀔 때 옛 값을 버릴 수 있다 */
export const GUEST_DEVICE_STORAGE_KEY = "gamearound.device.v1";

export const DEVICE_LABEL_MAX = 24;
/** 32GB 를 넘겨 적는 사람은 거의 없지만 막을 이유도 없다. 상한은 오타를 거르는 선이다(1TB) */
export const RAM_MB_MAX = 1024 * 1024;
export const STORAGE_MB_MAX = 100 * 1024 * 1024;

export const deviceSchema = z.object({
  label: z.string().trim().min(1, "기기 이름을 적어 주세요.").max(DEVICE_LABEL_MAX, `${DEVICE_LABEL_MAX}자까지 쓸 수 있어요.`),
  osFamily: z.enum(["windows", "mac", "linux"]),
  // 부품은 안 고를 수 있다. 그 부위만 판정에서 빠지고 나머지는 그대로 답한다(설계 §6)
  cpuModelKey: z.string().trim().max(60).nullable().default(null),
  gpuModelKey: z.string().trim().max(60).nullable().default(null),
  ramMb: z.number().int().positive().max(RAM_MB_MAX).nullable().default(null),
  storageFreeMb: z.number().int().positive().max(STORAGE_MB_MAX).nullable().default(null),
  isPrimary: z.boolean().default(false),
});

export type DeviceFormValues = z.infer<typeof deviceSchema>;

/** GB 로 받아 MB 로 저장한다 — 사람은 GB 로 말하고 사양 문구는 MB 로 재기 때문이다 */
export function gbToMb(gb: number | null): number | null {
  return gb === null || !Number.isFinite(gb) || gb <= 0 ? null : Math.round(gb * 1024);
}

export function mbToGb(mb: number | null): number | null {
  return mb === null ? null : Math.round((mb / 1024) * 10) / 10;
}
