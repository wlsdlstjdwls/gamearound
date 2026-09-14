// DLC 목록 — 기획서 F5.
// DLC 는 games 행이라 자기 상세 화면도 갖는다. 여기서는 제목과 최저가만 보여주고 나머지는 그 화면에 맡긴다.
//
// "목록은 없는데 스토어가 추가 콘텐츠가 있다고만 알려준" 상태를 따로 다룬다.
// 그걸 "DLC 없음"으로 적으면 사실이 아니고, 빈 목록으로 두면 수집이 고장난 것처럼 보인다.
import Link from "next/link";
import { Clamp } from "@/components/ui/tooltip";
import { cardClass } from "@/components/ui/page";
import { formatKrw, PLATFORM_LABEL } from "@/lib/format";
import { GAME_MESSAGES } from "@/lib/games/messages";
import { gamePath } from "@/lib/routes";
import { stagger } from "@/lib/motion";
import { cheapestPlatform, type DlcDto } from "@/server/services/games";

export function DlcList({ dlcs, hasAddOns }: { dlcs: DlcDto[]; hasAddOns: boolean }) {
  if (dlcs.length === 0) {
    return (
      <p className="text-[13px] text-dim">
        {hasAddOns ? GAME_MESSAGES.dlcKnownButUnlisted : GAME_MESSAGES.dlcNone}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {dlcs.map((d, i) => {
        const best = cheapestPlatform(d.platforms);
        return (
          <li key={d.slug} className="enter-item" style={stagger(i)}>
            <Link
              href={gamePath(d.slug)}
              className={cardClass("flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:border-ink")}
            >
              <Clamp lines={1} className="min-w-0 flex-1 text-[13px] text-ink">
                {d.title}
              </Clamp>
              <span className="flex shrink-0 items-baseline gap-2 text-[12.5px]">
                {best?.discountPct ? <span className="font-semibold text-danger">-{best.discountPct}%</span> : null}
                <span className="font-semibold text-ink">{best ? formatKrw(best.currentPrice) : "-"}</span>
                {best && <span className="text-dim">{PLATFORM_LABEL[best.platform] ?? best.platform}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
