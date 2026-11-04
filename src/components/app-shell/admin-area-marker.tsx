"use client";
// 화면 사이를 옮길 때 html 의 관리자 영역 표시(lib/admin/area)를 고친다. 문서를 처음 열 때는 루트 레이아웃의 첫 스크립트가 찍는다.
// 그리는 것은 없다. 루트 레이아웃은 클라이언트 이동 때 다시 그려지지 않으므로 주소를 구독하는 이 조각이 맡는다.
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { ADMIN_AREA_ATTR } from "@/lib/admin/area";
import { isAdminAreaPath } from "@/lib/auth/sign-in-path";

export function AdminAreaMarker() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute(ADMIN_AREA_ATTR, isAdminAreaPath(pathname));
  }, [pathname]);
  return null;
}
