// 데이터 점검기의 구조 규칙 둘 — 2026-11-03 옛 DB 병합 뒤 손으로 고친 꼴을 옮겼다(사용자: "이런 것도 자동화 가능?").
//
//   game_with_parent  본편(game)인데 부모가 달린 행. 148행이었다. 부모 제목으로 시작하면 그 본편의 에디션, 묶음, 업그레이드라
//                     갈래만 바꾸면 되고(auto), 제목이 딴판이면 엉뚱한 부모라 떼야 한다(candidate — Bus Simulator 27 이
//                     EA FC 27 밑, 뱅가드가 월드 앳 워 밑에 있었다).
//   duplicate_title   같은 제목 본편이 두 줄인 것. 158쌍을 합쳤다. 합치기는 가격 이력, 자식, 연결을 옮기는 큰 일이라
//                     (scripts/merge-store-duplicates) 고침을 내지 않고 알림만 한다. 같은 제목의 다른 게임도 있다
//                     (일본 닌텐도는 스위치 1, 2 판을 같은 이름 다른 번호로 판다) — 스토어 번호가 갈리면 올리지 않는다.
//
// rules.ts 와 같은 약속: DB 를 모른다, 판정만 돌려준다, 사례는 테스트 픽스처로 남긴다.
import type { ContentType } from "@/server/db/schema";
import { isWordPrefix, titleWords, type QualityFinding, type QualityGame } from "./rules";

/** 제목으로 갈래를 정한다. 업그레이드는 본편 소유자가 사는 추가 상품이고, 여러 작품을 담은 것은 묶음이다 */
const UPGRADE_WORDS = /\bupgrade\b|アップグレード|업그레이드/i;
const BUNDLE_WORDS = /\b(bundle|collection|trilogy|triple|saga|pack)\b|\+|번들|합본/i;

export function variantTypeOf(title: string): ContentType {
  if (UPGRADE_WORDS.test(title)) return "dlc";
  if (BUNDLE_WORDS.test(title)) return "bundle";
  return "edition";
}

export function findGamesWithParent(games: readonly QualityGame[], lockedParent: ReadonlySet<string>): QualityFinding[] {
  const byId = new Map(games.map((g) => [g.id, g]));
  const out: QualityFinding[] = [];
  for (const g of games) {
    if (g.contentType !== "game" || !g.parentGameId || g.parentGameId === g.id) continue;
    const parent = byId.get(g.parentGameId);
    if (!parent) continue;
    const words = titleWords(g.titleEn);
    const parentWords = titleWords(parent.titleEn);
    // 제목이 똑같으면 갈래 문제가 아니라 중복이다 — duplicate_title 몫
    if (words === parentWords) continue;
    if (isWordPrefix(parentWords, words)) {
      const to = variantTypeOf(g.titleEn);
      out.push({
        rule: "game_with_parent",
        verdict: lockedParent.has(g.id) ? "candidate" : "auto",
        subjectKey: g.id,
        gameId: g.id,
        reason: `"${g.titleEn}" 이 본편으로 앉아 "${parent.titleEn}" 밑에 있어요. 제목대로 ${to} 로 바꿔요`,
        fix: { kind: "set_content_type", gameId: g.id, from: "game", to },
      });
    } else {
      out.push({
        rule: "game_with_parent",
        verdict: "candidate",
        subjectKey: g.id,
        gameId: g.id,
        reason: `본편 "${g.titleEn}" 이 제목이 다른 "${parent.titleEn}" 밑에 있어요. 고치면 부모를 떼요`,
        fix: { kind: "promote_game", gameId: g.id, from: parent.id },
      });
    }
  }
  return out;
}

/** 옛 DB 병합이 겹친 slug 에 붙인 꼬리(게임 id 앞 8자리) */
const MERGE_SUFFIX = /-[0-9a-f]{8}$/;

export interface StoreIds {
  /** 게임 id → { 스토어: 확정 상품 번호 } */
  get(gameId: string): Record<string, string> | undefined;
}

export function findDuplicateTitles(games: readonly QualityGame[], storeIds: StoreIds): QualityFinding[] {
  const byTitle = new Map<string, QualityGame[]>();
  for (const g of games) {
    if (g.contentType !== "game" || g.parentGameId) continue;
    const w = titleWords(g.titleEn);
    if (w) byTitle.set(w, [...(byTitle.get(w) ?? []), g]);
  }
  const out: QualityFinding[] = [];
  for (const list of byTitle.values()) {
    if (list.length !== 2) continue;
    const [a, b] = list;
    const ia = storeIds.get(a.id) ?? {};
    const ib = storeIds.get(b.id) ?? {};
    if (Object.entries(ia).some(([s, id]) => ib[s] && ib[s] !== id)) continue;
    // 남길 쪽은 꼬리 없는 주소다. 둘 다 꼬리가 없으면 짧은 쪽(스토어 번호 꼬리가 붙은 쪽을 지운다)
    const [lose, keep] = MERGE_SUFFIX.test(a.slug ?? "") || (a.slug ?? "").length > (b.slug ?? "").length ? [a, b] : [b, a];
    out.push({
      rule: "duplicate_title",
      verdict: "notify",
      subjectKey: [a.id, b.id].sort().join(":"),
      gameId: keep.id,
      reason: `같은 제목 본편 "${keep.titleEn}" 이 두 줄이에요(${keep.slug}, ${lose.slug}). 합치기: dedup:stores --pair ${lose.slug}:${keep.slug}`,
      fix: null,
    });
  }
  return out;
}
