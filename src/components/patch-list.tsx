"use client";
// 패치 기록 표시 — 목록(PatchList)과 플랫폼별 속도 비교(PatchSpeed).
//
// 목록의 한 줄은 "버전 + 제목 + 날짜" 뿐이다(2026-11-23 사용자 "목록에는 제목+버전 정도만"). 본문은 줄을 눌러 여는 팝업에서 본다:
//   번역본(bodyKo)이 있는 줄   누르면 팝업(ui/sheet)에 한글 전문, "영어 원문 보기" 바꾸기, 머리에 스토어 원문 링크
//   번역본이 없고 주소가 있는 줄  누르면 스토어 원문으로 바로 간다(새 창). 팝업에 원문을 옮겨 담지 않는다 — 원문은 스토어가 더 잘 보인다
//   둘 다 없는 줄             누를 곳이 없어 글자만 선다. 열리지 않는 링크를 만들지 않는다
// 전에는 줄마다 본문 280자와 "스토어에서 보기" 가 서서 다섯 건이 화면 한 장을 넘었다.
// 종류 딱지(lib/patch-kind)도 목록에서 뺐다 — 제목, 버전만 두라는 지시다. 규칙은 lib 에 남아 있다.
// 한글 제목(titleKo)이 있으면 그것을, 없으면 원문 제목을 쓴다.
// 팝업은 목록 하나에 한 장이다 — 줄마다 dialog 를 두면 기록 50건이 dialog 50개가 된다.
import { useState } from "react";
import { Clamp } from "@/components/ui/tooltip";
import { Sheet } from "@/components/ui/sheet";
import { PatchBody } from "@/components/patch-body";
import { ROWS } from "@/components/ui/page";
import { formatDate, platformLabel } from "@/lib/format";
import { GAME_MESSAGES } from "@/lib/games/messages";
import { PATCH_BODY_MESSAGES as M } from "@/lib/patch/messages";
import type { PatchNoteDto, PlatformPatchesDto } from "@/server/services/games";
import type { Platform, Region } from "@/server/db/schema";

function VersionChip({ version }: { version: string | null }) {
  if (!version) return null;
  return (
    <span className="shrink-0 rounded-[6px] bg-surface-2 px-[7px] py-[2px] font-mono text-[11.5px] text-ink-2">{version}</span>
  );
}

type Item = PatchNoteDto & { platform?: Platform; region?: Region };

/** 줄 전체가 누르는 자리다. 버튼이든 링크든 같은 차림이어야 번역 유무로 목록이 들쭉날쭉하지 않는다 */
const ROW_ACTION =
  "press tap -mx-2.5 flex min-w-0 flex-1 items-baseline gap-x-2.5 gap-y-1 rounded-[var(--radius-sm)] px-2.5 py-[11px] text-left transition-colors duration-base hover:bg-surface-2";

function RowInner({ n, showPlatform, tail }: { n: Item; showPlatform: boolean; tail?: React.ReactNode }) {
  return (
    <>
      <VersionChip version={n.version} />
      <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-[1.5] text-ink">
        <Clamp lines={1}>{n.titleKo ?? n.title}</Clamp>
      </span>
      {tail}
      {/* 휴대폰은 읽는 글자를 12.5px 로(2026-11-20 사용자 점검 "11px 대 작은 글자가 많다"). 넓은 화면은 그대로 */}
      <span className="flex shrink-0 items-center gap-x-1.5 text-[11.5px] text-dim max-sm:text-[12.5px]">
        {showPlatform && n.platform && (
          <>
            <span>{platformLabel({ platform: n.platform, region: n.region ?? "KR" })}</span>
            <span aria-hidden>|</span>
          </>
        )}
        <time dateTime={n.publishedAt}>{formatDate(n.publishedAt)}</time>
      </span>
    </>
  );
}

export function PatchList({ items, showPlatform = false }: { items: Item[]; showPlatform?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = items.find((n) => n.id === openId && n.bodyKo !== null) ?? null;

  if (items.length === 0) {
    return <p className="py-3 text-[13px] text-dim">{GAME_MESSAGES.patchNone}</p>;
  }
  return (
    <>
      <ul className={ROWS}>
        {items.map((n) => (
          <li key={n.id} className="flex">
            {n.bodyKo !== null ? (
              <button type="button" aria-haspopup="dialog" onClick={() => setOpenId(n.id)} className={ROW_ACTION}>
                <RowInner n={n} showPlatform={showPlatform} />
              </button>
            ) : n.url ? (
              <a href={n.url} target="_blank" rel="noopener noreferrer" className={ROW_ACTION}>
                <RowInner
                  n={n}
                  showPlatform={showPlatform}
                  tail={<span className="shrink-0 rounded-full bg-surface-2 px-2 py-[2px] text-[11px] font-semibold text-mut">{M.originalOnly}</span>}
                />
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            ) : (
              <div className="flex min-w-0 flex-1 items-baseline gap-x-2.5 py-[11px]">
                <RowInner n={n} showPlatform={showPlatform} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <Sheet
        title={opened ? (opened.titleKo ?? opened.title) : ""}
        size="wide"
        open={opened !== null}
        onOpenChange={(v) => {
          if (!v) setOpenId(null);
        }}
        actions={
          opened?.url ? (
            <a href={opened.url} target="_blank" rel="noopener noreferrer" className="press tap text-[13px] font-semibold text-acc hover:underline">
              {M.openOriginal}
              <span className="sr-only"> (새 창에서 열림)</span>
            </a>
          ) : null
        }
      >
        {opened && opened.bodyKo !== null && (
          <div className="flex flex-col gap-3">
            <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-dim">
              <VersionChip version={opened.version} />
              <time dateTime={opened.publishedAt}>{formatDate(opened.publishedAt)}</time>
            </p>
            {/* 열 때마다 원문 바꾸기 상태가 처음(번역)으로 돌아가게 글 id 를 열쇠로 준다 */}
            <PatchBody key={opened.id} bodyKo={opened.bodyKo} bodyEn={opened.bodyEn} />
          </div>
        )}
      </Sheet>
    </>
  );
}

/**
 * 플랫폼별 패치 속도. 한 칸이 한 스토어다.
 * 값이 "우리가 모은 범위 안에서만" 참이라는 단서는 화면(페이지)이 표 밑에 한 번 적는다.
 */
export function PatchSpeed({ groups }: { groups: PlatformPatchesDto[] }) {
  if (groups.length === 0) return null;
  return (
    // 칸을 세로선으로 가르던 격자를 헤어라인 줄로 바꿨다 — 스토어가 둘일 때와 넷일 때
    // 칸 폭이 달라져 같은 표가 화면마다 다르게 읽혔다. 줄은 몇 개든 같은 모양이다
    <dl className={ROWS}>
      {groups.map((g) => (
        <div key={`${g.platform}:${g.region}`} className="flex items-baseline justify-between gap-2.5 py-[11px]">
          <dt className="text-[13.5px] font-bold text-ink">{platformLabel(g)}</dt>
          {/* 값은 "마지막으로 고친 날" 하나다(2026-09-21). 밑에 "평균 N일마다 | M건" 을 달았었는데,
              그 평균은 우리가 모은 범위 안에서만 참이라 단서 없이는 읽는 사람을 속인다.
              게다가 이 화면에서 패치가 답하는 질문은 "아직 돌보나" 하나이고 거기엔 날짜면 족하다.
              건수와 간격은 services 가 계속 계산한다 — 다시 적을 자리가 생기면 값은 이미 있다 */}
          <dd className="text-right text-[13px] text-ink">{g.latestAt ? formatDate(g.latestAt) : "-"}</dd>
        </div>
      ))}
    </dl>
  );
}
