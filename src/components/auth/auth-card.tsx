// 인증 화면 셸(화면 08) — 좌: 로고 + 카피 블록, 우: 탭이 달린 폼 카드. 모바일에선 한 칸으로 접힌다.
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { BrandSymbol } from "@/components/ui/logo";
import { Page, Panel } from "@/components/ui/page";

const LEAD_TITLE = ["위시리스트와 할인 알림은", "로그인 후 사용할 수 있어요"];
const LEAD_BODY = "가격은 로그인 없이도 전부 볼 수 있어요. 계정은 알림을 보낼 기기를 기억하는 데만 씁니다.";
/** 계정이 무엇을 해 주는지 — 번호를 매기는 이유는 셋이 순서가 아니라 목록이라는 걸 눈으로 세게 하기 위해서다 */
const LEAD_POINTS = [
  "찜한 게임이 할인되면 웹푸시로 1회 알려드려요",
  "기기를 등록하면 게임이 돌아가는지 판정해 드려요",
  "플랫폼별 최저가를 한 화면에서 비교해요",
];

function Tab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // 고른 탭이 흰 알약이다 — 판(--surface-2) 위에 올라선 것이 곧 "지금 여기" 다
        "press rounded-full px-4 py-2 text-[13.5px] transition-colors duration-base",
        active ? "bg-surface font-bold text-ink" : "text-mut hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

export function AuthCard({
  mode,
  subtitle,
  next,
  children,
}: {
  mode: "signIn" | "signUp";
  subtitle: string;
  next: string;
  children: ReactNode;
}) {
  const withNext = (base: string) => (next === ROUTES.home ? base : `${base}?next=${encodeURIComponent(next)}`);

  return (
    <Page pad="home" className="grid items-start gap-x-12 gap-y-9 sm:grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))]">
      <div className="reveal flex flex-col gap-[18px]" style={stagger(0)}>
        <Link href={ROUTES.home} aria-label={`${SITE.name} 홈`} className="press w-fit">
          <BrandSymbol size={34} />
        </Link>
        <h1 className="text-[30px] font-extrabold leading-[1.2] tracking-[-0.045em] text-ink sm:text-[40px]">
          {LEAD_TITLE[0]}
          <br />
          {LEAD_TITLE[1]}
        </h1>
        <p className="max-w-[420px] text-[14px] leading-[1.85] text-mut">{LEAD_BODY}</p>
        <ul className="mt-1.5 flex flex-col gap-3">
          {LEAD_POINTS.map((point, i) => (
            <li key={point} className="flex items-baseline gap-2.5 text-[13.5px] text-mut">
              <span aria-hidden className="text-[15px] font-extrabold text-acc">
                {i + 1}
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <Panel className="reveal flex flex-col gap-[18px] p-7" style={stagger(1)}>
        <div className="flex gap-1">
          <Tab href={withNext(ROUTES.signIn)} active={mode === "signIn"}>
            {M.signInCta}
          </Tab>
          <Tab href={withNext(ROUTES.signUp)} active={mode === "signUp"}>
            회원가입
          </Tab>
        </div>
        <p className="text-[12.5px] text-dim">{subtitle}</p>
        {children}
      </Panel>
    </Page>
  );
}
