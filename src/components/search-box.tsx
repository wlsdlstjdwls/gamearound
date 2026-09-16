"use client";
// 헤더 검색창 — 엔터(모바일 자판의 "검색")를 눌러야 결과로 간다.
//
// 타이핑을 따라가던 것을 되돌렸다(2026-09-15 요청). 한 글자마다 화면이 /search 로 바뀌어서
// 보던 화면이 손을 멈출 때마다 사라졌고, 조합이 끝나는 한글은 그 순간이 예측되지 않았다.
// 지금은 "언제 검색되는가" 를 치는 사람이 정한다.
//
// 왜 클라이언트 컴포넌트인가: 입력 상태가 필요하다. 결과는 그대로 서버(/search)가 그린다 —
// 검색 결과 화면이 이미 같은 질의를 서버에서 처리하고 있어서 API 라우트를 따로 두면 같은 일을 두 벌 만들게 된다.
//
// 화면에 검색창은 이것 하나뿐이다. 결과 화면이 자기 검색창을 또 그리면 같은 자리에 입력칸이 둘로 보이고,
// 둘 중 어느 쪽이 현재 질의인지 알 수 없다(2026-09-14 제보).
import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, SpinnerIcon, XIcon } from "@/components/ui/icons";
import { MAX_PARAM_LEN } from "@/lib/games-query";
import { ROUTES } from "@/lib/routes";

const SEARCH_PLACEHOLDER = "게임 제목 검색";

/** 주소에 실리는 형태. 비교와 전송이 같은 규칙을 써야 "바뀌었나" 판정이 흔들리지 않는다 */
function trimQuery(raw: string): string {
  return raw.trim().slice(0, MAX_PARAM_LEN);
}

/*
 * 입력칸 모양.
 *
 * 전에는 흰 헤더 위에 흰 입력칸을 테두리 하나로 세워 뒀다. 테두리 1px 만으로는 "여기에 쓸 수 있다" 가
 * 읽히지 않아 그냥 선이 그어진 빈칸으로 보였고, 34px 높이가 옆 링크들과도 어긋났다.
 * 지금은 바탕을 한 단 가라앉혀(--surface-2) 헤더에서 파인 자리로 만들고, 포커스에서만 테두리와
 * 브랜드 글로우를 켠다 — 평소에는 조용하고 손이 닿은 순간에만 말한다.
 * 모서리를 완전히 굴리는 이유: 이 화면에서 유일하게 "무엇이든 써도 되는" 칸이라 각진 카드, 칩과 달라야 한다.
 */
const FIELD_CLASS =
  "tap flex h-9 items-center gap-2 rounded-full border border-transparent bg-surface-2 pl-3 pr-2 transition-[background-color,border-color,box-shadow] duration-base ease-standard focus-within:border-acc focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--acc-glow)]";
const INPUT_CLASS =
  "min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-dim [&::-webkit-search-cancel-button]:appearance-none";
/*
 * 헤더 안에서 이 칸이 차지하는 자리 — 로고와 메뉴 사이의 남는 폭을 전부 가져간다.
 * 최소 폭을 걸지 않는 이유: 320px 기기에서는 이 칸이 줄어들어야 로고와 햄버거가 한 줄에 남는다.
 * 최소 폭을 걸면 그 순간 셋이 각자 줄을 차지하고 머리띠가 세 배로 자란다.
 */
const FORM_CLASS = "min-w-0 max-w-[420px] flex-1";
/** 오른쪽 끝 자리 — 스피너와 지우기 버튼이 번갈아 선다. 폭을 고정해야 글자가 밀리지 않는다 */
const TRAIL_CLASS = "flex size-7 shrink-0 items-center justify-center";

/**
 * 프리렌더용 껍데기. useSearchParams 는 정적 렌더를 포기시키므로 Suspense 경계 안에 둬야 하고,
 * 그 바깥에는 같은 크기의 무언가가 있어야 헤더가 흔들리지 않는다.
 */
export function SearchBoxFallback() {
  return (
    <div className={FORM_CLASS}>
      <div className={FIELD_CLASS}>
        <SearchIcon size={15} className="shrink-0 text-dim" />
        <input type="search" disabled placeholder={SEARCH_PLACEHOLDER} aria-label="게임 검색" className={INPUT_CLASS} />
        <span aria-hidden className={TRAIL_CLASS} />
      </div>
    </div>
  );
}

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onSearchPage = pathname === ROUTES.search;
  const urlQuery = onSearchPage ? params.get("q") ?? "" : "";

  const [value, setValue] = useState(urlQuery);
  const [isPending, startTransition] = useTransition();
  // 조합 중인 엔터는 "글자 확정"이지 "검색"이 아니다(onKeyDown 주석)
  const composing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 뒤로 가기, 다른 화면에서 온 경우처럼 주소가 **밖에서** 바뀌면 입력칸을 주소에 맞춘다.
  // effect 가 아니라 렌더 중 보정인 이유: effect 로 하면 한 번 그린 뒤 다시 그려 입력칸이 깜빡인다.
  // 방금 내가 엔터로 보낸 주소는 건너뛴다 — 그때 덮어쓰면 아직 안 보낸 뒤쪽 공백이 지워진다.
  const [urlEcho, setUrlEcho] = useState(urlQuery);
  if (urlQuery !== urlEcho) {
    setUrlEcho(urlQuery);
    if (urlQuery !== trimQuery(value)) setValue(urlQuery);
  }

  /** 지금 칸에 있는 글자로 검색 화면에 간다. 빈 칸이면 질의 없는 검색 화면으로 — 결과를 지우는 일도 하나의 요청이다 */
  const submit = () => {
    const next = trimQuery(value);
    const href = next ? `${ROUTES.search}?q=${encodeURIComponent(next)}` : ROUTES.search;
    if (onSearchPage && href === `${ROUTES.search}${urlQuery ? `?q=${encodeURIComponent(urlQuery)}` : ""}`) return;
    startTransition(() => router.push(href));
  };

  return (
    <form
      role="search"
      className={FORM_CLASS}
      onSubmit={(e) => {
        e.preventDefault(); // 기본 GET 제출은 전체 새로고침이다. 이동은 라우터가 한다
        submit();
      }}
    >
      <label htmlFor="q" className="sr-only">게임 검색</label>
      <div className={FIELD_CLASS}>
        <SearchIcon size={15} className="shrink-0 text-dim" />
        <input
          id="q"
          ref={inputRef}
          name="q"
          type="search"
          value={value}
          maxLength={MAX_PARAM_LEN}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={SEARCH_PLACEHOLDER}
          onChange={(e) => setValue(e.target.value)}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
          onKeyDown={(e) => {
            // 한글, 일본어 입력기에서 조합을 끝내는 엔터와 검색하는 엔터는 같은 키다.
            // 막지 않으면 "게임"의 "임"을 확정하는 순간 "게ㅇ"으로 검색이 나간다
            if (e.key === "Enter" && (e.nativeEvent.isComposing || composing.current)) e.preventDefault();
          }}
          className={INPUT_CLASS}
        />
        {/* 오른쪽 끝 한 자리를 스피너와 지우기 버튼이 나눠 쓴다. 자리를 고정해 두는 이유는
            둘이 번갈아 뜨고 질 때 입력칸 폭이 흔들리면 타이핑이 방해받기 때문이다 */}
        <span className={TRAIL_CLASS}>
          {isPending ? (
            <SpinnerIcon size={14} className="text-acc" />
          ) : (
            value !== "" && (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={() => {
                  setValue("");
                  inputRef.current?.focus(); // 지운 뒤 다시 칠 수 있어야 한다 — 포커스를 잃으면 한 번 더 눌러야 한다
                  // 결과 화면에서 지웠으면 결과도 같이 걷는다. 칸만 비우고 결과가 남아 있으면
                  // 화면이 말하는 질의와 칸에 적힌 질의가 어긋난다
                  if (onSearchPage && urlQuery) startTransition(() => router.push(ROUTES.search));
                }}
                // 보이는 동그라미는 28px 이지만 손가락이 닿는 넓이는 44px 이다. 상자를 키우지 않고
                // ::after 로 덮는 이유: 입력칸 높이(36px)를 넘기면 머리띠가 통째로 두꺼워진다
                className="press relative flex size-7 items-center justify-center rounded-full text-dim transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-surface-3 hover:text-ink"
              >
                <XIcon size={14} />
              </button>
            )
          )}
        </span>
      </div>
    </form>
  );
}
