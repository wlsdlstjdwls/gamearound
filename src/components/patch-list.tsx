"use client";
// 패치 기록 표시 — 목록(PatchList)과 플랫폼별 속도 비교(PatchSpeed).
//
// 목록의 한 줄은 "제목 + 버전 + 날짜" 뿐이다(2026-11-23 사용자 "목록에는 제목+버전 정도만", "버전이 없는 글도 있으니 버전은 글 뒤에").
// 줄은 모두 같은 팝업(ui/sheet)을 연다(같은 날 "목록에 원문 표기는 좀 그럼, 다 통일로 팝업"):
//   번역본이 있으면 "번역 | 원문" 탭, 원문뿐이면 원문, 쌓인 본문이 없으면 연 순간 스토어에서 원문을 받는다(RemoteBody).
//   머리에 스토어 원문 링크(주소가 있을 때).
// 전에는 줄마다 본문 280자와 "스토어에서 보기" 가 서서 다섯 건이 화면 한 장을 넘었다.
// 종류 딱지(lib/patch-kind)도 목록에서 뺐다 — 제목, 버전만 두라는 지시다. 규칙은 lib 에 남아 있다.
// 한글 제목(titleKo)이 있으면 그것을, 없으면 원문 제목을 쓴다.
// 팝업은 목록 하나에 한 장이다 — 줄마다 dialog 를 두면 기록 50건이 dialog 50개가 된다.
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { Clamp } from "@/components/ui/tooltip";
import { Sheet } from "@/components/ui/sheet";
import { FloatingIcon } from "@/components/ui/floating-icon";
import { FileTextIcon, SpinnerIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/button";
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

function RowInner({ n, showPlatform }: { n: Item; showPlatform: boolean }) {
  return (
    <>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="min-w-0 text-[13.5px] font-semibold leading-[1.5] text-ink">
          <Clamp lines={1}>{n.titleKo ?? n.title}</Clamp>
        </span>
        <VersionChip version={n.version} />
      </span>
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

type Remote = { state: "loading" } | { state: "done"; bodyEn: string | null };

/**
 * 본문을 쌓아 두지 않은 글(번역 단계가 고르지 않은 대부분)의 원문을 연 순간 받는다(api/games/patch-body, 2026-11-23 사용자
 * "영어 본문을 보여 주면 되잖아"). 기다리는 동안 한 줄만 서고, 못 받으면(오래된 글, 스팀 실패) 요약이나 안내 한 줄로 끝난다.
 */
/**
 * 본문을 못 받았을 때(오래돼 스팀 목록에서 빠진 글, 스팀 실패) — 팝업 가운데 물결 아이콘, 한 줄, 원문으로 가는 단추(2026-11-23 사용자
 * "없으면 없다고 가운데 문구랑 모션 아이콘, 버튼으로 원문 이동"). 옛 요약(summaryKo)이 있으면 안내 대신 그 요약을 보인다
 */
function NoBody({ url, fallback }: { url: string | null; fallback: string | null }) {
  if (fallback) return <p className="text-[13.5px] leading-[1.7] text-mut">{fallback}</p>;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <FloatingIcon>
        <FileTextIcon size={20} />
      </FloatingIcon>
      <p className="text-[14px] font-bold text-mut">{M.noBody}</p>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "secondary", size: "sm" })}>
          {M.openOriginalButton}
          <span className="sr-only">{" (새 창에서 열림)"}</span>
        </a>
      )}
    </div>
  );
}

function RemoteBody({ id, url, fallback }: { id: string; url: string | null; fallback: string | null }) {
  const [remote, setRemote] = useState<Remote>({ state: "loading" });
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(ROUTES.apiPatchBody(id), { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ bodyEn: string | null }>) : { bodyEn: null }))
      .then((d) => setRemote({ state: "done", bodyEn: d.bodyEn }))
      .catch(() => {
        if (!ctrl.signal.aborted) setRemote({ state: "done", bodyEn: null });
      });
    return () => ctrl.abort();
  }, [id]);
  // 기다림은 가운데 도는 원 하나(2026-11-23 사용자: 글자 대신 로딩 표시, 손전등 막대 말고 동그라미). 낭독기에는 role=status 로 알린다
  if (remote.state === "loading") {
    return (
      <div role="status" className="flex flex-1 items-center justify-center text-mut">
        <SpinnerIcon size={28} className="animate-spin" />
        <span className="sr-only">{M.loadingSr}</span>
      </div>
    );
  }
  if (remote.bodyEn) return <PatchBody bodyKo={null} bodyEn={remote.bodyEn} />;
  return <NoBody url={url} fallback={fallback} />;
}

export function PatchList({ items, showPlatform = false }: { items: Item[]; showPlatform?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = items.find((n) => n.id === openId) ?? null;

  if (items.length === 0) {
    return <p className="py-3 text-[13px] text-dim">{GAME_MESSAGES.patchNone}</p>;
  }
  return (
    <>
      <ul className={ROWS}>
        {items.map((n) => (
          <li key={n.id} className="flex">
            <button type="button" aria-haspopup="dialog" onClick={() => setOpenId(n.id)} className={ROW_ACTION}>
              <RowInner n={n} showPlatform={showPlatform} />
            </button>
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
        {opened && (
          // 높이 고정(2026-11-23 사용자 "상세 팝업은 높이 고정") — 글마다 길이가 달라 팝업이 열 때마다 커졌다 줄었다 했고,
          // 원문을 받아 오는 동안 로딩바 높이에서 본문 높이로 튀었다. 긴 본문은 이 안에서만 스크롤한다
          <div className="flex h-[min(60vh,520px)] flex-col gap-3 overflow-y-auto overscroll-contain">
            <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-dim">
              <time dateTime={opened.publishedAt}>{formatDate(opened.publishedAt)}</time>
              <VersionChip version={opened.version} />
            </p>
            {/* 열 때마다 탭이 처음(번역)으로 돌아가게 글 id 를 열쇠로 준다 */}
            {opened.bodyKo !== null || opened.bodyEn !== null ? (
              <PatchBody key={opened.id} bodyKo={opened.bodyKo} bodyEn={opened.bodyEn} />
            ) : (
              <RemoteBody key={opened.id} id={opened.id} url={opened.url} fallback={opened.summaryKo} />
            )}
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
