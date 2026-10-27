"use client";
// 지금 화면이 주소로 명시한 보기를 쿠키에 적는다(lib/prefs 머리 주석). 그리는 것은 없다.
// 클릭 처리에 붙이지 않고 화면에 둔 이유: 단추(NavChip), 링크 공유, 뒤로가기 어느 길로 와도 "지금 보는 보기" 가 곧 고른 보기다.
import { useEffect } from "react";
import { PREF_MAX_AGE_SEC, type PrefCookie } from "@/lib/prefs";

export function RememberPref({ name, value }: { name: PrefCookie; value: string | undefined }) {
  useEffect(() => {
    if (!value) return;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${PREF_MAX_AGE_SEC}; samesite=lax`;
  }, [name, value]);
  return null;
}
