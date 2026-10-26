"use client";
// 카드 위 찜 하트(기획서 v2.0 5.1 "카드 공통: 찜 버튼", 목업 카드의 오른쪽 위 하트).
//
// 찜 여부는 카드마다 묻지 않는다. 목록 한 쪽이 24장이라 카드마다 서버 액션을 부르면 Neon 왕복이 24번 줄을 선다
// (왕복 1회 약 220ms). 같은 틱에 마운트된 카드들의 slug 를 모아 한 번에 묻는다(wishedSlugsAction).
// 화면은 캐시된 공용 HTML 이라(홈, 목록) 서버가 사람마다 다른 하트를 그려 줄 수 없다 — 마운트 뒤에 채운다.
//
// 누른 순간 바뀐다(AGENTS 6장). 비로그인이면 로그인 팝업 뒤 이어서 찜한다(auth/login-gate). 실패하면 되돌리고 토스트가 이유를 말한다.
import { useEffect, useOptimistic, useSyncExternalStore, useTransition } from "react";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { useSession } from "@/components/auth/session-provider";
import { BellIcon, HeartIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { toggleWishBySlugAction, wishedSlugsAction } from "@/app/(user)/wishlist/actions";
import { WISHLIST_MESSAGES as M } from "@/lib/wishlist/messages";
import { cn } from "@/lib/cn";

/** 이미 물어본 slug 의 답. 화면을 옮겨도 남아 있어 같은 카드를 다시 묻지 않는다 */
const known = new Map<string, boolean>();
/** 이번 틱에 모인 물을 거리 */
let queue = new Set<string>();
let scheduled = false;
const listeners = new Set<() => void>();
/** 답이 바뀔 때마다 오른다 — 구독한 하트가 다시 읽을 신호 */
let version = 0;

function emit() {
  version += 1;
  for (const l of listeners) l();
}

function request(slug: string) {
  if (known.has(slug) || queue.has(slug)) return;
  queue.add(slug);
  if (scheduled) return;
  scheduled = true;
  // 같은 렌더에서 마운트된 카드를 다 모은 뒤 한 번에 묻는다
  queueMicrotask(() => {
    const slugs = [...queue];
    queue = new Set();
    scheduled = false;
    wishedSlugsAction(slugs)
      .then((wished) => {
        const on = new Set(wished);
        for (const s of slugs) known.set(s, on.has(s));
        emit();
      })
      .catch(() => {});
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** 로그아웃하면 남의 하트가 남지 않게 비운다 */
function forget() {
  known.clear();
  emit();
}

/**
 * variant "release": 출시 예정 줄 끝의 "출시 알림" 단추(목업 월별 보기). 하는 일은 찜과 같다 —
 * 찜한 게임이 출시되면 알림함으로 알려 준다(sync/release-alerts 머리 주석: 찜과 출시 알림을 두 칸에 따로 담지 않는 이유).
 */
export function WishHeart({ slug, title, className, variant = "heart" }: { slug: string; title: string; className?: string; variant?: "heart" | "release" }) {
  const { user } = useSession();
  const userId = user?.id ?? null;
  useSyncExternalStore(subscribe, () => version, () => 0);
  const wished = userId ? (known.get(slug) ?? false) : false;
  const [shown, setShown] = useOptimistic(wished);
  const [, start] = useTransition();
  const gate = useLoginGate();
  const toast = useToast();
  const action = `wish-card:${slug}`;

  useEffect(() => {
    if (!userId) {
      if (known.size > 0) forget();
      return;
    }
    request(slug);
  }, [slug, userId]);

  const toggle = (next: boolean) =>
    start(async () => {
      setShown(next);
      const r = await toggleWishBySlugAction(slug);
      if (!r.ok) return toast(r.error);
      known.set(slug, r.wished);
      emit();
      toast(variant === "release" ? (r.wished ? M.releaseAdded : M.releaseRemoved) : r.wished ? M.added : M.removed);
    });

  // 로그인 뒤 이어하기 — 이미 찜한 게임이면 그대로 둔다(토글이라 한 번 더 누르면 풀린다)
  useResume(action, () => {
    if (!wished) toggle(true);
  }, Boolean(userId) && known.has(slug));

  if (variant === "release") {
    return (
      <button
        type="button"
        aria-pressed={shown}
        aria-label={`${title} ${shown ? M.releaseOn : M.releaseOff}`}
        onClick={() => gate(action, () => toggle(!wished))}
        className={cn(
          "press tap inline-flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors sm:w-auto sm:px-3.5",
          shown ? "bg-acc-soft text-acc" : "bg-acc text-on-ink hover:bg-acc-hover",
          className,
        )}
      >
        <BellIcon size={15} />
        {/* 좁은 화면은 종만 — 줄에 날짜, 그림, 제목이 이미 서 있어 글자까지 서면 제목이 한 글자씩 잘린다 */}
        <span aria-hidden className="hidden sm:inline">
          {shown ? M.releaseOn : M.releaseOff}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={shown}
      aria-label={`${title} ${shown ? M.on : M.off}`}
      onClick={() => gate(action, () => toggle(!wished))}
      className={cn(
        "press tap flex size-9 items-center justify-center rounded-full bg-surface/90 shadow-1 backdrop-blur-sm transition-colors",
        // 찜하는 순간 한 번 톡 튄다 — 클래스가 붙는 순간에만 돌아서 풀 때는 조용하다
        shown ? "animate-pop text-acc" : "text-dim hover:text-ink",
        className,
      )}
    >
      <HeartIcon size={17} fill={shown ? "currentColor" : "none"} />
    </button>
  );
}
