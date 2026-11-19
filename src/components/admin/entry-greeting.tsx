"use client";
// 관리자 로그인 직후 한 번 뜨는 진입 인사 화면(2026-11-19, 사용자 "fitin-bo 처럼 로그인 화면 -> 홈화면 사이에 나오는 화면").
// 표식, 박자, 왜 쿠키인지는 lib/admin/greeting 머리 주석.
//
// 흐름은 fitin 의 센터 진입 인사와 같다: 워드마크 → 확인 문구 두 줄 → "OO님, 들어가요" 와 쓸 수 있는 것(fitin 은 구독 상품, 우리는 상위메뉴) → 사라짐.
// 클릭 없이 저절로 넘어가고, 아무 데나 누르거나 Esc, Enter 를 치면 바로 사라진다(기다리기 싫은 사람의 길).
// 단계 바뀜만 상태로 들고 움직임은 CSS 가 한다(AGENTS §6). 움직임을 줄인 사람은 전역 킬스위치가 멈춰 세우고, 단계는 그대로 넘어간다.
import { useEffect, useState } from "react";
import { useMenuGroups } from "@/components/admin/program-policy";
import { inFrame } from "@/components/admin/program-shell/frame";
import { BrandLockup } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { ADMIN_GREET_COOKIE, GREET_TIMING } from "@/lib/admin/greeting";
import { GREETING_MESSAGES as M } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";

type Phase = number | "result" | "fading" | "done";

/** 워드마크 심볼 폭. 로그인 화면 로고(48)보다 한 단계 크게 — 이 화면의 주인공이다 */
const LOCKUP_SIZE = 72;

export function EntryGreeting({ name, covers }: { name: string; covers: string[] }) {
  const [phase, setPhase] = useState<Phase>(0);
  const groups = useMenuGroups();
  // 대시보드(제목 없는 칸)는 누구나 열려 있어 "쓸 수 있는 것" 으로 세지 않는다
  const titled = groups.filter((g) => g.title).map((g) => ({ title: g.title as string, n: g.items.filter((i) => i.href !== ROUTES.admin).length }));

  useEffect(() => {
    // 탭 안 문서에서는 뜨지 않는다(globals.css 가 그려지기 전부터 숨기고, 단계는 혼자 돌다 사라진다). 표식은 바깥 문서가 지운다
    if (inFrame()) return;
    document.cookie = `${ADMIN_GREET_COOKIE}=; Max-Age=0; path=/`;
  }, []);

  useEffect(() => {
    if (phase === "done") return;
    const next: Record<string, [Phase, number]> = {
      result: ["fading", GREET_TIMING.resultMs],
      fading: ["done", GREET_TIMING.fadeMs],
    };
    const [to, ms] =
      typeof phase === "number" ? [phase + 1 < M.phrases.length ? phase + 1 : ("result" as Phase), GREET_TIMING.phraseMs] : next[phase];
    const t = window.setTimeout(() => setPhase(to), ms);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") setPhase((p) => (p === "done" ? p : "fading"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      data-admin-greet
      role="status"
      aria-live="polite"
      onClick={() => setPhase("fading")}
      className={cn("admin-greet fixed inset-0 z-[80] flex cursor-pointer flex-col items-center justify-center gap-6 overflow-hidden bg-bg px-4 text-ink", phase === "fading" && "admin-greet-out")}
    >
      {/* 뒤 그림: 게임 가로 배너 벽을 비스듬히 깔고 천천히 흘린다. 바탕색 덮개로 눌러 글자가 앞에 선다(globals.css 의 .admin-greet-*).
          배너가 없으면(홈 캐시를 못 읽음) 덮개만 선다 */}
      {covers.length > 0 && (
        <div aria-hidden className="admin-greet-wall absolute grid grid-cols-6 content-center gap-3">
          {covers.map((src) => (
            <div key={src} className="aspect-[460/215] rounded-[var(--radius-md)] bg-surface-2 bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
          ))}
        </div>
      )}
      <div aria-hidden className="admin-greet-scrim absolute inset-0" />
      <BrandLockup size={LOCKUP_SIZE} className="admin-greet-mark relative" />
      <div className="relative flex min-h-28 flex-col items-center gap-2 text-center">
        {typeof phase === "number" ? (
          <p key={phase} className="animate-rise text-[15px] text-mut">
            {M.phrases[phase]}
          </p>
        ) : (
          <Result name={name} groups={titled} />
        )}
      </div>
      <span className="absolute bottom-6 text-[12px] text-mut">{M.skip}</span>
    </div>
  );
}

function Result({ name, groups }: { name: string; groups: { title: string; n: number }[] }) {
  const total = groups.reduce((s, g) => s + g.n, 0);
  return (
    <div className="flex max-w-xl animate-rise flex-col items-center gap-2">
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
