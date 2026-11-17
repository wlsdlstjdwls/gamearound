// 데이터 점검기의 고아 줄 규칙 — 화면에 스토어 링크가 걸린 플랫폼 줄인데, 그 상품을 가리키는 확정 연결(auto, manual)이 없는 것.
//
// 왜 문제인가: 정기 갱신은 연결(game_source_refs)을 따라 상품을 다시 묻는다. 연결이 none 으로 떨어지거나 다른 상품으로 바뀌면
// 그 줄은 다시는 갱신되지 않고, 마지막 값이 그대로 화면에 남는다. 2026-11-17 실측 583줄이었고 상품 이름을 대조해 보니
// 365줄이 엉뚱한 상품이었다(Minecraft Launcher 의 PS4 줄이 The Last of Us, HELLDIVERS 2 의 스위치 줄이 Windjammers 2).
// 전부 10-12 이전에 생겨 그 뒤로 멈춘 줄이었다 — 연결만 끊고 줄을 남기는 손(매칭 거절 등)이 있었다는 뜻이다.
//
// 판정을 candidate 로 두는 이유: 같은 날 대조에서 36줄은 맞는 상품이었다(연결만 끊겼다). 어느 쪽인지는 스토어 상품 이름을
// 봐야 정해져서 기계가 혼자 지우지 않는다. 사람이 보고 "적용" 하면 줄을 지우고, 맞는 상품이면 반려 후 매칭 화면에서 다시 잇는다.
//
// rules.ts 와 같은 약속: DB 를 모른다, 판정만 돌려준다, 사례는 테스트 픽스처로 남긴다.
import type { QualityFinding } from "./rules";

export interface OrphanStoreRow {
  /** 플랫폼 줄 id */
  id: string;
  gameId: string;
  titleEn: string;
  platform: string;
  externalId: string;
  /** 그 게임의 같은 스토어 연결 상태. 연결이 아예 없으면 null */
  refState: string | null;
  /** 연결이 가리키는 상품 번호(줄의 번호와 다르면 연결이 다른 상품으로 옮겨 간 것) */
  refExternalId: string | null;
}

function why(r: OrphanStoreRow): string {
  if (r.refState === null) return "스토어 연결이 없어요";
  if (r.refState === "none") return "스토어 연결이 끊겨 있어요(매칭 거절 또는 후보 없음)";
  if (r.refState === "pending") return "스토어 연결이 검수 대기예요";
  return `스토어 연결이 다른 상품(${r.refExternalId})을 가리켜요`;
}

export function findOrphanStoreRows(rows: readonly OrphanStoreRow[]): QualityFinding[] {
  return rows.map((r) => ({
    rule: "orphan_store_row" as const,
    verdict: "candidate" as const,
    subjectKey: r.id,
    gameId: r.gameId,
    reason: `"${r.titleEn}" 의 ${r.platform} 줄(상품 ${r.externalId})이 화면에 걸려 있는데 ${why(r)}. 값이 갱신되지 않아요. 다른 게임 상품이면 적용(줄 삭제), 맞는 상품이면 반려 후 매칭에서 다시 이어 주세요`,
    fix: { kind: "drop_platform_row" as const, platformRowId: r.id, gameId: r.gameId, externalId: r.externalId },
  }));
}
