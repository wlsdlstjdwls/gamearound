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

/** 카피는 탭마다 다르다 — 가입 탭에서 "로그인 후 사용할 수 있어요" 가 걸려 있으면 화면이 딴말을 한다 */
export type AuthCardMode = "signIn" | "signUp" | "reset";

const LEAD: Record<AuthCardMode, { title: readonly [string, string]; body: string }> = {
  signIn: {
    title: ["할인 알림과 기기 판정은", "로그인 후 사용할 수 있어요"],
    body: "가격은 로그인 없이도 전부 볼 수 있어요. 계정은 알림을 보낼 기기를 기억하는 데만 써요.",
  },
  signUp: {
    title: ["가격은 우리가 볼게요", "싸지면 알려드릴게요"],
    body: `${SITE.name} 계정은 무료예요. 조건을 걸어 두면 그 값이 될 때까지 대신 지켜봐요.`,
  },
  // 재설정은 로그인 탭의 연장이다 — 두 탭 다 켜지 않고, 왼쪽 카피만 지금 하는 일을 말한다
  reset: {
    title: ["비밀번호를 잊어도", "계정은 그대로예요"],
    body: "가입한 이메일로 링크를 보내 드려요. 새 비밀번호를 정하면 다른 기기의 로그인은 모두 풀려요.",
  },
};

/** 계정이 무엇을 해 주는지 — 번호를 매기는 이유는 셋이 순서가 아니라 목록이라는 걸 눈으로 세게 하기 위해서다 */
const LEAD_POINTS = [
  "조건을 걸어 둔 게임이 할인되면 웹푸시로 1회 알려드려요",
  "기기를 등록하면 게임이 돌아가는지 판정해 드려요",
  "플랫폼별 최저가를 한 화면에서 비교해요",
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
  subtitle: string;
  next: string;
  children: ReactNode;
}) {
  const withNext = (base: string) => (next === ROUTES.home ? base : `${base}?next=${encodeURIComponent(next)}`);
  const lead = LEAD[mode];

  return (
    // flex-1 + justify-center: main 이 남긴 높이를 그대로 받아 세로 가운데로 모은다(백분율을 쓰지 않는 이유는 root layout 주석).
    // 좁은 화면에서는 내용이 화면보다 길어 가운데 정렬이 의미를 잃고 그대로 위에서부터 흐른다.
    <Page pad="home" className="flex-1 justify-center">
      <div className="grid items-center gap-x-14 gap-y-9 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="reveal row-start-2 flex flex-col gap-[18px] lg:col-start-1 lg:row-start-1" style={stagger(0)}>
          <Link href={ROUTES.home} aria-label={`${SITE.name} 홈`} className="press w-fit">
            <BrandSymbol size={34} />
          </Link>
          <h1 className="text-[30px] font-extrabold leading-[1.2] tracking-[-0.045em] text-ink sm:text-[40px]">
            {/* block span 두 개 — <br/> 로 끊으면 접근성 이름이 "판정은로그인" 으로 붙는다 */}
            <span className="block">{lead.title[0]}</span>
            <span className="block">{lead.title[1]}</span>
          </h1>
          <p className="max-w-[420px] text-[14px] leading-[1.85] text-mut">{lead.body}</p>
        </div>

        {/* 격자에서 오른쪽 칸 전체를 세로로 관통한다 — 왼쪽이 카피 + 목록 두 줄로 갈려도 판은 한 덩어리다 */}
        <Panel className="reveal row-start-1 flex flex-col gap-[18px] p-6 sm:p-7 lg:col-start-2 lg:row-start-1 lg:row-span-2" style={stagger(1)}>
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

        {/* 좁은 화면에서는 셋째 줄. 넓은 화면에서만 왼쪽 칸 둘째 줄로 올라가 카피 아래에 붙는다 */}
        <ul className="reveal row-start-3 flex flex-col gap-3 lg:col-start-1 lg:row-start-2 lg:mt-1.5" style={stagger(2)}>
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
    </Page>
  );
}
