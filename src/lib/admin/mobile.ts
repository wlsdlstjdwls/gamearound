// 관리자 화면 휴대폰 허용 표(2026-10-30, 사용자 "일부 프로그램 + 기능 제한해서 제공"). 메뉴, 화면 진입, 단추가 전부 이 표 하나를 읽는다.
//
// 2026-11-02 사용자 "모바일 대응 다 해볼까" 로 메뉴 화면을 전부 연다(full). 처음(10-30)에는 승인, 판정만 열고
// 숫자 화면은 보기만(view), 입력이 많은 화면은 닫았다(off) — 휴대폰 꼴(카드, 바닥 시트, 바닥 툴바)을 공통 부품이 그리게 된 뒤라
// 닫아 둘 이유가 줄었다. 다시 좁힐 때는 이 표의 칸만 바꾸면 메뉴, 진입, 단추가 따라온다(view/off, allow/deny 는 그래서 남긴다).
// 엑셀만 어디서나 막는다(DENY_EVERYWHERE). 게임 고치기도 같은 날 연다. 표에 없는 새 주소는 여전히 닫힌다(UNLISTED).
// fitin-bo 는 메뉴마다 기능 표를 따로 두다가 표가 화면과 어긋났다 — 그래서 화면 열쇠는 메뉴 주소(ROUTES) 하나만 쓴다.
//
// **이 표는 권한이 아니다.** 기기는 UA 로 가르고 UA 는 바꿀 수 있다. 서버 액션은 지금처럼 역할(admin)만 검사한다 —
// 여기는 "휴대폰에서 굳이 보여 주지 않는다" 는 화면 정책이다.
import { ROUTES } from "@/lib/routes";

export type MobileAccess = "full" | "view" | "off";

/**
 * 화면 안에서 따로 막거나 여는 기능.
 * edit: 머리 툴바 입력, 삭제, 저장 | approval: 승인 화면의 처리 띠(screen/approval) | refund: 결제 환불 단추
 * excel: 툴바 엑셀 | taskDelete, taskArchive: 업무요청의 카드 삭제, 완료 일괄 보관
 */
export type MobileFeature = "edit" | "approval" | "refund" | "excel" | "taskDelete" | "taskArchive";

export type MobilePolicy = {
  access: MobileAccess;
  /** 보기만(view) 화면에서 예외로 여는 기능 */
  allow?: readonly MobileFeature[];
  /** 연(full) 화면에서 예외로 막는 기능 */
  deny?: readonly MobileFeature[];
};

/** 휴대폰에서는 어느 화면이든 막는 기능. 엑셀 파일은 휴대폰에서 열어 볼 일이 없고 내려받은 파일이 기기에 남는다 */
const DENY_EVERYWHERE: readonly MobileFeature[] = ["excel"];

/** 표에 없는 주소의 몫. 새 화면은 휴대폰 꼴을 확인하고 표에 올려야 휴대폰에 열린다 */
const UNLISTED: MobilePolicy = { access: "off" };

export const ADMIN_MOBILE: Readonly<Record<string, MobilePolicy>> = {
  [ROUTES.admin]: { access: "full" },
  [ROUTES.adminPricing]: { access: "full" },
  [ROUTES.adminDiscounts]: { access: "full" },
  [ROUTES.adminPromotions]: { access: "full" },
  [ROUTES.adminPayments]: { access: "full" },
  [ROUTES.adminMemberships]: { access: "full" },
  [ROUTES.adminTasks]: { access: "full" },
  [ROUTES.adminEffects]: { access: "full" },
  [ROUTES.adminSync]: { access: "full" },
  [ROUTES.adminSyncLogs]: { access: "full" },
  [ROUTES.adminMatches]: { access: "full" },
  [ROUTES.adminDataIssues]: { access: "full" },
  [ROUTES.adminCompanies]: { access: "full" },
  [ROUTES.adminPreorder]: { access: "full" },
  [ROUTES.adminIndie]: { access: "full" },
  [ROUTES.adminPosts]: { access: "full" },
  [ROUTES.shopsAdmin]: { access: "full" },
  [ROUTES.adminProducts]: { access: "full" },
  [ROUTES.adminStatsSales]: { access: "full" },
  [ROUTES.adminStatsUsage]: { access: "full" },
  [ROUTES.adminCodes]: { access: "full" },
  [ROUTES.adminNotifyTemplates]: { access: "full" },
  [ROUTES.adminNotifySends]: { access: "full" },
  [ROUTES.adminGuide]: { access: "full" },
  // 게임 고치기(메뉴 밖, 승인 화면의 "게임정보수정" 이 여는 곳). 11-02 오후 사용자 "남은것도 하자" 로 연다
  [ROUTES.adminGames]: { access: "full" },
};

/** 주소가 이 메뉴 화면(또는 그 아래)인가. 대시보드(/admin)만 정확히 일치로 본다 — 접두사로 보면 모든 화면이 대시보드가 된다 */
function under(pathname: string, href: string): boolean {
  return href === ROUTES.admin ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** 주소에 걸리는 정책. 가장 긴 메뉴 주소가 이긴다(/admin/tasks/archive 는 업무요청관리 몫) */
export function mobilePolicyOf(pathname: string): MobilePolicy {
  let best: string | null = null;
  for (const href of Object.keys(ADMIN_MOBILE)) {
    if (under(pathname, href) && (best === null || href.length > best.length)) best = href;
  }
  return best === null ? UNLISTED : ADMIN_MOBILE[best];
}

/** 휴대폰에서 이 기능을 쓸 수 있나. 넓은 기기(mobile=false)는 늘 된다 */
export function mobileCan(mobile: boolean, policy: MobilePolicy, feature: MobileFeature): boolean {
  if (!mobile) return true;
  if (DENY_EVERYWHERE.includes(feature)) return false;
  if (policy.access === "off") return false;
  if (policy.access === "view") return policy.allow?.includes(feature) ?? false;
  return !(policy.deny?.includes(feature) ?? false);
}
