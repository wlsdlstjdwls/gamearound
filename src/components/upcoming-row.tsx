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
import { Bone } from "@/components/ui/skeleton";
import type { GameSummary } from "@/server/services/games";

/** 줄 껍데기 — 뼈대(UpcomingRowSkeleton)가 같은 값을 써야 본문이 올 때 줄 높이가 바뀌지 않는다 */
const ROW_SHELL = "group relative grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair transition-shadow hover:shadow-2 sm:flex sm:gap-4 sm:p-3.5";
/** 그림 칸(좁은 88, 넓은 132 폭, 스토어 가로 커버 비율) */
const ROW_COVER = "relative aspect-[460/215] w-[88px] shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3 shadow-hair sm:w-[132px]";

/*
 * 날짜 묶음 안의 줄(showDate={false}, 2026-11-20 사용자 "출시예정 날짜 표현방식이 불편"). 날짜는 묶음 머리(page 의 MonthGames)가 한 번만 말하고,
 * 줄은 그림 | 제목과 장르 | 출시 알림 한 줄이다. 좁은 화면에서 날짜 칸과 줄 아래 단추 한 줄을 걷으니 한 화면에 줄이 두 배 가까이 선다.
 * 그림을 좁은 화면에서 72 로 줄인 이유: 390 에서 88 이면 작은 출시 알림 단추를 옆에 세웠을 때 제목 칸이 120px 대로 줄어 이름이 세 줄로 접혔다
 */
const COMPACT_SHELL = "group relative flex items-center gap-3 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair transition-shadow hover:shadow-2 sm:gap-4 sm:p-3.5";
const COMPACT_COVER = "relative aspect-[460/215] w-[72px] shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3 shadow-hair sm:w-[132px]";

/** 줄 하나. 날짜가 null 이면 출시일 미정 상자의 줄이다(날짜 칸에 "미정") */
type RowEntry = { game: GameSummary; releaseDate: string | null };

/** 줄에 적을 기기 이름(기획서 v2.0 카드 공통 "플랫폼"). 카드와 같은 갈래(PC, PlayStation, Xbox, Switch)로 적는다 — 스토어 이름은 카드에서 뺐다 */
function platformNames(entry: RowEntry): string {
  return devicesOf(entry.game.platforms).map((d) => DEVICE_LABEL[d]).join(", ");
}

/** 제목 링크 + 장르, 기기 한 줄. 두 모양(날짜 칸 있는 줄, 날짜 묶음 안의 줄)이 같이 쓴다 */
function RowText({ entry, title, subtitle, compact = false }: { entry: RowEntry; title: string; subtitle?: string; compact?: boolean }) {
  const genres = entry.game.genres ?? [];
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {/* 줄 전체를 덮는 것은 제목 링크의 ::after 다(카드와 같은 수법) — 출시 알림 단추만 z-10 으로 그 위에 뜬다.
          제목은 두 줄까지 감싼다 — 한 줄로 자르면 같은 시리즈의 부제가 모두 "..." 뒤로 숨어 어느 게임인지 안 읽힌다 */}
      <Link href={`/games/${entry.game.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-md)] focus-visible:after:ring-2 focus-visible:after:ring-ink">
        <Clamp lines={2} className={compact ? "text-[14.5px] font-semibold leading-snug text-ink group-hover:text-acc sm:text-[16px]" : "text-[15px] font-semibold leading-snug text-ink group-hover:text-acc sm:text-[16px]"}>
          {title}
        </Clamp>
      </Link>
      <span className="text-[12.5px] text-dim">
        <Clamp>{[subtitle, genres.join(", "), platformNames(entry)].filter(Boolean).join(" | ")}</Clamp>
      </span>
    </div>
  );
}

/**
 * subtitle: 본편 이름처럼 장르보다 먼저 읽혀야 하는 한 마디(출시 예정의 추가 콘텐츠 상자). 장르 줄 앞에 붙는다.
 * showDate: false 면 날짜 묶음 안의 줄이다(위 COMPACT_SHELL 주석). 출시일 미정 상자, 추가 콘텐츠 상자, 인기순 정렬은 날짜 칸을 그대로 둔다
 */
export function UpcomingRow({ entry, subtitle, showDate = true }: { entry: RowEntry; subtitle?: string; showDate?: boolean }) {
  const title = entry.game.titleKo ?? entry.game.titleEn;
  if (!showDate) {
    return (
      <div className={COMPACT_SHELL}>
        <span className={COMPACT_COVER}>
          <CoverImage src={entry.game.coverUrl} alt="" sizes="132px" />
        </span>
        <RowText entry={entry} title={title} subtitle={subtitle} compact />
        <WishHeart slug={entry.game.slug} title={title} variant="release" size="sm" className="relative z-10 shrink-0" />
      </div>
    );
  }
  const [y, m, d] = (entry.releaseDate ?? "").split("-").map(Number);
  const weekday = y && m && d ? WEEKDAY_LABEL[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] : "";

  return (
    // 좁은 화면(sm 미만)은 두 줄 격자다(2026-10-26, 목업 390 의 월별 줄): 윗줄은 날짜 | 그림과 제목, 아랫줄은 오른쪽 끝에 출시 알림 단추.
    // 한 줄에 날짜, 그림, 제목, 딱지, 단추를 다 세우면 390 에서 제목 칸이 100px 남짓이라 이름이 열 자 안팎에서 잘리고 딱지는 숨겨야 했다.
    // sm 부터는 예전 한 줄 그대로다 — 아랫줄 묶음이 contents 로 풀려 줄 끝에 선다.
    <div className={ROW_SHELL}>
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
        <span className={ROW_COVER}>
          <CoverImage src={entry.game.coverUrl} alt="" sizes="132px" />
        </span>
        <RowText entry={entry} title={title} subtitle={subtitle} />
      </div>
      {/* 좁은 화면 아랫줄은 단추 하나만 오른쪽 끝에 둔다(2026-11-02 모바일 점검). 앞서는 "출시 예정" 딱지 + 줄 폭을 다 채운 파란 단추가
          줄마다 반복돼 목록이 단추 벽으로 읽혔다. "출시 예정" 딱지는 넓은 화면에서도 걷었다(2026-11-11 사용자 "여긴 다 출시 예정 아닌가,
          딱지와 출시 알림 단추가 똑같아 구분이 안 된다") — 출시 예정 화면과 출시 예정 상자 안이라 같은 말의 되풀이였다 */}
      <div className="col-start-2 flex items-center justify-end gap-2 sm:contents">
        <WishHeart slug={entry.game.slug} title={title} variant="release" className="relative z-10 shrink-0" />
      </div>
    </div>
  );
}

/**
 * 줄 뼈대 — 껍데기, 날짜 칸, 그림 칸, 제목 두 줄 자리, 출시 알림 단추 자리를 실물(위 UpcomingRow)과 같은 격자로 세운다.
 * 2026-11-11 전에는 출시 예정의 월별 목록 뼈대가 카드 격자(한 줄에 2~4장)라, 줄 목록(한 줄에 하나)이 올 때 화면이 통째로 바뀌었다(사용자)
 */
export function UpcomingRowSkeleton() {
  return (
    <div className={ROW_SHELL} aria-hidden>
      <div className="flex shrink-0 flex-col items-center gap-1 sm:w-14">
        <Bone className="h-6 w-7 sm:h-7" />
        <Bone className="h-3 w-10" />
      </div>
      <div className="flex min-w-0 items-center gap-3 sm:flex-1 sm:gap-4">
        <span className={`${ROW_COVER} skeleton`} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Bone className="h-[18px] w-3/5 sm:h-5" />
          {/* 좁은 화면은 제목 칸이 좁아 이름이 두 줄로 접히는 줄이 많다(실물 142 | 123px) — 둘째 줄 자리를 둔다 */}
          <Bone className="h-[18px] w-2/5 sm:hidden" />
          <Bone className="h-3.5 w-2/5" />
        </div>
      </div>
      <div className="col-start-2 flex items-center justify-end sm:contents">
        <Bone className="h-11 w-[104px] shrink-0 rounded-full sm:h-9 sm:w-[96px]" />
      </div>
    </div>
  );
}

/** 날짜 묶음 안의 줄 뼈대(위 UpcomingRow showDate={false} 와 같은 껍데기). 좁은 화면은 제목이 두 줄로 접히는 줄이 많아 둘째 줄 자리를 둔다 */
export function UpcomingCompactRowSkeleton() {
  return (
    <div className={COMPACT_SHELL} aria-hidden>
      <span className={`${COMPACT_COVER} skeleton`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Bone className="h-[18px] w-3/5 sm:h-5" />
        <Bone className="h-[18px] w-2/5 sm:hidden" />
        <Bone className="h-3.5 w-2/5" />
      </div>
      <Bone className="h-8 w-[84px] shrink-0 rounded-full" />
    </div>
  );
}

/** 줄 뼈대 여럿 — 실물 목록(ul.flex-col.gap-2.5)과 같은 간격. compact 는 날짜 묶음 안의 줄이다 */
export function UpcomingRowsSkeleton({ rows, compact = false }: { rows: number; compact?: boolean }) {
  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-2.5"} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (compact ? <UpcomingCompactRowSkeleton key={i} /> : <UpcomingRowSkeleton key={i} />))}
    </div>
  );
}
