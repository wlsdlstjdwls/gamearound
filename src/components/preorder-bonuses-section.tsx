// 게임 상세의 "예약 특전" 마디 — 특전마다 카드 한 장, 카드 안에 받는 곳(판매처)과 바로 가는 링크. 글이 없으면 마디째 안 그린다(대부분의 게임이 그렇다).
//
// 2026-11-23 개편(사용자 "접었다 펼칠 수 있게, '판매처마다 주는 특전이 달라요' 같은 문구 제거, 특전별 판매처와 링크, UI/UX 개선"):
//   - 마디는 접히는 Collapsible 이다. 기본은 펴 둔다 — 예약 중인 게임에서 특전은 사러 온 사람이 찾는 값이다. 제목 옆에 특전 수를 둔다.
//   - 머리 설명 문구를 걷었다. 카드마다 판매처가 서니 "판매처마다 다르다" 는 화면이 이미 말한다.
//   - 판매처 줄: 한국닌텐도 글은 공지의 판매처 글에서 이름난 쇼핑몰을 찾아 첫 화면 링크로(lib/preorder/retailers — 상품 주소는 공지에 없어 지어내지 않는다),
//     원문 글은 링크 밑에 작게 남긴다(오프라인 매장 같은 링크 없는 곳도 빠지지 않게). 스토어 글(Xbox, PlayStation)은 그 스토어 상품 링크 하나다.
//
// 이미지는 unoptimized 로 원본 서버에서 바로 띄운다. 최적화를 태우면 Vercel 에 사본이 남는다 —
// 출처 약관이 사진 복제를 금해서 핫링크만 한다(schema-preorder 머리 주석).
// 출처와 원문 링크를 늘 붙인다. 링크는 자유지만 출처를 밝히라는 것이 같은 약관의 조건이다.
import Image from "next/image";
import { Collapsible } from "@/components/ui/collapsible";
import { sectionCardClass } from "@/components/ui/page";
import { ClockIcon } from "@/components/ui/icons";
import { Clamp } from "@/components/ui/tooltip";
import { tagClass } from "@/components/ui/tag";
import { formatDate } from "@/lib/format";
import { PREORDER_MESSAGES as M } from "@/lib/preorder/messages";
import { PREORDER_SOURCE } from "@/lib/preorder/sources";
import { retailerLinks, type RetailerLink } from "@/lib/preorder/retailers";
import type { PreorderBonusDto, PreorderPostDto } from "@/lib/preorder/dto";
import { listPreorderForGame } from "@/server/services/preorder-bonuses";

/** 판매처 링크 칩 — 눌리는 것이라 테두리를 두고, 누르면 새 창이다 */
const RETAILER_CHIP =
  "press tap inline-flex h-7 items-center rounded-[var(--radius-xs)] px-2.5 text-[12.5px] font-semibold text-ink-2 ring-1 ring-line-strong ring-inset transition-colors duration-base hover:text-acc hover:ring-acc";

function RetailerRow({ links, text }: { links: RetailerLink[]; text: string | null }) {
  if (links.length === 0 && !text) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-semibold text-dim">{M.retailers}</span>
      {links.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {links.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className={RETAILER_CHIP}>
                {l.name}
                <span className="sr-only">{M.newTab}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {/* 공지 원문 판매처 글 — 링크로 못 만든 곳(오프라인 매장 등)까지 다 들어 있다. 길면 두 줄로 자르고 올리면 전체가 뜬다 */}
      {text && (
        <Clamp lines={2} className="text-[12px] leading-[1.55] text-mut">
          {text}
        </Clamp>
      )}
    </div>
  );
}

function BonusCard({ bonus, post, withImage }: { bonus: PreorderBonusDto; post: PreorderPostDto; withImage: boolean }) {
  const copy = M.sourceCopy(post.source);
  const deadline = bonus.endsOn ? M.endsOn(formatDate(bonus.endsOn)) : copy.noDeadline;
  // 스토어 글은 받는 곳이 그 스토어 하나다 — 상품 링크(원문 주소)가 곧 판매처 링크다
  const fromStore = post.source !== PREORDER_SOURCE.nintendoKr;
  const links = fromStore ? [{ name: copy.name, url: post.url }] : retailerLinks(bonus.retailers);
  return (
    <li className="flex gap-3.5 rounded-[var(--radius-md)] bg-surface-2/60 p-3.5">
      {withImage && (
        <span className="relative size-[84px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-surface-3">
          {bonus.imageUrl && <Image src={bonus.imageUrl} alt={M.imageAlt(bonus.name)} fill sizes="84px" unoptimized className="object-cover" />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[14.5px] font-bold leading-[1.4] text-ink">{bonus.name}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={tagClass({ tone: "info" })}>{M.edition[bonus.edition]}</span>
            {deadline && (
              <span className="inline-flex items-center gap-1 text-[12px] text-dim">
                <ClockIcon size={12} className="shrink-0" />
                {deadline}
              </span>
            )}
          </div>
        </div>
        {bonus.notes.map((n) => (
          <p key={n} className="text-[12px] leading-[1.5] text-mut">
            {n}
          </p>
        ))}
        <RetailerRow links={links} text={fromStore ? null : bonus.retailers} />
      </div>
    </li>
  );
}

export async function PreorderBonusesSection({ gameId }: { gameId: string }) {
  const posts = await listPreorderForGame(gameId);
  if (posts.length === 0) return null;
  const total = posts.reduce((n, p) => n + p.bonuses.length, 0);
  return (
    <section className={sectionCardClass("flex flex-col")}>
      <Collapsible id="preorder-heading" title={M.title} note={M.count(total)} defaultOpen>
        <div className="flex flex-col gap-5">
          {posts.map((post) => {
            const copy = M.sourceCopy(post.source);
            // 그림 칸은 그림이 하나라도 있는 글에만 둔다 — 상품 소개에서 읽은 글(Xbox, PlayStation)은 그림이 없어 빈 회색 칸만 늘어선다
            const withImage = post.bonuses.some((b) => b.imageUrl);
            return (
              <div key={post.url} className="flex flex-col gap-2.5">
                <ul className="grid gap-2.5 md:grid-cols-2">
                  {post.bonuses.map((b) => (
                    <BonusCard key={`${b.edition}-${b.name}`} bonus={b} post={post} withImage={withImage} />
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
        </div>
      </Collapsible>
    </section>
  );
}
