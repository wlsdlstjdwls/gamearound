// DLC 목록 — 기획서 F5.
// DLC 는 games 행이라 자기 상세 화면도 갖는다. 여기서는 제목과 최저가만 보여주고 나머지는 그 화면에 맡긴다.
//
// "목록은 없는데 스토어가 추가 콘텐츠가 있다고만 알려준" 상태를 따로 다룬다.
// 그걸 "DLC 없음"으로 적으면 사실이 아니고, 빈 목록으로 두면 수집이 고장난 것처럼 보인다.
import { formatPrice } from "@/lib/currency";
import Link from "next/link";
import { Clamp } from "@/components/ui/tooltip";
import { cardClass } from "@/components/ui/page";
import { PLATFORM_LABEL } from "@/lib/format";
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
            {/* 새 탭으로 연다 — DLC 를 훑는 사람은 본편 화면을 띄워 둔 채 하나씩 열어 본다.
                같은 탭에서 열면 볼 때마다 뒤로 가기를 눌러 본편으로 돌아와야 한다 */}
            <Link
              href={gamePath(d.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className={cardClass("flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:border-ink")}
            >
              <Clamp lines={1} className="min-w-0 flex-1 text-[13px] text-ink">
                {d.title}
              </Clamp>
              <span className="sr-only">(새 창에서 열림)</span>
              <span className="flex shrink-0 items-baseline gap-2 text-[12.5px]">
                {best?.discountPct ? <span className="font-semibold text-danger">-{best.discountPct}%</span> : null}
                <span className="font-semibold text-ink">{best ? formatPrice(best.currentPrice, best.currency) : "-"}</span>
                {best && <span className="text-dim">{PLATFORM_LABEL[best.platform] ?? best.platform}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
