"use client";
// 머리띠 하트 단추: 찜 목록으로 곧장 간다(2026-10-28 사용자 지시 "상단 헤더에 아이콘 추가").
// 사용자 메뉴를 열고 찾아 들어가던 길을 한 번 누름으로 줄인다. 종 옆에 같은 크기, 같은 모양으로 선다.
// 로그인하지 않았으면 그대로 /wishlist 로 보낸다 — (user) 레이아웃이 로그인으로 돌렸다가 이 화면으로 되돌려 준다.
// 클라이언트인 이유는 지금 찜 목록을 보고 있는지(켜짐 색) 하나다.
// 좁은 화면(sm 아래)에서는 세우지 않는다 — 390 폭에서 검색창이 "게임, 장" 까지 줄었다. 거기서는 계정 메뉴의 "찜 목록" 이 길이다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";
import { WISHLIST_MESSAGES as M } from "@/lib/wishlist/messages";

export function HeaderWishLink({ className }: { className?: string }) {
  const here = usePathname() === ROUTES.wishlist;
  return (
    <Link
      href={ROUTES.wishlist}
      aria-label={M.title}
      aria-current={here ? "page" : undefined}
      className={cn(
        "press hidden size-[var(--touch-target)] items-center justify-center rounded-lg transition-colors sm:flex sm:size-10",
        here ? "bg-acc-soft text-acc" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <HeartIcon size={HEART_SIZE} className="-translate-y-px" />
    </Link>
  );
}

// 하트 그림은 24 칸 안에서 14x13.5 만 차지하고 종(BellIcon)은 16x17 을 차지한다.
// 같은 19 로 그리면 하트가 눈에 띄게 작아서(10-28 사용자 지적) 종 높이에 맞춰 키운다. 카드의 하트는 그대로 둔다.
// 23 은 선까지 같이 굵어져 종보다 무거워 보였다.
// 하트 그림은 24 칸의 아래쪽(6.5~20)에 앉아 중심이 종(3~20)보다 1.5px 낮다 — 단추 가운데 맞춤만으로는 어긋나 보여(같은 날 사용자) 1px 올린다(2px 는 실측에서 1px 넘쳤다).
const HEART_SIZE = 22;
