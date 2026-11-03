// 메뉴 검색 별칭(lib/admin/menu-search). 화면 이름에 없는 말로도 그 화면을 찾게 한다.
// 넣는 기준: 관리자가 그 화면을 떠올릴 때 실제로 쓰는 말(옛 메뉴 이름, 하는 일, 다루는 대상).
// 옛 이름을 남기는 까닭 — 메뉴 이름이 세 번 바뀌었다(admin-screen-naming). 손에 익은 말로 쳐도 나와야 한다.
import { ROUTES } from "@/lib/routes";

export const ADMIN_MENU_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  [ROUTES.admin]: ["홈", "업무 현황", "남은 일"],
  [ROUTES.adminPricing]: ["구독상품", "요금", "멤버십 상품", "가격"],
  [ROUTES.adminDiscounts]: ["할인", "할인 행사", "첫 달", "쿠폰"],
  [ROUTES.adminPromotions]: ["광고", "홍보 고정", "노출"],
  [ROUTES.adminPayments]: ["결제", "환불", "주문", "결제 관리"],
  [ROUTES.adminMemberships]: ["구독", "구독자", "회원", "멤버십"],
  [ROUTES.adminTasks]: ["할 일", "칸반", "업무"],
  [ROUTES.adminEffects]: ["화면 연출", "인트로", "명예의 전당"],
  [ROUTES.adminSync]: ["수집 현황", "크롤", "크론"],
  [ROUTES.adminSyncLogs]: ["실행 로그", "수집 로그", "에러"],
  [ROUTES.adminMatches]: ["매칭 대기", "스토어 연결", "매칭"],
  [ROUTES.adminDataIssues]: ["데이터 점검", "오류", "품질"],
  [ROUTES.adminCompanies]: ["회사 이름", "개발사", "배급사"],
  [ROUTES.adminCompanyClaims]: ["회사 신청", "회사 관리", "관계자"],
  [ROUTES.adminPreorder]: ["특전", "예약", "닌텐도"],
  [ROUTES.adminIndie]: ["인디 홍보", "인디", "신고"],
  [ROUTES.adminPosts]: ["게시판", "댓글", "라운지", "숨김"],
  [ROUTES.shopsAdmin]: ["입점 신청", "매장 신청"],
  [ROUTES.adminProducts]: ["상품 매핑", "매장 상품", "바코드"],
  [ROUTES.adminStatsSales]: ["매출", "순매출", "결제 통계"],
  [ROUTES.adminStatsUsage]: ["방문", "유입", "가입", "이용 통계"],
  [ROUTES.adminCodes]: ["공통코드", "코드북", "코드"],
  [ROUTES.adminNotifyTemplates]: ["텔레그램", "알림 문구", "템플릿"],
  [ROUTES.adminNotifySends]: ["알림 발송", "직접 보내기", "발송 이력"],
  [ROUTES.adminGuide]: ["안내서", "매뉴얼", "변경 안내"],
};
