// 사이트 설정 읽기, 쓰기(schema-settings). 관리자 화면이 쓰고, 공개 화면이 읽는다.
//
// 읽기는 캐시한다(태그 SETTINGS_TAG). 명예의 전당처럼 ISR 화면이 매 요청 DB 를 오가지 않게 하고,
// 저장할 때 태그와 그 화면 경로를 밀어 바로 반영한다. 값이 없거나 모양이 틀리면 lib 의 기본값으로 물러난다 — 이 표 때문에 화면이 깨지면 안 된다.
import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { siteSettings } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import { FAME_INTRO_DEFAULTS, parseFameIntroSettings, type FameIntroSettings } from "@/lib/indie/fame-intro";

/** 설정 이름. DB 키와 같다 */
export const SETTING_KEYS = { fameIntro: "fame_intro" } as const;

/** 설정 캐시 태그. 저장 액션이 민다 */
export const SETTINGS_TAG = "site-settings";

/** 캐시 수명(초). 저장이 태그를 밀어 바로 바뀌므로 이 값은 태그가 빠졌을 때의 안전판이다 */
const SETTINGS_REVALIDATE_SECONDS = 3600;

async function readSetting(key: string): Promise<unknown> {
  const [row] = await getDb().select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return row?.value ?? null;
}

const readSettingCached = unstable_cache(readSetting, ["site-setting"], { tags: [SETTINGS_TAG], revalidate: SETTINGS_REVALIDATE_SECONDS });

/** 명예의 전당 1위 인트로 설정. 읽지 못하면 기본값(처음 한 번만) */
export async function getFameIntroSettings(): Promise<FameIntroSettings> {
  try {
    return parseFameIntroSettings(await readSettingCached(SETTING_KEYS.fameIntro));
  } catch (e) {
    console.warn(`[settings] fame_intro 읽기 실패, 기본값: ${String(e)}`);
    return FAME_INTRO_DEFAULTS;
  }
}

/** 관리자 저장. 값 검증은 부르는 쪽(액션)이 같은 스키마로 끝낸 뒤 넘긴다 */
export async function setFameIntroSettings(adminUserId: string, value: FameIntroSettings): Promise<void> {
  await getDb()
    .insert(siteSettings)
    .values({ key: SETTING_KEYS.fameIntro, value, ...createdBy("admin", adminUserId) })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, ...updatedBy("admin", adminUserId) } });
}
