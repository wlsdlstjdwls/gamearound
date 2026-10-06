// 게임 상세의 "개발자가 직접 소개해요" 마디 — 관리자가 연결을 확인한 인디 홍보 글만 선다(services/indie/read 주석).
// 글이 없으면 마디째 안 그린다 — 대부분의 게임에는 없는 칸이라 빈 제목이 서면 고장으로 읽힌다.
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { IndieStageBadge } from "@/components/indie/stage-badge";
import { Clamp } from "@/components/ui/tooltip";
import { SectionHead, sectionCardClass } from "@/components/ui/page";
import { indiePath } from "@/lib/routes";
import { INDIE_MESSAGES as M } from "@/lib/indie/messages";
import { listIndieForGame } from "@/server/services/indie";

export async function IndieGameSection({ gameId }: { gameId: string }) {
  const posts = await listIndieForGame(gameId);
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="indie-game-heading" className={sectionCardClass("flex flex-col gap-3")}>
      <SectionHead id="indie-game-heading" title={M.gameSectionTitle} />
      <ul className="flex flex-col gap-3">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={indiePath(p.slug)} className="group row-hover -mx-1.5 flex items-start gap-3.5 rounded-lg px-1.5 py-1.5">
              <span className="relative aspect-[460/215] w-[140px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-surface-3">
                <CoverImage src={p.cover?.url ?? null} alt={M.coverAlt(p.title)} sizes="140px" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <IndieStageBadge stage={p.stage} />
                  <span className="text-[12.5px] text-dim">{p.developerName}</span>
                </span>
                <Clamp lines={2} className="text-[14px] leading-[1.5] text-ink group-hover:text-acc">
                  {p.tagline}
                </Clamp>
                <span className="text-[12.5px] text-acc">{M.gameSectionMore}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
