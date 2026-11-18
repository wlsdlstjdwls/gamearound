// 이번 달 명예의 전당 1~3위 띠 — 인디 상세 맨 위, 화면 폭 금속 띠(2026-11-18 사용자 L2 + C1 선택,
// docs/명예의전당_페이지연출_시안_2026-11-18.html).
//
// 지나온 길(같은 날): 회색 딱지("강조가 안 된다"), 색 딱지 여섯, 월계관, 메달, 어두운 무대 띠("너무 오바")를 거쳐 우리 트로피 그림(public/fame)을
// 카드 안 판으로 세웠고, 이어서 "뱃지가 아니라 페이지 전체에 영향 가게" 해서 페이지 바탕 + 머리 아래 띠(L2)로 올라왔다.
// 색은 셋 중 금속 띠(C1): 순위마다 금, 은, 동 광택 띠에 짙은 글자, 페이지 바탕은 그 금속의 옅은 색이다(globals.css 의 --medal-N-*).
// 카드 안 트로피 판은 걷었다 — 같은 말이 두 번 선다. 반짝임, 움직임은 없다(어두운 무대 띠 시안이 "오바" 였다).
//
// 페이지 바탕은 이 띠가 다는 표지(data-fame-page)로 바뀐다 — body 를 직접 건드리지 않고, 표지가 있는 화면에서만 globals.css 의 :has 규칙이 칠한다.
import Image from "next/image";
import Link from "next/link";
import { FAME_MESSAGES as FM } from "@/lib/indie/fame";
import { ROUTES } from "@/lib/routes";

/** 순위별 트로피 그림(Figma AI 생성, 원본은 Figma 파일 "손전등 명예의 전당 트로피"). 1위 금, 2위 은, 3위 동 */
const TROPHY_SRC = ["/fame/trophy-1.png", "/fame/trophy-2.png", "/fame/trophy-3.png"] as const;
/** 트로피 크기(px). 띠 높이 안에서 글자보다 한 단 크게 */
const TROPHY_PX = 34;
/** 순위별 띠 면, 글자, 아래 선(토큰은 globals.css). 정적 문자열이어야 Tailwind 가 읽는다 */
const BAND = [
  "[background:var(--medal-1-band)] text-[var(--medal-1-ink)] shadow-[inset_0_-1px_0_var(--medal-1-line)]",
  "[background:var(--medal-2-band)] text-[var(--medal-2-ink)] shadow-[inset_0_-1px_0_var(--medal-2-line)]",
  "[background:var(--medal-3-band)] text-[var(--medal-3-ink)] shadow-[inset_0_-1px_0_var(--medal-3-line)]",
] as const;

export function FameRibbon({ rank }: { rank: number }) {
  const i = rank - 1;
  return (
    <div data-fame-page={rank} className={`full-bleed ${BAND[i]}`}>
      <div className="mx-auto flex max-w-[var(--page-w)] items-center gap-3 px-5 py-2 sm:px-7">
        <Image src={TROPHY_SRC[i]} alt="" width={TROPHY_PX} height={TROPHY_PX} className="drop-shadow-[0_2px_3px_rgb(0_0_0/0.25)]" />
        <p className="text-[14.5px] font-bold">
          {FM.detailBadgeHead} <b className="text-[17px] font-black">{FM.detailBadgeRank(rank)}</b>
        </p>
        <Link href={ROUTES.hallOfFame} className="ml-auto shrink-0 text-[13px] font-semibold underline underline-offset-[3px] opacity-85 hover:opacity-100">
          {FM.detailBadgeLink}
        </Link>
      </div>
    </div>
  );
}
