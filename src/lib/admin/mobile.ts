// 관리자 화면 휴대폰 허용 표(2026-10-30, 사용자 "일부 프로그램 + 기능 제한해서 제공"). 메뉴, 화면 진입, 단추가 전부 이 표 하나를 읽는다.
//
// 기준은 "휴대폰에서 하는 일" 이다. 알림을 받고 바로 끝낼 수 있는 승인, 숨김, 판정은 연다(full).
// 숫자와 상태만 보면 되는 자리는 보기만 연다(view, 툴바 입력/삭제/저장과 처리 띠를 숨긴다).
// 입력 칸이 많거나 되돌리기 어려운 자리(상품, 프로모션, 공통코드, 알림 템플릿, 직접 발송)는 닫고 PC 안내를 띄운다(off).
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

/** 표에 없는 주소(게임 고치기 등)의 몫. 칸이 많은 편집 화면이라 닫는다 — 새 화면은 표에 올려야 휴대폰에 열린다 */
const UNLISTED: MobilePolicy = { access: "off" };

export const ADMIN_MOBILE: Readonly<Record<string, MobilePolicy>> = {
  [ROUTES.admin]: { access: "full" },
  // 상품관리: 요금 카드 문구와 기간, 금액을 맞추는 자리라 PC 에서만
  [ROUTES.adminPricing]: { access: "off" },
  [ROUTES.adminDiscounts]: { access: "off" },
  // 문제 광고를 바로 내리는 회수 띠만 연다. 직접 걸기(툴바 입력, 저장)는 PC 에서
  [ROUTES.adminPromotions]: { access: "view", allow: ["approval"] },
  // 주문관리: 환불은 돈이 나가고 되돌릴 수 없어 보기만(2026-10-30 초안 그대로)
  [ROUTES.adminPayments]: { access: "view" },
  [ROUTES.adminMemberships]: { access: "view" },
  // 카드 이동, 메모, 사진 첨부는 휴대폰이 오히려 편하다. 지우기와 일괄 보관만 PC 에서
  [ROUTES.adminTasks]: { access: "full", deny: ["taskDelete", "taskArchive"] },
  [ROUTES.adminEffects]: { access: "off" },
  [ROUTES.adminSync]: { access: "view" },
  [ROUTES.adminSyncLogs]: { access: "view" },
  [ROUTES.adminMatches]: { access: "full" },
  [ROUTES.adminDataIssues]: { access: "full" },
  // 정식명을 찾아 적는 자리라 입력이 많다
  [ROUTES.adminCompanies]: { access: "off" },
  [ROUTES.adminPreorder]: { access: "full" },
  [ROUTES.adminIndie]: { access: "full" },
  [ROUTES.adminPosts]: { access: "full" },
  // 서류를 보고 판단하는 승인이라 보기만(2026-10-30 초안 그대로)
  [ROUTES.shopsAdmin]: { access: "view" },
  [ROUTES.adminProducts]: { access: "full" },
  [ROUTES.adminStatsSales]: { access: "view" },
  [ROUTES.adminStatsUsage]: { access: "view" },
  [ROUTES.adminCodes]: { access: "off" },
  [ROUTES.adminNotifyTemplates]: { access: "off" },
  // 직접 발송은 받는 사람 전체에게 나가 되돌릴 수 없다(2026-10-30 초안 그대로)
  [ROUTES.adminNotifySends]: { access: "off" },
  // 2026-10-30 사용자 "서비스안내서조회도 보이게"
  [ROUTES.adminGuide]: { access: "view" },
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
