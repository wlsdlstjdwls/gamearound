// 인증 화면 셸(화면 08) — 좌: 로고 + 카피 블록, 우: 탭이 달린 폼 카드. 모바일에선 한 칸으로 접힌다.
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { BrandMark } from "@/components/site-header";
import { Page, Card } from "@/components/ui/page";

const LEAD_TITLE = ["위시리스트와 할인 알림은", "로그인 후 사용할 수 있습니다"];
const LEAD_BODY = "가격은 로그인 없이도 전부 볼 수 있습니다. 계정은 알림을 보낼 기기를 기억하는 데만 씁니다.";

function Tab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press rounded-lg px-3.5 py-[7px] text-[13px] transition-colors duration-base",
        active ? "bg-surface-2 font-bold text-ink" : "text-dim hover:text-ink",
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
    <Page pad="home" className="grid items-start gap-6 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
      <div className="reveal flex flex-col gap-4" style={stagger(0)}>
        <Link href={ROUTES.home} aria-label="손전등 홈" className="press w-fit">
          <BrandMark size={34} />
        </Link>
        <h1 className="text-[26px] font-bold leading-[1.3] tracking-[-0.03em] text-ink">
          {LEAD_TITLE[0]}
          <br />
          {LEAD_TITLE[1]}
        </h1>
        <p className="max-w-[380px] text-[13.5px] leading-[1.8] text-mut">{LEAD_BODY}</p>
      </div>

      <Card className="reveal flex flex-col gap-4 p-[26px]" style={stagger(1)}>
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
      </Card>
    </Page>
  );
}
