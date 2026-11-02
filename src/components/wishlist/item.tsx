"use client";
// 찜 목록 카드 한 장의 껍데기. 빼기 단추가 누른 순간 카드를 거두게 하는 일만 한다(AGENTS §6 "누른 순간 화면이 먼저 바뀐다").
//
// 카드 본문은 서버가 그린다(값, 기기 줄) — 이 껍데기는 children 으로 받아 감싸기만 한다. 빼기 단추(WishlistRemoveButton)는
// 이 맥락으로 카드를 숨기고, 서버가 실패를 돌려주면 다시 보인다. 앞서는 단추가 "…" 로 바뀐 채 서버 답(로컬 Neon 왕복 몇 초)을 기다렸다.
// 지우지 않고 숨기는(hidden) 이유: 실패하면 그 자리에 그대로 돌아와야 한다 — 성공하면 revalidatePath 가 목록을 새로 그려 카드가 빠진다.
import { createContext, useContext, useState } from "react";

type ItemControl = { hide: () => void; restore: () => void };

const ItemContext = createContext<ItemControl | null>(null);

/** 빼기 단추가 감싼 카드를 숨기고 되살린다. 껍데기 밖이면 아무 일도 하지 않는다 */
export function useWishlistItem(): ItemControl {
  return useContext(ItemContext) ?? NOOP;
}

const NOOP: ItemControl = { hide: () => {}, restore: () => {} };

export function WishlistCard({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const [gone, setGone] = useState(false);
  return (
    <ItemContext.Provider value={{ hide: () => setGone(true), restore: () => setGone(false) }}>
      <li hidden={gone} className={className} style={style}>
        {children}
      </li>
    </ItemContext.Provider>
  );
}
