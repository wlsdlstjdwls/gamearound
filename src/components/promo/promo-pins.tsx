// 홍보 게시판 위 고정 카드 묶음(2026-10-29). 예전에는 목록과 같은 맨 줄에 "광고" 표시만 달아 사용자가 "너무 밋밋하고 눈에 안 띈다" 고 했다.
// 돈을 낸 자리는 목록과 다른 모양이어야 산 값이 보인다 — 옅은 파랑 판 위에 썸네일, 본문 앞부분이 있는 카드를 두 장씩 세운다.
// "광고" 표시는 그대로 둔다(표시광고법). 누런색, 채운 딱지는 쓰지 않는다(10-27 화면 검수 원칙) — 판 색과 그림으로 눈을 끈다.
// 보임, 누름은 줄일 때와 같이 카드마다 AdTrack 이 센다. 한 장뿐이면 판 폭을 다 쓴다(반쪽 카드 옆 빈칸이 어색하다).
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { AuthorName, PostTags } from "@/components/community/badges";
import { AdTrack } from "@/components/promo/ad-track";
import { AdLabel } from "@/components/ui/ad-label";
import { Clamp } from "@/components/ui/tooltip";
import { SponsoredPanel } from "@/components/promo/sponsored-panel";
import { cn } from "@/lib/cn";
import { COMMUNITY_MESSAGES as CM } from "@/lib/community/messages";
import { formatPostDate } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { PROMO_MESSAGES as M } from "@/lib/promo/messages";
import type { Featured, PromoPinDto } from "@/server/services/promotions";

function PinCard({ pin }: { pin: PromoPinDto }) {
  return (
    <article className="cover-zoom group relative flex h-full gap-3.5 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair transition-shadow hover:shadow-[var(--elev-2)]">
      <span className="cover-glint relative aspect-[4/3] w-[88px] shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-acc-soft sm:w-[128px]">
        <span className="cover-zoom-img absolute inset-0 block">
          <CoverImage src={pin.cover} alt={M.pinnedCover(pin.title)} sizes="128px" />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <AdLabel />
          <PostTags post={pin} showCategory={false} />
        </span>
        <Link
          href={pin.href}
          className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-md)] focus-visible:after:ring-2 focus-visible:after:ring-ink focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-bg"
        >
          <Clamp lines={1} className="text-[15.5px] font-bold tracking-[-0.02em] text-ink transition-colors duration-fast group-hover:text-acc">
            {pin.title}
          </Clamp>
        </Link>
        {pin.excerpt && <Clamp lines={2} className="text-[13px] leading-[1.5] text-mut">{pin.excerpt}</Clamp>}
        <span className="mt-auto flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 whitespace-nowrap text-[12px] tabular-nums text-dim">
          <AuthorName post={pin} className="max-w-[140px] truncate" />
          <span>{formatPostDate(pin.createdAt)}</span>
          <span>
            {CM.likes} {pin.likeCount.toLocaleString("ko-KR")}
          </span>
          {pin.commentCount > 0 && <span className="font-bold text-acc">[{pin.commentCount}]</span>}
        </span>
      </span>
    </article>
  );
}

export function PromoPins({ pins }: { pins: Array<Featured<PromoPinDto>> }) {
  return (
    <SponsoredPanel id="promo-pins" title={M.pinnedTitle} className="mb-3">
      <ul className={cn("grid grid-cols-1 gap-2.5", pins.length > 1 && "md:grid-cols-2")}>
        {pins.map(({ boostId, item }, i) => (
          <li key={item.id} className="enter-item min-w-0" style={stagger(i)}>
            <AdTrack boostId={boostId} className="h-full">
              <PinCard pin={item} />
            </AdTrack>
          </li>
        ))}
      </ul>
    </SponsoredPanel>
  );
}
