// 게임 상세의 "예약 특전" 마디 — 판매처마다 다른 특전을 한눈에. 글이 없으면 마디째 안 그린다(대부분의 게임이 그렇다).
//
// 이미지는 unoptimized 로 원본 서버에서 바로 띄운다. 최적화를 태우면 Vercel 에 사본이 남는다 —
// 출처 약관이 사진 복제를 금해서 핫링크만 한다(schema-preorder 머리 주석).
// 출처와 원문 링크를 늘 붙인다. 링크는 자유지만 출처를 밝히라는 것이 같은 약관의 조건이다.
import Image from "next/image";
import { SectionHead, sectionCardClass } from "@/components/ui/page";
import { formatDate } from "@/lib/format";
import { PREORDER_MESSAGES as M } from "@/lib/preorder/messages";
import type { PreorderBonusDto } from "@/lib/preorder/dto";
import { listPreorderForGame } from "@/server/services/preorder-bonuses";

function BonusItem({ bonus }: { bonus: PreorderBonusDto }) {
  return (
    <li className="flex gap-3.5">
      <span className="relative size-[88px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-surface-3">
        {bonus.imageUrl && <Image src={bonus.imageUrl} alt={M.imageAlt(bonus.name)} fill sizes="88px" unoptimized className="object-cover" />}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[14.5px] font-semibold leading-[1.4] text-ink">
          {bonus.name}
          <span className="ml-2 text-[11.5px] font-normal text-dim">{M.edition[bonus.edition]}</span>
        </p>
        {bonus.retailers && (
          <p className="text-[13px] leading-[1.55] text-mut">
            <span className="sr-only">{M.retailers} </span>
            {bonus.retailers}
          </p>
        )}
        {bonus.notes.map((n) => (
          <p key={n} className="text-[12px] leading-[1.5] text-dim">
            {n}
          </p>
        ))}
        <p className="text-[12px] text-dim">{bonus.endsOn ? M.endsOn(formatDate(bonus.endsOn)) : M.untilStock}</p>
      </div>
    </li>
  );
}

export async function PreorderBonusesSection({ gameId }: { gameId: string }) {
  const posts = await listPreorderForGame(gameId);
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="preorder-heading" className={sectionCardClass("flex flex-col gap-4")}>
      <SectionHead id="preorder-heading" title={M.title} note={M.lead} />
      {posts.map((post) => (
        <div key={post.url} className="flex flex-col gap-3">
          <ul className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {post.bonuses.map((b) => (
              <BonusItem key={`${b.edition}-${b.name}`} bonus={b} />
            ))}
          </ul>
          <p className="text-[12px] text-dim">
            {M.source} |{" "}
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-acc hover:underline">
              {M.sourceLink}
              <span className="sr-only">{M.newTab}</span>
            </a>
          </p>
        </div>
      ))}
    </section>
  );
}
