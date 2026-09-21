// /admin/matches — 매칭 대기 큐.
//
// 우리 게임 하나와 스토어 상품 하나가 같은 것인지 사람이 판정하는 자리다. 이름이 충분히 닮으면
// 수집이 이미 이었고, 아주 안 닮으면 후보로도 안 남는다. 여기 서는 건 그 사이뿐이다.
//
// `/admin` 안에 섞여 있던 자리를 뗐다 — 수집 현황은 읽고 지나가는 화면이라 보는 주기가 다르고,
// 메뉴가 "남은 일" 배지를 붙이려면 이 큐에 제 주소가 있어야 한다.
import type { Metadata } from "next";
import Link from "next/link";
import { MatchReviewButtons } from "@/components/admin/match-review-buttons";
import { Card, PageHead, SectionHead } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { MATCH_MESSAGES, sourceLabel } from "@/lib/admin/messages";
import { countPendingMatches, listPendingMatches } from "@/server/services/admin";
import { AUTO_MATCH_THRESHOLD, PENDING_MATCH_THRESHOLD } from "@/server/sync/match";
import { requireRoleOrForbid } from "@/server/auth/guards";

export const metadata: Metadata = { title: MATCH_MESSAGES.title };

// 우리 제목과 스토어 제목을 같은 너비로 나란히 둔다 — 검수자가 두 이름을 눈으로 맞대는 것이 이 화면의 일이다
const QUEUE_COLS = "grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px_minmax(0,1.4fr)_72px_132px] gap-x-3 px-4 py-[13px]";

export default async function AdminMatchesPage() {
  await requireRoleOrForbid("admin");
  const [pending, total] = await Promise.all([listPendingMatches(), countPendingMatches()]);

  return (
    <>
      <section className="flex flex-col gap-2">
        <PageHead title={MATCH_MESSAGES.title} />
        <p className="max-w-[620px] text-[13px] text-mut">{MATCH_MESSAGES.lead}</p>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead
          // 남은 수와 지금 화면에 실은 수는 다르다 — 상한에 걸렸을 때 그 사실을 감추면
          // 관리자는 다 처리했다고 믿고 화면을 닫는다
          title={MATCH_MESSAGES.note(pending.length, total)}
          note={MATCH_MESSAGES.similarity(PENDING_MATCH_THRESHOLD, AUTO_MATCH_THRESHOLD)}
        />
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface p-6 text-[13px] text-mut">
            {MATCH_MESSAGES.empty}
          </p>
        ) : (
          <Card className="overflow-x-auto">
            <div className={`${QUEUE_COLS} min-w-[960px] border-b border-line text-[11.5px] text-dim`}>
              <span>{MATCH_MESSAGES.colOurTitle}</span>
              <span>{MATCH_MESSAGES.colStoreTitle}</span>
              <span>{MATCH_MESSAGES.colSource}</span>
              <span>{MATCH_MESSAGES.colExternal}</span>
              <span>{MATCH_MESSAGES.colConfidence}</span>
              <span>{MATCH_MESSAGES.colAction}</span>
            </div>
            <ul className="min-w-[960px] divide-y divide-line-soft">
              {pending.map((p) => (
                <li key={`${p.gameId}-${p.source}`} className={`${QUEUE_COLS} items-center text-[13px] text-ink`}>
                  <span className="min-w-0">
                    <Link href={`/admin/games/${p.gameId}`} className="font-medium hover:text-acc">
                      <Clamp>{p.game.titleKo ? `${p.game.titleKo} (${p.game.titleEn})` : p.game.titleEn}</Clamp>
                    </Link>
                  </span>
                  {/* 매칭한 순간의 제목이다. 여기가 다른 게임 이름이면 그대로 무르면 된다 */}
                  <span className="min-w-0 text-mut">
                    {p.matchedTitle ? <Clamp>{p.matchedTitle}</Clamp> : <span className="text-dim-2">{MATCH_MESSAGES.noStoreTitle}</span>}
                  </span>
                  <span className="min-w-0 text-mut">
                    <Clamp>{sourceLabel(p.source)}</Clamp>
                  </span>
                  <span className="min-w-0 font-mono text-[12px] text-mut">
                    <Clamp className="inline-block max-w-full align-bottom">{p.externalId}</Clamp>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer" className="ml-2 font-sans text-acc hover:underline">
                        {MATCH_MESSAGES.open}
                        <span className="sr-only"> (새 창에서 열림)</span>
                      </a>
                    )}
                  </span>
                  <span className="text-mut">{p.confidence ?? "-"}</span>
                  <MatchReviewButtons gameId={p.gameId} source={p.source} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}
