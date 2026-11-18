// 패치 본문 번역의 판단 규칙 — DB, 네트워크 없이 테스트하려고 순수 함수로만 모았다(plan.test).
//
// 한 기록이 갈 수 있는 길은 다섯이다(PatchBodyStatus). 번역하지 않는 길도 모두 "끝난 것" 으로 남겨
// 대기열(body_status is null)에서 빠지게 한다 — 안 그러면 같은 기록을 회차마다 다시 받는다.
import { chunkForTranslation, type TextChunk } from "@/server/adapters/translate/chunk";
import { cleanSteamPatchBody } from "@/server/adapters/steam/clean-patch-body";
import { DEEPL_CHUNK_MAX_CHARS } from "@/server/adapters/translate/constants";
import { hasHangul } from "@/lib/slug";
import { PATCH_TRANSLATE_BODY_MAX_CHARS, PATCH_TRANSLATE_FAIL_MAX } from "@/server/sync/constants";

/**
 * patch_notes.body_status 값. null 은 대기다.
 *   done       DeepL 로 옮겼다
 *   source_ko  스토어가 처음부터 한국어로 줬다(body_ko = body_en)
 *   empty      그림, 영상뿐이라 다듬고 나니 글이 없다
 *   too_long   PATCH_TRANSLATE_BODY_MAX_CHARS 를 넘어 원문만 담았다
 *   missing    스토어 피드의 최근 공지 안에 이 글이 더는 없다(오래된 기록)
 *   failed     PATCH_TRANSLATE_FAIL_MAX 번 실패했다
 */
export const PATCH_BODY_STATUSES = ["done", "source_ko", "empty", "too_long", "missing", "failed"] as const;
export type PatchBodyStatus = (typeof PATCH_BODY_STATUSES)[number];

/**
 * 한국어 공지로 볼 한글 비율(글자 중 한글 음절). lib/slug 의 hasHangul(한 글자라도 있으면 참) 만으로 가르지 않는 이유:
 * 영어 패치 노트가 지원 언어를 적으며 "한국어" 를 한 번 쓰는 일이 흔하다 — 그걸 한국어 공지로 보면 번역이 통째로 빠진다.
 */
const KOREAN_BODY_RATIO = 0.3;

/** 본문이 이미 한국어인가. 한글이 아예 없으면 hasHangul 로 바로 거짓이다 */
export function isKoreanBody(text: string): boolean {
  if (!hasHangul(text)) return false;
  const hangul = text.match(/[가-힣]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
  return hangul / Math.max(1, hangul + latin) >= KOREAN_BODY_RATIO;
}

export type BodyPlan =
  | { kind: "empty" }
  | { kind: "source_ko"; body: string }
  | { kind: "too_long"; body: string }
  | {
      kind: "translate";
      body: string;
      chunks: TextChunk[];
      /** 본문과 함께 옮길 제목. 한글 제목이 이미 있거나 제목이 한국어면 null */
      title: string | null;
      /** DeepL 에 보낼 글자 수(본문 조각 + 제목). 예산은 이 값으로 본다 */
      chars: number;
    };

/** 스토어가 준 본문 하나를 어떻게 다룰지 정한다 */
export function planBody(rawContents: string, note: { title: string; titleKo: string | null }, maxChars: number = PATCH_TRANSLATE_BODY_MAX_CHARS): BodyPlan {
  const body = cleanSteamPatchBody(rawContents);
  if (body.length === 0) return { kind: "empty" };
  if (isKoreanBody(body)) return { kind: "source_ko", body };
  if (body.length > maxChars) return { kind: "too_long", body };
  const chunks = chunkForTranslation(body, DEEPL_CHUNK_MAX_CHARS);
  const title = note.titleKo === null && !hasHangul(note.title) && note.title.trim().length > 0 ? note.title : null;
  return { kind: "translate", body, chunks, title, chars: body.length + (title?.length ?? 0) };
}

/** 이번 회차가 지금까지 본 예산. deeplRemaining 은 DeepL /v2/usage 로 본 남은 몫(못 읽으면 null) */
export interface Budget {
  usedToday: number;
  usedMonth: number;
  deeplRemaining: number | null;
}

export interface BudgetLimits {
  daily: number;
  monthly: number;
  /** DeepL 실제 남은 몫에서 늘 남겨 둘 글자 수 */
  reserve: number;
}

/** chars 를 더 써도 세 한도(하루, 달, DeepL 실제 남은 몫) 안인가 */
export function fitsBudget(b: Budget, chars: number, limits: BudgetLimits): boolean {
  if (b.usedToday + chars > limits.daily) return false;
  if (b.usedMonth + chars > limits.monthly) return false;
  if (b.deeplRemaining !== null && b.deeplRemaining - chars < limits.reserve) return false;
  return true;
}

/** 쓴 만큼 예산을 줄인 새 값 */
export function spend(b: Budget, chars: number): Budget {
  return {
    usedToday: b.usedToday + chars,
    usedMonth: b.usedMonth + chars,
    deeplRemaining: b.deeplRemaining === null ? null : b.deeplRemaining - chars,
  };
}

/** 실패 한 번을 더한 뒤의 횟수와 상태. 한도에 닿으면 'failed' 로 접어 대기열에서 뺀다 */
export function afterFailure(prevCount: number, max: number = PATCH_TRANSLATE_FAIL_MAX): { count: number; status: PatchBodyStatus | null } {
  const count = prevCount + 1;
  return { count, status: count >= max ? "failed" : null };
}
