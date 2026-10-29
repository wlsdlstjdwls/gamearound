// /admin/matches — 스토어매칭승인관리(매칭 대기 큐).
//
// 우리 게임 하나와 스토어 상품 하나가 같은 것인지 사람이 판정하는 자리다. 이름이 충분히 닮으면
// 수집이 이미 이었고, 아주 안 닮으면 후보로도 안 남는다. 여기 서는 건 그 사이뿐이다.
//
// 화면 구성은 백오피스 승인 화면 꼴(components/admin/matches-screen). 여기는 읽어서 줄로 바꿔 넘기기만 한다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { MatchesScreen, type MatchRow } from "@/components/admin/matches-screen";
import { MATCH_MESSAGES, sourceLabel, ADMIN_NAV } from "@/lib/admin/messages";
import { countPendingMatches, listPendingMatches } from "@/server/services/admin";
import { AUTO_MATCH_THRESHOLD, PENDING_MATCH_THRESHOLD } from "@/server/sync/match";
import { requireRoleOrForbid } from "@/server/auth/guards";

export const metadata: Metadata = { title: ADMIN_NAV.matches };

export default async function AdminMatchesPage() {
  await requireRoleOrForbid("admin");
  const [pending, total] = await Promise.all([listPendingMatches(), countPendingMatches()]);
  const rows: MatchRow[] = pending.map((p) => ({
    key: `${p.gameId}-${p.source}`,
    gameId: p.gameId,
    title: p.game.titleKo ?? p.game.titleEn,
    titleEn: p.game.titleEn,
    storeTitle: p.matchedTitle,
    source: p.source,
    sourceLabel: sourceLabel(p.source),
    externalId: p.externalId,
    url: p.url,
    confidence: p.confidence === null ? null : Number(p.confidence),
  }));

  return (
    <>
      {/* 남은 수와 지금 화면에 실은 수는 다르다 — 상한에 걸렸을 때 그 사실을 감추면 관리자는 다 처리했다고 믿고 화면을 닫는다 */}
      <AdminScreenHead
        title={ADMIN_NAV.matches}
        count={pending.length}
        note={`${MATCH_MESSAGES.note(pending.length, total)} | ${MATCH_MESSAGES.similarity(PENDING_MATCH_THRESHOLD, AUTO_MATCH_THRESHOLD)}`}
      />
      <MatchesScreen rows={rows} />
    </>
  );
}
