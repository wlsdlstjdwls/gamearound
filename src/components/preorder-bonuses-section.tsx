// 게임 상세의 "예약 특전" 마디 — 판매처마다 다른 특전을 한눈에. 글이 없으면 마디째 안 그린다(대부분의 게임이 그렇다).
//
// 이미지는 unoptimized 로 원본 서버에서 바로 띄운다. 최적화를 태우면 Vercel 에 사본이 남는다 —
// 출처 약관이 사진 복제를 금해서 핫링크만 한다(schema-preorder 머리 주석).
// 출처와 원문 링크를 늘 붙인다. 링크는 자유지만 출처를 밝히라는 것이 같은 약관의 조건이다.
// 스토어 출처 글(Xbox, PlayStation)은 상품 소개에서 읽은 것이라 "… 스토어 기준" 과 스토어 상품 링크를 단다. 그림이 없어 그림 칸을 두지 않는다.
import Image from "next/image";
import { SectionHead, sectionCardClass } from "@/components/ui/page";
import { formatDate } from "@/lib/format";
import { PREORDER_MESSAGES as M } from "@/lib/preorder/messages";
import type { PreorderBonusDto } from "@/lib/preorder/dto";
import { listPreorderForGame } from "@/server/services/preorder-bonuses";

function BonusItem({ bonus, noDeadline, withImage }: { bonus: PreorderBonusDto; noDeadline: string | null; withImage: boolean }) {
  const deadline = bonus.endsOn ? M.endsOn(formatDate(bonus.endsOn)) : noDeadline;
  return (
    <li className="flex gap-3.5">
      {withImage && (
        <span className="relative size-[88px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-surface-3">
          {bonus.imageUrl && <Image src={bonus.imageUrl} alt={M.imageAlt(bonus.name)} fill sizes="88px" unoptimized className="object-cover" />}
        </span>
      )}
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
        {deadline && <p className="text-[12px] text-dim">{deadline}</p>}
      </div>
    </li>
  );
}

export async function PreorderBonusesSection({ gameId }: { gameId: string }) {
  const posts = await listPreorderForGame(gameId);
  if (posts.length === 0) return null;
  // 머리 설명은 출처마다 다르다. 출처가 섞여도 설명이 같으면(Xbox 와 PlayStation) 그 설명을 쓰고, 다르면 기본 설명으로 물러선다
  const leads = new Set(posts.map((p) => M.sourceCopy(p.source).lead));
  return (
    <section aria-labelledby="preorder-heading" className={sectionCardClass("flex flex-col gap-4")}>
      <SectionHead id="preorder-heading" title={M.title} note={leads.size === 1 ? [...leads][0] : M.lead} />
      {posts.map((post) => {
        const copy = M.sourceCopy(post.source);
        // 그림 칸은 그림이 하나라도 있는 글에만 둔다 — 상품 소개에서 읽은 글(Xbox, PlayStation)은 그림이 없어 빈 회색 칸만 늘어선다
        const withImage = post.bonuses.some((b) => b.imageUrl);
        return (
          <div key={post.url} className="flex flex-col gap-3">
            <ul className="grid gap-x-6 gap-y-4 md:grid-cols-2">
              {post.bonuses.map((b) => (
                <BonusItem key={`${b.edition}-${b.name}`} bonus={b} noDeadline={copy.noDeadline} withImage={withImage} />
              ))}
            </ul>
            <p className="text-[12px] text-dim">
              {copy.source} |{" "}
              <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-acc hover:underline">
                {copy.sourceLink}
                <span className="sr-only">{M.newTab}</span>
              </a>
            </p>
          </div>
        );
      })}
    </section>
  );
}
