// 인증 화면 셸(화면 08) — 좌: 로고 + 카피 블록, 우: 탭이 달린 폼 카드. 모바일에선 한 칸으로 접힌다.
//
// 2026-09-22 손봄. 실측으로 드러난 것 넷을 고쳤다.
//
// 1) 데스크탑에서 본문이 위에 붙고 그 아래 600px 이 비어 있었다(1440x950 에서 내용이 700px 에서 끝났다).
//    로그인은 화면에 할 일이 하나뿐인 자리라, 그 하나가 화면 위쪽 구석에 붙으면 페이지가 잘린 것처럼 보인다.
//    셸이 main 이 남긴 높이를 전부 받아(flex-1) 세로 가운데로 모은다.
// 2) 폼 판이 760px 이었다 — 칸 두 개를 담는 판으로는 너무 넓어 라벨과 칸 사이가 허전했다.
//    오른쪽 칸을 400px 로 못 박는다. 왼쪽 카피는 남는 폭을 가져간다.
// 3) 좁은 화면에서 **폼이 첫 화면 밖에 있었다** — 카피 블록(제목 + 본문 + 목록 셋)을 다 지나야 칸이 나온다.
//    이 화면에 온 사람은 로그인하러 온 사람이다. 좁은 화면에서는 카피를 통째로 폼 **아래**로 내린다.
//    같은 markup 을 두 벌 두지 않으려고(§3) 격자 칸 배치로만 순서를 바꾼다 — DOM 은 한 벌이다.
//    (2026-09-22 2차 실측: 목록만 내려서는 모자랐다. 가입 탭은 제목이 세 줄로 접혀 제출 버튼이
//     390x844 에서 951px 에 있었다 — 첫 화면 밖이다. 화면 정체성은 머리띠의 로고가 이미 말한다.)
// 4) 제목의 <br/> 이 낱말을 붙여 버렸다. 접근성 트리에 "판정은로그인" 으로 들어간다(낭독기가 그대로 읽는다).
//    줄바꿈을 block span 으로 바꾸면 이름 계산에 낱말 경계가 생긴다.
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { BrandSymbol } from "@/components/ui/logo";
import { Page, Panel } from "@/components/ui/page";
import { TypingTitle } from "@/components/ui/typing-title";
import { HeartIcon, SproutIcon, TagIcon } from "@/components/ui/icons";
import { AuthAlertPreview, AuthBeam, AuthGlow } from "@/components/auth/auth-showcase";

/** 카피는 탭마다 다르다 — 가입 탭에서 "로그인 후 사용할 수 있어요" 가 걸려 있으면 화면이 딴말을 한다 */
export type AuthCardMode = "signIn" | "signUp" | "reset";

/**
 * 왼쪽 카피(2026-10-30 다시 씀, 사용자: "우리 서비스에 맞게, 자연스럽게"). 로그인은 돌아온 사람에게 찜 목록을,
 * 가입은 처음 온 사람에게 "여러 스토어 가격을 한곳에서" 를 말한다. 기능 이름(기기 판정, 조건)을 앞세우지 않는다 — 쓰는 사람의 말로 쓴다.
 * body 가 없는 탭은 제목과 목록만 선다(로그인 탭 본문은 같은 날 사용자가 걷었다)
 */
const LEAD: Record<AuthCardMode, { title: readonly [string, string]; body?: string }> = {
  signIn: {
    title: ["오늘은 어떤 게임이", "할인 중일까요?"],
  },
  signUp: {
    title: ["사고 싶은 게임,", "가장 쌀 때 알려 드릴게요"],
    // 문구는 사용자 지정(2026-10-30) — 플랫폼 이름 표기도 그대로 둔다
    body: "PC, PlayStation, XBOX, SWITCH 가격을 한 곳에서 비교해요.",
  },
  // 재설정은 로그인 탭의 연장이다 — 두 탭 다 켜지 않고, 왼쪽 카피만 지금 하는 일을 말한다
  reset: {
    title: ["비밀번호를 잊어도", "계정은 그대로예요"],
    body: "가입한 이메일로 링크를 보내 드려요. 새 비밀번호를 정하면 다른 기기의 로그인은 모두 풀려요.",
  },
};

/**
 * 계정으로 할 수 있는 것 셋 — 찜 할인 알림(sync/dispatch-wish-alerts), 인디 게임 소개(/indie/new), 스토어 가격 비교.
 * 둘째 칸은 기기 판정이던 것을 인디로 바꿨다(2026-10-30 사용자) — 가입할 이유로는 "내 게임을 알릴 수 있다" 가 더 크다.
 * 그림은 번호 대신 뜻을 말하는 아이콘이다(같은 날 "밋밋하다")
 */
const LEAD_POINTS: readonly { text: string; icon: ReactNode }[] = [
  { text: "찜해 두면 할인이 시작될 때 바로 알려 드려요", icon: <HeartIcon size={15} /> },
  { text: "인디 개발자라면 내 게임을 직접 소개할 수 있어요", icon: <SproutIcon size={15} /> },
  { text: "스토어마다 다른 가격을 한눈에 비교해요", icon: <TagIcon size={15} /> },
];

function Tab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // 고른 탭이 흰 알약이다 — 판(--surface-2) 위에 올라선 것이 곧 "지금 여기" 다.
        // 높이 44px 는 규약 §6 의 터치 타깃이다(36px 이던 것을 올렸다 — 두 탭이 서로 붙어 있어
        // 좁은 화면에서 오탭이 곧 "폼을 다시 채우기" 로 이어지는 자리다)
        "press inline-flex h-11 items-center rounded-full px-4 text-[14px] transition-colors duration-base",
        active ? "bg-surface font-bold text-ink shadow-hair" : "text-mut hover:text-ink",
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
  mode: AuthCardMode;
  /** 판 머리 탭 아래 한 줄. 가입 탭은 없다(2026-10-30 사용자가 걷음) — 폼이 길어 한 줄이라도 줄여야 첫 화면에 단추까지 들어온다 */
  subtitle?: string;
  next: string;
  children: ReactNode;
}) {
  const withNext = (base: string) => (next === ROUTES.home ? base : `${base}?next=${encodeURIComponent(next)}`);
  const lead = LEAD[mode];

  return (
    // flex-1 + justify-center: main 이 남긴 높이를 그대로 받아 세로 가운데로 모은다(백분율을 쓰지 않는 이유는 root layout 주석).
    // 좁은 화면에서는 내용이 화면보다 길어 가운데 정렬이 의미를 잃고 그대로 위에서부터 흐른다.
    // 위아래 여백은 auth(20px) — 홈 값(아래 90px)이면 가입 폼이 화면 높이를 넘어 세로 스크롤이 생겼다(2026-10-30 사용자 "세로 스크롤 최대한 생기지 않게")
    <Page pad="auth" data-auth-screen className="relative isolate flex-1 justify-center">
      <AuthGlow />
      {/* 왼쪽 칸을 1fr 로 두면 넓은 화면에서 남는 폭을 다 가져가 카피와 폼 사이가 수백 px 벌어졌다(2026-10-30 사용자: "사이 공백이 넘 많어").
          카피 칸은 글 폭만큼(auto)만 잡고 두 칸 묶음을 가운데로 모은다. 두 칸 사이는 gap-x 하나가 정한다 */}
      <div className="grid items-center gap-x-16 gap-y-9 lg:grid-cols-[auto_440px] lg:justify-center">
        {/* 판이 두 줄을 관통해 줄 높이가 판 높이의 반씩이다. 카피는 윗줄 바닥에, 목록은 아랫줄 위에 붙여야 둘 사이가 gap-y 만큼만 빈다
            (가운데 정렬이면 둘이 각자 반쪽의 가운데로 떠서 사이가 140px 넘게 벌어졌다) */}
        <div className="reveal relative row-start-2 flex flex-col gap-[18px] lg:col-start-1 lg:row-start-1 lg:self-end" style={stagger(0)}>
          <AuthBeam />
          {/* 손전등이 딸깍 켜졌다 오래 머무는 박자(globals.css .torch, 알리기 판과 같은 움직임) — 제목이 찍히는 동안 빛이 들어온다 */}
          <Link href={ROUTES.home} aria-label={`${SITE.name} 홈`} className="press torch w-fit">
            <BrandSymbol size={34} />
          </Link>
          {/* 탭을 바꾸면 화면이 새로 서서 제목이 다시 찍힌다(ui/typing-title) */}
          <TypingTitle lines={lead.title} className="text-[30px] font-extrabold leading-[1.2] tracking-[-0.045em] text-ink sm:text-[40px]" />
          {lead.body && <p className="max-w-[420px] text-[14px] leading-[1.85] text-mut">{lead.body}</p>}
        </div>

        {/* 격자에서 오른쪽 칸 전체를 세로로 관통한다 — 왼쪽이 카피 + 목록 두 줄로 갈려도 판은 한 덩어리다 */}
        <Panel className="reveal row-start-1 flex flex-col gap-3 p-5 sm:p-6 lg:col-start-2 lg:row-start-1 lg:row-span-2" style={stagger(1)}>
          <div className="flex gap-1">
            <Tab href={withNext(ROUTES.signIn)} active={mode === "signIn"}>
              {M.signInCta}
            </Tab>
            <Tab href={withNext(ROUTES.signUp)} active={mode === "signUp"}>
              {M.signUpCta}
            </Tab>
          </div>
          {subtitle && <p className="text-[12.5px] text-dim">{subtitle}</p>}
          {children}
        </Panel>

        {/* 좁은 화면에서는 셋째 줄. 넓은 화면에서만 왼쪽 칸 둘째 줄로 올라가 카피 아래에 붙는다 */}
        <ul className="reveal row-start-3 flex flex-col gap-3 lg:col-start-1 lg:row-start-2 lg:self-start" style={stagger(2)}>
          {LEAD_POINTS.map((point, i) => (
            <li key={point.text} className="enter-item flex items-center gap-3 text-[13.5px] text-ink-2" style={stagger(i + 3)}>
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-acc-soft text-acc">
                {point.icon}
              </span>
              {point.text}
            </li>
          ))}
          <li className="mt-2 list-none">
            <AuthAlertPreview />
          </li>
        </ul>
      </div>
    </Page>
  );
}
