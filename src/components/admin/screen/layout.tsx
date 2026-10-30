"use client";
// 관리자 화면 본문 부품 — 신세계TV 백오피스 화면 구성을 옮겼다(2026-10-29 밤, 사용자 "메뉴랑 버튼만 가져다 두고 화면 구성은 그대로네").
//
// 백오피스 관리 화면은 어디나 같은 순서로 선다(상품등록, 일반프로모션, 첫구매사은프로모션, 고객상세정보 실측):
//   1. 조회조건 띠(SearchBand) — 회색 띠 안에 "이름표 | 칸" 이 여러 열. 이름표는 칸 왼쪽에 오른쪽 정렬.
//   2. 왼쪽 목록(공통 그리드 screen/data-grid) + 오른쪽 상세(MasterDetail) — 목록 줄을 고르면 오른쪽이 그 줄의 상세로 바뀐다.
//   3. 상세는 접히는 묶음(FormSection, "− 상품분류" 꼴)을 위에서 아래로 쌓고, 묶음 안에 칸(Field)이 여러 열.
//      탭(ScreenTabs)은 칸이 많아 한 판에 다 못 실을 때만 쓴다 — 백오피스 상품등록이 탭 14개인 것은 칸이 수백 개라서다.
//      칸 몇 개짜리 탭은 칸을 숨기고 누를 일만 늘렸다(2026-10-30 사용자 "굳이 탭으로 나눠야 되는 거야", 상품등록, 프로모션등록 탭 걷음).
//      필수 칸은 이름표 앞 빨간 *, 고칠 수 없는 칸은 회색 칸(ReadValue).
// 색과 간격은 이 서비스 토큰을 쓴다 — 백오피스의 어두운 표 머리, 주황 단추는 가져오지 않았다(이 서비스 결이 아니다).
// 2026-10-30(사용자 "그리드랑 폼이 같이 있으면 영역 분리가 모호, 구분선 부족, 탭도"): 조회 띠, 목록, 상세를 저마다 테두리 친 판으로 세우고
// 상세 판은 제목 띠를 단다. 탭은 안 고른 탭도 테두리를 둬 탭으로 읽히게 하고, 고른 탭은 위에 파랑 줄.
// 미리 보기처럼 상세 내내 봐야 하는 것은 WithAside(탭이면 ScreenTabs 의 aside)로 상세 옆에 붙인다.
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { FULL_ROW } from "@/components/admin/screen/form-grid";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Clamp } from "@/components/ui/tooltip";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";
import { SplitHandle, useListSplit } from "@/components/admin/screen/split-handle";
import { FitFillContext } from "@/components/admin/screen/data-grid/fit";
import { SpotProvider, useSpotFocus } from "@/components/admin/screen/preview-spot";

/**
 * 조회조건 띠. 칸은 SearchItem 으로 넣는다. 넓은 화면에서 이름표, 칸 짝이 제 폭만큼 왼쪽부터 붙어 서고 남는 폭은 비워 둔다.
 * 띠 폭을 칸 수로 나눠 늘리지 않는다 — 칸 둘인 화면도 띠 끝까지 칸이 늘어 화면이 꽉 차 보였다(2026-10-30 사용자 "일부러 꽉 차게 조건 나열하지 마").
 * 띠 안 입력, 고르기 칸은 마우스 기기에서 한 단 낮춘다(36px) — 띠가 화면 머리만큼 두꺼워 목록을 밀어냈다(2026-10-30 사용자 "조건 영역이 너무 커").
 * 터치 기기는 44px 그대로 둔다(AGENTS §6 터치 타깃)
 */
export function SearchBand({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-xl border border-line bg-surface-2 px-3 py-2 sm:grid-cols-2 xl:grid-cols-4 [@media(pointer:fine)]:[&_button[aria-haspopup]]:h-9 [@media(pointer:fine)]:[&_input]:h-9 [@media(pointer:fine)]:[&_input]:min-h-9">
      {children}
    </section>
  );
}

export function SearchItem({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  // 칸 폭은 고정이다(가장 긴 선택지 "진행(노출 중, 대기)" 가 잘리지 않는 폭). 좁은 화면은 한 줄에 하나라 띠 폭을 다 쓴다
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <label htmlFor={htmlFor} className="w-16 shrink-0 whitespace-nowrap text-right text-[12.5px] font-semibold text-mut sm:w-auto">
        {label}
      </label>
      <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">{children}</div>
    </div>
  );
}

/** 왼쪽 목록, 오른쪽 상세. 좁은 화면은 위아래로 선다. 상세는 테두리 친 판에 담아 목록과 갈린다 — detailTitle 이 그 판의 제목 띠다 */
export function MasterDetail({ list, detail, detailTitle, detailActions, listWidth = "400px" }: { list: React.ReactNode; detail: React.ReactNode; detailTitle?: React.ReactNode; detailActions?: React.ReactNode; listWidth?: string }) {
  // 영역 접기(2026-10-30 사용자 "그리드 줄이고 폼 입력 영역을 더 크게, 영역별로 접고 펼 수 있게"). 접으면 그 자리가 구분선 하나로 줄고 다른 쪽이 폭을 다 쓴다.
  // 화면마다 따로 쥔다 — 프로그램 탭을 오가도 탭 화면이 살아 있어 그대로다(program-shell)
  // 같은 날 사용자 "드래그로 자유롭게 조정" → "영역 사이 중간선을 끌게, 접기 단추는 양쪽으로 중간에" — 사이 칸이 구분선이고 끌면 목록 폭이 바뀐다.
  // 선 가운데 단추로 목록이나 상세 한쪽을 접는다. 폭은 화면(주소)마다 기억한다(split-handle)
  const split = useListSplit();
  const listRef = useRef<HTMLDivElement>(null);
  const { hidden } = split;
  const cols = hidden === "list" ? "lg:grid-cols-[1.5rem_minmax(0,1fr)]" : hidden === "detail" ? "lg:grid-cols-[minmax(0,1fr)_1.5rem]" : "lg:grid-cols-[var(--master-w)_1.5rem_minmax(0,1fr)]";
  return (
    <div className={cn("grid items-start gap-4 lg:gap-0", cols)} style={{ "--master-w": split.width === null ? listWidth : `${split.width}px` } as React.CSSProperties}>
      <div ref={listRef} hidden={hidden === "list"} className="min-w-0 lg:sticky lg:top-[calc(var(--header-h)+var(--admin-head-h,76px)+12px)]">
        <FitFillContext value>{list}</FitFillContext>
      </div>
      <SplitHandle split={split} listRef={listRef} className="hidden lg:flex" />
      <Pane title={detailTitle} actions={detailActions} className={hidden === "detail" ? "hidden" : undefined}>
        {detail}
      </Pane>
    </div>
  );
}

/** 테두리 친 판 + 제목 띠(백오피스 패널 머리). 제목이 없으면 띠 없이 판만 */
export function Pane({ title, actions, children, className }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    // overflow-hidden 을 두지 않는다 — 안쪽 sticky(미리 보기 기둥)가 이 판에 갇혀 스크롤을 따라오지 못했다(2026-10-30 사용자 "스크롤할 때 같이 내려오면")
    <section className={cn("min-w-0 rounded-xl border border-line bg-surface-4", className)}>
      {(title || actions) && (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-line bg-surface px-3.5 py-1.5">
          <h2 className="flex min-w-0 items-center gap-2 text-[14px] font-extrabold text-ink before:h-3.5 before:w-[3px] before:shrink-0 before:rounded-full before:bg-acc">{title}</h2>
          {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className="flex flex-col gap-2.5 p-2.5">{children}</div>
    </section>
  );
}

/** 상세 탭. 백오피스의 폴더 탭 — 고른 탭만 흰 면이 판과 이어진다 */
export function ScreenTabs({ label, tabs, active, onChange, aside }: { label: string; tabs: Array<{ key: string; label: string; panel: React.ReactNode }>; active: string; onChange: (key: string) => void; aside?: React.ReactNode }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const n = (next + tabs.length) % tabs.length;
    onChange(tabs[n].key);
    refs.current[n]?.focus();
  };
  const tabsBox = (
    <div className="flex min-w-0 flex-col">
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line-strong px-1 pt-px">
        {tabs.map((t, i) => {
          const on = t.key === current?.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.key}`}
              aria-selected={on}
              aria-controls={`${base}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.key)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "press -mb-px min-h-10 shrink-0 rounded-t-lg border px-4 text-[13px] transition-colors duration-fast",
                on
                  ? "border-line-strong border-b-surface bg-surface font-bold text-acc shadow-[inset_0_2px_0_var(--acc)]"
                  : "border-line border-b-line-strong bg-surface-2 font-medium text-mut hover:bg-surface hover:text-ink",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={current ? `${base}-tab-${current.key}` : undefined} className="flex flex-col gap-3 rounded-b-xl border border-t-0 border-line-strong bg-surface p-2.5 sm:p-3">
        {current?.panel}
      </div>
    </div>
  );
  return aside ? <WithAside aside={aside}>{tabsBox}</WithAside> : tabsBox;
}

/**
 * 상세 옆 따라오는 기둥(미리 보기). 탭이 있든 없든 같은 자리에 선다.
 * 상세 판이 웬만큼만 넓어도 오른쪽 기둥이다(아래로 내리면 있는지조차 몰랐다, 2026-10-30 사용자). 아주 좁을 때만 아래. 기둥은 붙어 따라와 긴 상세를 내려도 보인다.
 * 화면 폭이 아니라 상세 판 폭으로 가른다(@container) — 목록이 옆에 서 있어 화면 폭으로는 판 폭을 알 수 없다
 * 기둥 폭은 판 폭을 따라 늘기만 하고 330px(미리 보기 카드 제 폭, pricing-form/preview 의 CARD_MIN_W)에서 멈춘다.
 * 900px 부터 280px 로 고정하던 단을 걷었다 — 34% 로 306px 까지 컸다가 280px 로 줄어 구분선을 끌 때 미리 보기가 커졌다 작아졌다(2026-10-30 사용자)
 */
/** 폼 칸에 포커스가 들어가면 그 칸의 spot 을 미리 보기(aside 안 PreviewSpotlight)에 알린다(screen/preview-spot) */
export function WithAside({ aside, children }: { aside: React.ReactNode; children: React.ReactNode }) {
  const { spot, bind } = useSpotFocus();
  return (
    <div className="@container">
      <div className="grid items-start gap-3 @min-[480px]:grid-cols-[minmax(0,1fr)_clamp(210px,34%,330px)]">
        <div className="flex min-w-0 flex-col gap-3" {...bind}>
          {children}
        </div>
        <div className="min-w-0 @min-[480px]:sticky @min-[480px]:top-[calc(var(--header-h)+var(--admin-head-h,76px)+12px)] @min-[480px]:max-h-[calc(100svh-var(--header-h)-var(--admin-head-h,76px)-24px)]">
          <SpotProvider spot={spot}>{aside}</SpotProvider>
        </div>
      </div>
    </div>
  );
}

/** 접히는 묶음 — 백오피스 상세의 "− 상품분류" 꼴. 머리 오른쪽에 그 묶음만의 단추를 둔다(고객상세정보의 "배달지관리" 자리) */
/** labelWidth: 이 묶음의 이름표 칸 폭. 긴 이름표("프로모션코드/명")가 꺾이지 않게 그 묶음만 넓힌다 — 모두 넓히면 왼쪽 여백이 늘었다(2026-10-30 사용자) */
export function FormSection({ title, action, defaultOpen = true, labelWidth, children }: { title: string; action?: React.ReactNode; defaultOpen?: boolean; labelWidth?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="@container overflow-hidden rounded-xl border border-line" style={labelWidth ? ({ "--field-label-w": labelWidth } as React.CSSProperties) : undefined}>
      <div className={cn("flex min-h-10 items-center justify-between gap-2 bg-surface-2 pl-2 pr-2", open && "border-b border-line")}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="press flex min-h-10 items-center gap-1.5 rounded-md px-1.5 text-[13.5px] font-bold text-ink">
          <ChevronDownIcon size={15} className={cn("text-dim transition-transform duration-base", !open && "-rotate-90")} />
          {title}
        </button>
        {action}
      </div>
      {open && (
        <div id={id} className="grid gap-x-4 gap-y-2 py-2.5 pl-1.5 pr-3 @min-[420px]:grid-cols-2 [@media(pointer:fine)]:[&_input]:h-10 [@media(pointer:fine)]:[&_input]:min-h-10 [@media(pointer:fine)]:[&_button[aria-haspopup]]:h-10">
          {children}
        </div>
      )}
    </section>
  );
}

/** 칸 하나 — 이름표 왼쪽(오른쪽 정렬), 필수면 빨간 *. 묶음이 420px 이상이면 칸 둘이 한 줄에 선다(2026-10-30 사용자 "기간이랑 판매여부 같은 행이어도 충분", 긴 글 칸만 wide). 묶음이 300px 보다 좁을 때만 이름표가 칸 위로 올라간다. wide 는 묶음 두 열을 다 쓴다. 열 수는 묶음 폭(@container)으로 정한다 — 미리 보기 기둥이 옆에 서면 좁아진다 */
/** error: 저장 검사 문구. 칸 컴포넌트가 스스로 오류를 그리지 못할 때(날짜 짝, 고르기 칸)만 넘긴다 — TextField, NumberField 는 error 를 직접 받는다 */
/** spot: 이 칸이 바꾸는 미리 보기 자리 이름(screen/preview-spot). WithAside 안에서 포커스가 들어가면 미리 보기의 그 자리를 강조한다 */
export function Field({ label, htmlFor, required, wide, hint, error, spot, children }: { label: string; htmlFor?: string; required?: boolean; wide?: boolean; hint?: React.ReactNode; error?: string; spot?: string; children: React.ReactNode }) {
  return (
    <div data-preview-spot={spot} className={cn("grid items-start gap-x-2 gap-y-1 @min-[300px]:grid-cols-[var(--field-label-w,72px)_minmax(0,1fr)]", wide && FULL_ROW)}>
      <label htmlFor={htmlFor} className="flex items-center gap-0.5 text-[12.5px] font-semibold text-mut @min-[300px]:min-h-10 @min-[300px]:justify-end @min-[300px]:text-right">
        {required && (
          <span aria-hidden className="text-danger">
            *
          </span>
        )}
        {label}
        {required && <span className="sr-only">{SM.required}</span>}
      </label>
      <div className="min-w-0">{children}</div>
      {error && (
        <p role="alert" className="text-[12px] font-medium text-danger @min-[300px]:col-start-2">
          {error}
        </p>
      )}
      {hint && !error && <p className="text-[11.5px] text-dim @min-[300px]:col-start-2">{hint}</p>}
    </div>
  );
}

/**
 * 한 줄에 두 칸 — 시작일 ~ 끝일처럼 짝이 되는 값. 칸마다 한 줄씩 쓰면 폼이 쓸데없이 길어진다(2026-10-30, 사용자 "1행에서 시작일 종료일").
 * 좁으면 둘째 칸이 아래로 접힌다
 */
export function FieldPair({ from, to, joiner = "~" }: { from: React.ReactNode; to: React.ReactNode; joiner?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="min-w-[112px] flex-1">{from}</div>
      <span aria-hidden className="text-[13px] text-dim">
        {joiner}
      </span>
      <div className="min-w-[112px] flex-1">{to}</div>
    </div>
  );
}

/**
 * 코드 + 코드명 한 칸 — 관리 대상은 코드와 그 이름을 한 이름표("프로모션코드/명") 아래 나란히 둔다(2026-10-30 사용자 "코드 관리는 코드 + 코드명").
 * 코드는 회색(고칠 수 없음), 이름은 입력. 이름 칸이 더 길어야 해서 2:3 으로 나눈다. Field 에 wide 로 넣는다
 */
export function CodeName({ code, children }: { code: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-1.5">
      <ReadValue>{code}</ReadValue>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * 고칠 수 없는 값 — 회색 칸(백오피스의 계산, 코드 칸).
 * 글자 값은 한 줄로 자르고, 잘렸을 때만 올리면 전체 값을 말풍선으로 띄운다(ui/tooltip 의 Clamp, 2026-10-30 사용자 "폼 필드들도 툴팁, 공통화").
 * 배지, 링크 같은 조각은 그대로 둔다 — 조각에서 글자를 긁어내지 않는다(Clamp 머리 주석)
 */
export function ReadValue({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  const text = typeof children === "string" || typeof children === "number" ? String(children) : null;
  return (
    <div className={cn("flex min-h-11 min-w-0 items-center rounded-xl bg-surface-2 px-3.5 text-[14px] text-mut [@media(pointer:fine)]:min-h-10", align === "right" && "justify-end tabular-nums")}>
      {text !== null ? <Clamp className={cn("min-w-0", align === "right" && "text-right")}>{text}</Clamp> : children}
    </div>
  );
}
