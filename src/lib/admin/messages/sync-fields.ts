// "가져온 게임" 시트의 값 이름표. sync_logs.items 에는 컬럼 키(camelCase)가 담긴다 — 그걸 사람 말로 옮긴다.
//
// 컬럼 하나에 이름 하나를 주지 않고 **묶음**으로 모은다. 가격 한 번 바뀌면 listPrice, currentPrice,
// discountPct 가 한꺼번에 바뀌는데, 그걸 셋으로 적으면 한 줄이 배지로 넘친다. 관리자가 알고 싶은 건
// "가격이 바뀌었나" 까지다. DB 원값을 그대로 띄우지 않는다(관리자 화면 이름 규칙).
import { PLATFORM_ROW_FIELD, UNKNOWN_FIELD } from "@/lib/sync-item-fields";

/** 묶음 이름. 순서가 곧 시트에 서는 순서다 — 사람이 먼저 확인하는 값(가격)이 앞이다 */
export const SYNC_FIELD_GROUPS = [
  { label: "스토어 등록", keys: [PLATFORM_ROW_FIELD] },
  { label: "가격", keys: ["listPrice", "currentPrice", "currency"] },
  { label: "할인", keys: ["discountPct", "discountStartsAt", "discountEndsAt", "discountName"] },
  { label: "제목", keys: ["titleEn", "titleKo", "slug"] },
  { label: "이미지", keys: ["coverUrl", "portraitUrl"] },
  { label: "소개", keys: ["description"] },
  { label: "회사", keys: ["developer", "publisher"] },
  { label: "출시일", keys: ["releaseDate"] },
  { label: "버전", keys: ["currentVersion"] },
  { label: "유저 점수", keys: ["userScore", "userScoreKind", "userScoreCount"] },
  { label: "평론 점수", keys: ["opencriticScore", "metacriticScore"] },
  { label: "플레이 시간", keys: ["mainStoryHours", "mainExtraHours", "completionistHours"] },
  { label: "인기", keys: ["hltbLoggedCount"] },
  { label: "멀티플레이", keys: ["supportsSolo", "supportsCoop", "supportsPvp", "localMaxPlayers", "onlineMaxPlayers"] },
  { label: "스팀덱, 지원 OS", keys: ["deckCompat", "nativeWindows", "nativeMac", "nativeLinux"] },
  { label: "추가 콘텐츠", keys: ["hasAddOns"] },
  { label: "종류", keys: ["contentType"] },
  { label: "스토어 링크", keys: ["storeExternalId", "storeUrl", "titleCode"] },
  { label: "기타", keys: [UNKNOWN_FIELD] },
] as const;

/** 위 표에 없는 키. 새 컬럼을 반영 단계가 쓰기 시작했는데 여기를 안 고친 경우다 */
export const SYNC_FIELD_OTHER = "기타";
