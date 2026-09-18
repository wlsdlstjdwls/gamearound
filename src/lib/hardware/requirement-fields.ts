// 사양 라벨 사전과 스냅샷 조립 — 스토어가 둘 이상 되면서 뽑아낸 공통부.
//
// 처음에는 스팀 파서 안에 있었다. 에픽이 붙으면서 같은 것이 두 곳에 생겼고(AGENTS §3),
// 두 벌이 되면 한쪽에만 라벨이 추가되어 같은 게임의 사양이 스토어마다 다르게 읽힌다.
//
// **읽는 방식은 스토어마다 다르고 여기 없다.** 스팀은 `<strong>라벨:</strong> 값` 이 든 HTML 한 덩어리를,
// 에픽은 `{title, minimum, recommended}` 구조체를 준다. 각 어댑터가 자기 모양에서 (라벨, 값)을
// 뽑아 이 사전으로 접고, 조립은 여기 한 곳에서 한다.
import type { OsFamily, RequirementTier } from "@/server/db/schema";
import type { RequirementSnapshot } from "@/server/adapters/types";

/** 우리가 담는 칸. 모르는 라벨은 버리지 않고 note 로 모인다 */
export type RequirementField = "os" | "cpu" | "ram" | "gpu" | "vram" | "directx" | "storage" | "note";

/**
 * 우리 칸 → 그 칸으로 접을 라벨들(정규화된 형태). 실측에서 나온 변종을 그대로 담는다.
 * 라벨은 개발사가 손으로 적는 글이라 흔들린다 — 스팀 표본 60건에서 `OS *` 29회, `Hard Drive` 2회,
 * `DirectX®`, `DirectX Version`, `Sound` 가 각각 나왔다.
 */
const ALIASES: Record<RequirementField, string[]> = {
  os: ["os", "operating system", "os version", "minimum os", "os x"],
  cpu: ["processor", "cpu", "processor (cpu)"],
  ram: ["memory", "ram", "system memory"],
  gpu: ["graphics", "graphics card", "video card", "video", "gpu", "graphics (gpu)"],
  // 비디오 메모리를 따로 적어 주는 게임만 값이 찬다. GPU 이름 뒤에 붙은 "3 GB" 는 여기서 안 읽는다 —
  // 그건 그 후보 카드의 사양이지 요구 VRAM 이 아니고, 후보가 둘일 때 어느 쪽 값인지도 알 수 없다
  vram: ["video memory", "vram", "video ram", "graphics memory"],
  directx: ["directx", "directx version", "direct x"],
  storage: [
    "storage", "hard drive", "hard disk space", "hdd space", "disk space",
    "available space", "free disk space", "hard drive space",
  ],
  note: ["additional notes", "notes", "note"],
};

/** 뒤집은 지도 — 줄 하나를 볼 때마다 위 목록을 훑지 않는다 */
const LABEL_MAP = new Map<string, RequirementField>();
for (const [field, names] of Object.entries(ALIASES)) for (const n of names) LABEL_MAP.set(n, field as RequirementField);

/**
 * 라벨 정규화 — 소문자, 등록상표와 별표를 떼고 공백을 접는다.
 * 별표는 스팀이 "Windows 32bit 지원 종료" 주석을 달면서 붙이는 것이라 라벨의 일부가 아니다.
 */
export function normalizeRequirementLabel(raw: string): string {
  return raw.toLowerCase().replace(/[*®™:]/g, " ").replace(/\s+/g, " ").trim();
}

/** 라벨 → 칸. 모르는 라벨이면 null 이고, 호출부가 비고로 보낸다 */
export function requirementFieldOf(label: string): RequirementField | null {
  return LABEL_MAP.get(normalizeRequirementLabel(label)) ?? null;
}

/** MB 로 환산할 단위. TB 짜리 사양은 아직 없지만 적는 비용이 0 이다 */
const UNIT_MB: Record<string, number> = { kb: 1 / 1024, mb: 1, gb: 1024, tb: 1024 * 1024 };

/**
 * "12 GB RAM", "371 MB available space" → MB 정수.
 * **단위가 없으면 null 이다.** 실측 표본에 "256 RAM"(단위 없음)이 있었는데, 옛 게임이라 MB 가 맞겠지만
 * 맞겠다는 것은 값이 아니다 — 지어내면 판정이 조용히 틀린 답을 낸다(설계 §6 "모르면 모른다고 한다").
 */
export function parseSizeMb(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/(\d+(?:[.,]\d+)?)\s*(kb|mb|gb|tb)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * UNIT_MB[m[2].toLowerCase()]);
}

/** 판정에 쓰는 네 칸. 이 중 몇 개를 건졌는지가 곧 이 파싱을 얼마나 믿을지다 */
const CORE_FIELDS: RequirementField[] = ["os", "cpu", "gpu", "ram"];

/**
 * 모은 (칸, 값)을 스냅샷 하나로. 값이 하나도 없으면 null 이다.
 *
 * 비고만 있는 덩어리도 null 이다. 2026-09-18 실측으로 실제로 온다 — 노 맨즈 스카이의 권장 칸에는
 * "Requires a 64-bit processor" 한 줄뿐이고, ZeroSpace 의 리눅스 칸에는 "Available with Proton"
 * 뿐이다(리눅스 빌드가 없다는 뜻이다). 행을 만들면 화면에 값 없는 칸이 서서 수집이 덜 된 것처럼 보인다.
 */
export function buildRequirementSnapshot(
  values: Map<RequirementField, string>,
  notes: string[],
  meta: { osFamily: OsFamily; tier: RequirementTier; rawHtml: string; parseVersion: number },
): RequirementSnapshot | null {
  if (values.size === 0) return null;
  const got = CORE_FIELDS.filter((f) => values.has(f)).length;
  return {
    osFamily: meta.osFamily,
    tier: meta.tier,
    rawHtml: meta.rawHtml,
    osText: values.get("os") ?? null,
    cpuText: values.get("cpu") ?? null,
    gpuText: values.get("gpu") ?? null,
    directxText: values.get("directx") ?? null,
    noteText: notes.length > 0 ? notes.join(" | ") : null,
    ramMb: parseSizeMb(values.get("ram") ?? null),
    vramMb: parseSizeMb(values.get("vram") ?? null),
    storageMb: parseSizeMb(values.get("storage") ?? null),
    parseVersion: meta.parseVersion,
    // 네 칸 중 몇 개를 건졌나. 화면은 이 값을 적지 않지만, 파서를 고칠 때 어느 게임부터
    // 다시 볼지 이 값으로 고른다(낮은 순)
    parseConfidence: Math.round((got / CORE_FIELDS.length) * 100) / 100,
  };
}
