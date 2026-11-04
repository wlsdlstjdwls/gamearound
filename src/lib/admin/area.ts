// 관리자 영역 표시 — 지금 주소가 관리자 화면인지 html 에 찍어 둔다(2026-11-04, 사용자 "어드민 진입 시 헤더가 보였다가 사라진다").
//
// 왜 필요한가: 넓은 화면에서 사이트 머리띠를 걷는 규칙은 `body:has([data-admin-rail])` 였다. 기둥은 관리자 레이아웃이 역할 검사와 쿠키를
// 기다린 뒤에야 그리므로, 그 사이(루트 loading 뼈대가 서 있는 동안, 실측 400~500ms) 머리띠가 보였다가 기둥이 오면 사라졌다.
// 주소는 첫 바이트부터 알 수 있다 — 문서를 열 때는 루트 레이아웃의 첫 스크립트가(ADMIN_AREA_INIT_SCRIPT), 화면 사이를 옮길 때는
// AdminAreaMarker(components/app-shell/admin-area-marker)가 이 속성을 고친다. 걷는 규칙은 globals.css 의 html[data-admin-area].
// 관리자 로그인은 영역 밖이다(isAdminAreaPath) — 그 화면은 제 표식(data-admin-sign-in)으로 따로 걷는다.
import { ADMIN_ROUTE_PREFIXES } from "@/lib/auth/constants";
import { ROUTES } from "@/lib/routes";

export const ADMIN_AREA_ATTR = "data-admin-area";

/** 그리기 전에 도는 한 줄. isAdminAreaPath 와 같은 판정을 문자열로 옮긴다(이 스크립트는 번들을 기다리지 않는다) */
export const ADMIN_AREA_INIT_SCRIPT = `try{var p=location.pathname,s=${JSON.stringify(ROUTES.adminSignIn)},a=${JSON.stringify(ADMIN_ROUTE_PREFIXES)};if(!(p===s||p.indexOf(s+"/")===0)&&a.some(function(x){return p===x||p.indexOf(x+"/")===0}))document.documentElement.setAttribute(${JSON.stringify(ADMIN_AREA_ATTR)},"1")}catch(e){}`;
