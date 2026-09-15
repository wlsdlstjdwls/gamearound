"use client";
// 헤더 검색창 — 타이핑하는 대로 결과가 따라온다(엔터를 안 눌러도 된다).
//
// 왜 클라이언트 컴포넌트인가: 입력 상태와 디바운스가 필요하다. 결과는 그대로 서버(/search)가 그린다 —
// 검색 결과 화면이 이미 같은 질의를 서버에서 처리하고 있어서 API 라우트를 따로 두면 같은 일을 두 벌 만들게 된다.
//
// 화면에 검색창은 이것 하나뿐이다. 결과 화면이 자기 검색창을 또 그리면 같은 자리에 입력칸이 둘로 보이고,
// 둘 중 어느 쪽이 현재 질의인지 알 수 없다(2026-09-14 제보).
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, SpinnerIcon, XIcon } from "@/components/ui/icons";
import { MAX_PARAM_LEN } from "@/lib/games-query";
import { ROUTES } from "@/lib/routes";

/**
 * 마지막 타건 후 이만큼 조용하면 질의한다.
 * 한글은 조합 중에도 input 이 뜨므로 너무 짧으면 "ㄱ", "가", "간"... 이 전부 한 번씩 질의가 된다.
 * 250ms 는 낱말 하나를 치는 동안에는 안 나가고, 손을 멈추면 바로 따라오는 정도다.
 */
const DEBOUNCE_MS = 250;

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
  "flex h-9 items-center gap-2 rounded-full border border-transparent bg-surface-2 pl-3 pr-2 transition-[background-color,border-color,box-shadow] duration-base ease-standard focus-within:border-acc focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--acc-glow)]";
const INPUT_CLASS =
  "min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-dim [&::-webkit-search-cancel-button]:appearance-none";
const FORM_CLASS = "min-w-[180px] max-w-[420px] flex-1";
/** 오른쪽 끝 자리 — 스피너와 지우기 버튼이 번갈아 선다. 폭을 고정해야 글자가 밀리지 않는다 */
const TRAIL_CLASS = "flex size-6 shrink-0 items-center justify-center";

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
  // 한글, 일본어 입력기가 글자를 조합하는 중에는 질의하지 않는다 — 자모 단계로 검색이 나간다
  const composing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 뒤로 가기, 다른 화면에서 온 경우처럼 주소가 **밖에서** 바뀌면 입력칸을 주소에 맞춘다.
  // effect 가 아니라 렌더 중 보정인 이유: effect 로 하면 한 번 그린 뒤 다시 그려 입력칸이 깜빡인다.
  // 내가 친 글자가 디바운스를 타고 주소로 나간 경우는 건너뛴다 — 그때 덮어쓰면 아직 안 보낸
  // 뒤쪽 공백이나 조합 중인 글자가 지워진다.
  const [urlEcho, setUrlEcho] = useState(urlQuery);
  if (urlQuery !== urlEcho) {
    setUrlEcho(urlQuery);
    if (urlQuery !== trimQuery(value)) setValue(urlQuery);
  }

  useEffect(() => {
    if (composing.current) return;
    const next = trimQuery(value);
    if (next === urlQuery.trim()) return;
    const id = setTimeout(() => {
      const href = next ? `${ROUTES.search}?q=${encodeURIComponent(next)}` : ROUTES.search;
      // 검색 화면 안에서는 replace 를 쓴다. push 로 쌓으면 한 글자마다 방문 기록이 하나씩 생겨
      // 뒤로 가기가 타이핑을 거꾸로 되감는다. 다른 화면에서 들어올 때만 한 번 push 한다.
      startTransition(() => (onSearchPage ? router.replace(href) : router.push(href)));
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [value, urlQuery, onSearchPage, router]);

  return (
    <form
      role="search"
      className={FORM_CLASS}
      onSubmit={(e) => {
        e.preventDefault(); // 디바운스가 이미 같은 곳으로 보냈다. 엔터는 그걸 앞당기기만 한다
        const next = trimQuery(value);
        if (next) router.push(`${ROUTES.search}?q=${encodeURIComponent(next)}`);
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
          placeholder={SEARCH_PLACEHOLDER}
          onChange={(e) => setValue(e.target.value)}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={(e) => {
            composing.current = false;
            setValue(e.currentTarget.value); // 조합이 끝난 글자로 한 번 더 알려 디바운스를 깨운다
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
                }}
                className="press flex size-6 items-center justify-center rounded-full text-dim transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <XIcon size={13} />
              </button>
            )
          )}
        </span>
      </div>
    </form>
  );
}
