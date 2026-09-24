"use client";
// 홈의 취향 할인 줄 — 온보딩에서 받은 값이 홈을 바꾸는 자리(설계 §9 의 4회차).
//
// 클라이언트에서 받는 이유: 홈 본문은 풀 라우트 캐시라 사람마다 다른 줄을 서버에서 그리면 캐시가 깨진다
// (SessionProvider, api/me/picks 주석과 같은 이유). 로그인이 확인된 뒤에만 묻고, 받은 줄이 비면 아무것도 안 그린다 —
// "추천이 없어요" 를 보여 주면 개인화를 켠 사람에게 첫 인상이 빈 칸이 된다.
//
// 자리는 첫 줄(지금 할인 중) 밑이다. 위에 두면 마운트 뒤 줄이 끼어들며 첫 화면 전체가 아래로 밀린다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { SectionHead } from "@/components/ui/page";
import { useSession } from "@/components/auth/session-provider";
import { PERSONAL_MESSAGES } from "@/lib/onboarding/messages";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import type { PersonalDealsDto } from "@/server/services/profiles";

export function PersonalDeals() {
  const { user, status } = useSession();
  const [picks, setPicks] = useState<PersonalDealsDto | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (status !== "ready" || !userId) return;
    const ctrl = new AbortController();
    fetch(ROUTES.apiMePicks, { cache: "no-store", credentials: "same-origin", signal: ctrl.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ picks: PersonalDealsDto | null }>) : { picks: null }))
      .then((body) => setPicks(body.picks))
      // 덤인 줄이다 — 못 받으면 안 그린다. 오류를 화면에 올리지 않는다
      .catch(() => {});
    return () => ctrl.abort();
  }, [status, userId]);

  // 로그아웃하면 남의 취향이 남지 않게 지운다 — 렌더에서 가른다(effect 로 비우면 한 번 더 그린다)
  const shown = userId ? picks : null;
  if (!shown || shown.items.length === 0) return null;

  return (
    <section aria-labelledby="personal-deals-heading" className="flex flex-col gap-[22px]">
      <SectionHead
        id="personal-deals-heading"
        title={PERSONAL_MESSAGES.dealsTitle}
        note={PERSONAL_MESSAGES.dealsNote}
        action={
          <Link href={shown.href} className="tap inline-flex items-center text-[13px] text-acc hover:underline">
            {PERSONAL_MESSAGES.dealsMore}
          </Link>
        }
        className="enter-item"
        style={stagger(0)}
      />
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-x-6 gap-y-7">
        {shown.items.map((g, i) => (
          <li key={g.slug} className="enter-item" style={stagger(i + 1)}>
            <GameCard game={g} variant="discount" />
          </li>
        ))}
      </ul>
    </section>
  );
}
