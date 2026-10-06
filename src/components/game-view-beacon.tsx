"use client";
// 게임 상세가 열렸다는 신호를 한 번 보낸다(api/games/view). 화면에는 아무것도 그리지 않는다.
//
// sendBeacon 을 쓰는 이유: 응답을 기다리지 않고, 사용자가 바로 다른 화면으로 가도 브라우저가 끝까지 보낸다.
// 실패해도 조용히 지나간다 — 이 기록은 수집 순서를 조금 바꿀 뿐이라 화면이 신경 쓸 일이 아니다.
import { useEffect } from "react";
import { ROUTES } from "@/lib/routes";

export function GameViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const body = new Blob([JSON.stringify({ slug })], { type: "application/json" });
    try {
      if (!navigator.sendBeacon?.(ROUTES.apiGameView, body)) {
        void fetch(ROUTES.apiGameView, { method: "POST", body, keepalive: true }).catch(() => {});
      }
    } catch {
      // 기록 실패는 화면과 무관하다
    }
  }, [slug]);
  return null;
}
