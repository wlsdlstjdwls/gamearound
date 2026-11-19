"use client";
// 관리자 로그인 직후 한 번 뜨는 진입 인사 화면(2026-11-19, 사용자 "fitin-bo 처럼 로그인 화면 -> 홈화면 사이에 나오는 화면").
// 표식, 박자, 왜 쿠키인지는 lib/admin/greeting 머리 주석. 로그인 화면과 같은 틀(GreetFrame)로 시작해 한 장면으로 이어진다.
//
// 흐름은 fitin 의 센터 진입 인사와 같다: 워드마크 → 확인 문구 두 줄 → "OO님, 들어가요" 와 쓸 수 있는 것(fitin 은 구독 상품, 우리는 상위메뉴) → 사라짐.
// 클릭 없이 저절로 넘어가고, 아무 데나 누르거나 Esc, Enter 를 치면 바로 사라진다(기다리기 싫은 사람의 길).
//
// 단계는 JS 타이머가 아니라 CSS 시간표(globals.css 의 .greet-*)가 넘긴다. 타이머는 수화가 끝나야 돌기 시작하는데,
// 그 전에 화면이 먼저 그려져 첫 문구가 멈춰 있다가 한꺼번에 지나가 버렸다(같은 날 녹화로 확인). CSS 는 그려지는 순간부터 돈다.
// JS 는 끝(덮개가 다 옅어진 animationend)에 덮개를 걷기만 한다. 그 이벤트를 놓칠 때를 위한 안전 타이머도 둔다.
import { useEffect, useState } from "react";
import { GreetFrame } from "@/components/admin/greet-frame";
import { useMenuGroups } from "@/components/admin/program-policy";
import { inFrame } from "@/components/admin/program-shell/frame";
import { cn } from "@/lib/cn";
import { ADMIN_GREET_ATTR, ADMIN_GREET_COOKIE, GREET_TOTAL_MS } from "@/lib/admin/greeting";
import { GREETING_MESSAGES as M } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";

/** 덮개가 다 옅어진 끝을 알리는 키프레임 이름(globals.css). 둘째는 건너뛰기 */
const OUT_ANIMATIONS = ["greet-out", "greet-out-now"];
/** 안전 타이머 여유. 시간표가 다 돈 뒤에도 덮개가 남아 있으면 걷는다 */
const SAFETY_MS = 1500;

export function EntryGreeting({ name, covers }: { name: string; covers: string[] }) {
  const [done, setDone] = useState(false);
  const [skip, setSkip] = useState(false);
  const groups = useMenuGroups();
  // 대시보드(제목 없는 칸)는 누구나 열려 있어 "쓸 수 있는 것" 으로 세지 않는다
  const titled = groups.filter((g) => g.title).map((g) => ({ title: g.title as string, n: g.items.filter((i) => i.href !== ROUTES.admin).length }));

  useEffect(() => {
    // 탭 안 문서에서는 뜨지 않는다(globals.css 가 그려지기 전부터 숨긴다). 표식은 바깥 문서가 지운다
    if (!inFrame()) document.cookie = `${ADMIN_GREET_COOKIE}=; Max-Age=0; path=/`;
    // 루트의 숨은 덮개는 이제 이 화면 밑에 깔렸다 — 걷는다(lib/admin/greeting 의 ADMIN_GREET_ATTR)
    document.documentElement.removeAttribute(ADMIN_GREET_ATTR);
    const t = window.setTimeout(() => setDone(true), GREET_TOTAL_MS + SAFETY_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") setSkip(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (done) return null;

  return (
    <GreetFrame
      data-admin-greet
      role="status"
      aria-live="polite"
      onClick={() => setSkip(true)}
      onAnimationEnd={(e) => {
        if (OUT_ANIMATIONS.includes(e.animationName) && e.target === e.currentTarget) setDone(true);
      }}
      className={cn("admin-greet-run cursor-pointer", skip && "admin-greet-skip")}
      backdrop={
        <>
          {/* 뒤 그림: 게임 가로 배너 벽을 비스듬히 깔고 천천히 흘린다. 바탕색 덮개로 눌러 글자가 앞에 선다.
              배너가 없으면(홈 캐시를 못 읽음) 덮개만 선다 */}
          {covers.length > 0 && (
            <div aria-hidden className="admin-greet-wall absolute grid grid-cols-6 content-center gap-3">
              {covers.map((src) => (
                <div key={src} className="aspect-[460/215] rounded-[var(--radius-md)] bg-surface-2 bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
              ))}
            </div>
          )}
          <div aria-hidden className="admin-greet-scrim absolute inset-0" />
          <span className="absolute bottom-6 text-[12px] text-mut">{M.skip}</span>
        </>
      }
    >
      {M.phrases.map((p, i) => (
        <p key={p} className={cn("text-[15px] text-mut", `greet-phrase-${i}`)}>
          {p}
        </p>
      ))}
      <Result name={name} groups={titled} />
    </GreetFrame>
  );
}

function Result({ name, groups }: { name: string; groups: { title: string; n: number }[] }) {
  const total = groups.reduce((s, g) => s + g.n, 0);
  return (
    <div className="greet-result flex flex-col items-center gap-2">
      <p className="text-[19px] font-semibold">{M.enter(name)}</p>
      {total > 0 ? (
        <>
          <p className="mt-1 text-[12px] text-dim">
            {M.lead} {M.count(total)}
          </p>
          <ul className="flex flex-wrap justify-center gap-1.5">
            {groups.map((g) => (
              <li key={g.title} className="rounded-full bg-acc-soft px-3 py-1 text-[13px] font-medium text-acc-hover">
                {g.title}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="mt-1 text-[14px] text-mut">{M.none}</p>
          <p className="text-[12px] text-dim">{M.noneHint}</p>
        </>
      )}
    </div>
  );
}
