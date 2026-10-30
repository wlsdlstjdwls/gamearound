"use client";
// 사이트 화면 조회 신호(2026-10-30, api/visit). 루트 레이아웃에 하나 서서 주소가 바뀔 때마다 한 번 보낸다. 화면에는 아무것도 그리지 않는다.
//
// 방문자 열쇠: 이 브라우저가 처음 올 때 만든 무작위 값(localStorage). 사람을 알아보는 값이 아니라 "같은 브라우저" 를 하루 한 번 세는 데만 쓴다.
// 첫 화면(landing): 이 탭에서 처음 연 화면(sessionStorage). 들어온 길(Referer)은 첫 화면에서만 보낸다 — 그다음 화면의 Referer 는 우리 사이트다.
// 관리자 화면은 세지 않는다 — 운영자의 하루 수백 번 조회가 손님 숫자에 섞인다.
// 저장소를 못 쓰는 브라우저(사생활 보호 창 등)는 그 조회만 센다 — 매번 새 열쇠라 방문자는 많게 어림된다. 화면은 영향이 없다.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** 저장소 열쇠 이름. 다른 기능의 열쇠와 겹치지 않게 앞에 사이트 이름 대신 기능 이름을 붙인다 */
const VISITOR_KEY = "visit-id";
const LANDED_KEY = "visit-landed";

function isAdmin(path: string): boolean {
  return path === ROUTES.admin || path.startsWith(`${ROUTES.admin}/`) || path.startsWith(ROUTES.shopsAdmin);
}

function visitorId(): string {
  try {
    const old = localStorage.getItem(VISITOR_KEY);
    if (old) return old;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function firstInTab(): boolean {
  try {
    if (sessionStorage.getItem(LANDED_KEY)) return false;
    sessionStorage.setItem(LANDED_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export function VisitBeacon() {
  const path = usePathname();
  useEffect(() => {
    if (!path || isAdmin(path)) return;
    const landing = firstInTab();
    const body = new Blob([JSON.stringify({ vid: visitorId(), path, landing, ref: landing ? document.referrer || null : null })], { type: "application/json" });
    try {
      if (!navigator.sendBeacon?.(ROUTES.apiVisit, body)) void fetch(ROUTES.apiVisit, { method: "POST", body, keepalive: true }).catch(() => {});
    } catch {
      // 기록 실패는 화면과 무관하다
    }
  }, [path]);
  return null;
}
