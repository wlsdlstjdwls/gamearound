// 추가 콘텐츠, 에디션의 줄 목록 — 두 자리가 같은 모양을 쓴다.
//
// 뽑아낸 이유(2026-09-22): 추가 콘텐츠가 접는 마디에서 나와 플랫폼 행의 시트로 들어가면서
// 같은 줄 모양이 두 곳에 필요해졌다. 에디션 칸은 여전히 접는 마디에 있다 —
// 둘이 다르게 생기면 같은 것을 한 화면에서 두 번 배워야 한다.
import Link from "next/link";
import { Clamp } from "@/components/ui/tooltip";
import { ROW, ROWS, SHEET_ROW, SHEET_ROWS } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";
import { GAME_MESSAGES } from "@/lib/games/messages";
import { platformLabel } from "@/lib/format";
import { gamePath } from "@/lib/routes";
import { stagger } from "@/lib/motion";
import type { DlcDto, PlatformDto } from "@/server/services/games";

export type DlcRow = { dlc: DlcDto; best: PlatformDto | null };

/**
 * inSheet: 시트 안이면 헤어라인 대신 줄마다 판을 깐다(SHEET_ROWS 주석).
 * showPlatform: 값 옆 플랫폼 이름. 상세의 추가 콘텐츠 팝업은 끈다(2026-11-16 사용자 "플랫폼은 안 나와도 될 듯") — 그 자리는 최저가 하나다
 */
export function DlcRows({ rows, inSheet = false, showPlatform = true }: { rows: DlcRow[]; inSheet?: boolean; showPlatform?: boolean }) {
  return (
    <ul className={inSheet ? SHEET_ROWS : ROWS}>
      {rows.map(({ dlc, best }, i) => (
        <li key={dlc.slug} className="enter-item" style={stagger(i)}>
          {/* 새 탭으로 연다 — DLC 를 훑는 사람은 본편 화면을 띄워 둔 채 하나씩 열어 본다.
              같은 탭에서 열면 볼 때마다 뒤로 가기를 눌러 본편으로 돌아와야 한다 */}
          <Link
            href={gamePath(dlc.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(inSheet ? SHEET_ROW : ROW, "flex items-center justify-between gap-3.5 py-[13px]")}
          >
            <Clamp lines={1} className="min-w-0 flex-1 text-[14px] text-ink">
              {dlc.title}
            </Clamp>
            <span className="sr-only">(새 창에서 열림)</span>
            <span className="flex shrink-0 items-baseline gap-3 text-[12.5px]">
              {/* 할인율은 빨강, 그 뒤 할인가, 그 뒤 취소선 정가(2026-11-23 사용자 "추가 콘텐츠 팝업에서 할인율은 빨간색, 원가, 할인가 표기도") —
                  가격 비교 카드, 목록 카드와 같은 순서와 색이다 */}
              {best?.discountPct ? <span className="font-extrabold text-danger tabular-nums">-{best.discountPct}%</span> : null}
              {best ? (
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[15px] font-extrabold tracking-[-0.03em] text-ink">{formatPrice(best.currentPrice, best.currency)}</span>
                  {best.discountPct && best.listPrice !== null && best.listPrice !== best.currentPrice ? (
                    <span className="text-[12px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>
                  ) : null}
                </span>
              ) : dlc.uncheckedPlatforms.length > 0 ? (
                // 있다는 것만 아는 줄. 값 자리를 비워 두면 공짜나 고장으로 읽힌다 — 확인 전이라고 말한다
                <span className="text-[12.5px] text-dim">{GAME_MESSAGES.dlcPriceUnchecked}</span>
              ) : (
                <span className="text-[15px] font-extrabold tracking-[-0.03em] text-ink">-</span>
              )}
              {/* 플랫폼 이름은 자리를 이미 알아도 적는다 — 나라가 다르면 이름이 달라지고(Switch 일본),
                  그 값은 한국 계정으로 못 사는 값이다 */}
              {showPlatform && best && <span className="w-12 text-right text-[12px] text-dim">{platformLabel(best)}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
