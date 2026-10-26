// 출시 예정 월별 목록의 한 줄(기획서 v2.0 S-03, 목업 v66 월별 보기의 줄).
//
// 월별 보기만 줄이다. 한 달 안에서는 "언제" 가 첫 질문이라 날짜 칸이 줄 맨 앞에 크게 선다 —
// 카드 격자에서는 날짜가 카드 바닥 작은 글자라 같은 날 나오는 게임을 세어 봐야 했다.
// 전체 보기와 이달의 기대작은 카드 격자 그대로다(목업도 전체 보기는 카드다).
//
// 줄 끝은 목업대로 "출시 알림" 단추다. 누르면 그 게임을 찜하고, 출시되면 알림함으로 알려 준다(sync/release-alerts).
// 가격 알림은 출시 뒤에 적용하기로 미결이라(기획서 9.3 의 8번) 여기 두지 않는다.
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { WishHeart } from "@/components/wish-heart";
import { Clamp } from "@/components/ui/tooltip";
import { WEEKDAY_LABEL } from "@/lib/format";
import { UPCOMING_MESSAGES as M } from "@/lib/games/messages";
import { DEVICE_LABEL, devicesOf } from "@/lib/platform";
import type { GameSummary } from "@/server/services/games";

/** 줄 하나. 날짜가 null 이면 출시일 미정 상자의 줄이다(날짜 칸에 "미정") */
type RowEntry = { game: GameSummary; releaseDate: string | null };

/** 줄에 적을 기기 이름(기획서 v2.0 카드 공통 "플랫폼"). 카드와 같은 갈래(PC, PlayStation, Xbox, Switch)로 적는다 — 스토어 이름은 카드에서 뺐다 */
function platformNames(entry: RowEntry): string {
  return devicesOf(entry.game.platforms).map((d) => DEVICE_LABEL[d]).join(", ");
}

export function UpcomingRow({ entry }: { entry: RowEntry }) {
  const title = entry.game.titleKo ?? entry.game.titleEn;
  const [y, m, d] = (entry.releaseDate ?? "").split("-").map(Number);
  const weekday = y && m && d ? WEEKDAY_LABEL[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] : "";
  const genres = entry.game.genres ?? [];

  return (
    // 좁은 화면(sm 미만)은 두 줄 격자다(2026-10-26, 목업 390 의 월별 줄): 윗줄은 날짜 | 그림과 제목, 아랫줄은 제목 칸 밑에 "출시 예정" 과 넓은 출시 알림 단추.
    // 한 줄에 날짜, 그림, 제목, 딱지, 단추를 다 세우면 390 에서 제목 칸이 100px 남짓이라 이름이 열 자 안팎에서 잘리고 딱지는 숨겨야 했다.
    // sm 부터는 예전 한 줄 그대로다 — 아랫줄 묶음이 contents 로 풀려 줄 끝에 선다.
    <div className="group relative grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair transition-shadow hover:shadow-2 sm:flex sm:gap-4 sm:p-3.5">
      <div className="flex shrink-0 flex-col items-center sm:w-14">
        {entry.releaseDate ? (
          <>
            <span className="text-[24px] font-extrabold leading-none tabular-nums tracking-[-0.04em] text-ink sm:text-[28px]">{d}</span>
            <span className="mt-1 text-[11.5px] text-dim">
              {m}월 | {weekday}
            </span>
          </>
        ) : (
          <span className="text-[15px] font-bold text-dim">{M.tbaDay}</span>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-3 sm:flex-1 sm:gap-4">
        <span className="relative aspect-[460/215] w-[88px] shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3 shadow-hair sm:w-[132px]">
          <CoverImage src={entry.game.coverUrl} alt="" sizes="132px" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* 줄 전체를 덮는 것은 제목 링크의 ::after 다(카드와 같은 수법) — 출시 알림 단추만 z-10 으로 그 위에 뜬다.
              제목은 두 줄까지 감싼다 — 한 줄로 자르면 같은 시리즈의 부제가 모두 "..." 뒤로 숨어 어느 게임인지 안 읽힌다 */}
          <Link href={`/games/${entry.game.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-md)] focus-visible:after:ring-2 focus-visible:after:ring-ink">
            <Clamp lines={2} className="text-[15px] font-semibold leading-snug text-ink group-hover:text-acc sm:text-[16px]">
              {title}
            </Clamp>
          </Link>
          <span className="text-[12.5px] text-dim">
            <Clamp>{[genres.join(", "), platformNames(entry)].filter(Boolean).join(" | ")}</Clamp>
          </span>
        </div>
      </div>
      <div className="col-start-2 flex items-center gap-2 sm:contents">
        <span className="shrink-0 rounded-full bg-acc-soft px-2.5 py-1 text-[12px] font-semibold text-acc">{M.rowTag}</span>
        <WishHeart slug={entry.game.slug} title={title} variant="release" className="relative z-10 flex-1 sm:flex-none sm:shrink-0" />
      </div>
    </div>
  );
}
