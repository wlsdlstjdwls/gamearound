// 코드가 아는 공통코드 그룹(2026-10-30, 사용자 "코드성 데이터는 다 공통코드로"). 그룹마다 기본 이름표가 여기 있고,
// 공통코드관리에서 고친 값(이름, 정렬순서, 사용여부)만 DB(common_codes)에 남아 이 기본값을 덮는다(lib/codes/book).
//
// 왜 기본값을 코드에 두나: 이 값들은 DB enum(결제 상태, 업무 상태 등)이라 코드가 그 값에 따라 동작이 갈린다.
// 공통코드에서 새 코드를 더해도 enum 이 받지 못하므로 코드값은 잠근다(locked). 화면에서 바꾸는 것은 이름, 정렬, 사용여부다.
// DB 가 비거나 읽지 못해도 화면은 이 기본값으로 선다 — 공통코드 표 때문에 화면이 깨지면 안 된다.
// 사용여부 미사용: 고르기 칸(조회조건, 입력 폼)에서만 뺀다. 이미 그 값을 가진 줄은 이름표를 그대로 보인다.
//
// 그룹을 더할 때: 여기 한 줄 + 그 이름표를 쓰는 자리를 useCodes()(클라이언트) 또는 getCodeBook()(서버)로 바꾼다.
// 기본 이름표 객체(TASK_STATUS_LABEL 등)는 지우지 않는다 — 기본값과 타입이 그것을 읽는다.
import { MATCHED_BY_LABEL, QUALITY_RULE_LABEL, SYNC_STATUS_LABEL, TASK_CATEGORY_LABEL, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL, UPGRADE_KIND_LABEL } from "@/lib/admin/messages";
import { MEMBERSHIP_STATUS_LABEL } from "@/lib/membership/messages";
import { PAYMENT_STATUS_LABEL } from "@/lib/payments/messages";
import { BOOST_STATE_LABEL, PROMO_SLOT_LABEL, PROMO_SOURCE_LABEL } from "@/lib/promo/messages";

export type CodeGroupDef = { name: string; description: string; defaults: Readonly<Record<string, string>> };

/** 그룹코드 → 정의. 기본값 객체의 키 순서가 기본 정렬순서다 */
export const CODE_REGISTRY = {
  TASK_STATUS: { name: "업무 상태", description: "업무요청관리 칸반의 칸", defaults: TASK_STATUS_LABEL },
  TASK_CATEGORY: { name: "업무 분류", description: "업무요청 카드의 갈래", defaults: TASK_CATEGORY_LABEL },
  TASK_PRIORITY: { name: "업무 우선순위", description: "업무요청 카드의 우선순위", defaults: TASK_PRIORITY_LABEL },
  PAYMENT_STATUS: { name: "결제 상태", description: "결제/환불관리, 내 결제 내역", defaults: PAYMENT_STATUS_LABEL },
  MEMBERSHIP_STATUS: { name: "구독 상태", description: "멤버십회원관리, 내 멤버십", defaults: MEMBERSHIP_STATUS_LABEL },
  PROMO_SLOT: { name: "광고 자리", description: "광고노출관리, 내 광고 성과", defaults: PROMO_SLOT_LABEL },
  PROMO_SOURCE: { name: "광고 출처", description: "광고가 걸린 길(결제, 멤버십, 직접 걸기)", defaults: PROMO_SOURCE_LABEL },
  BOOST_STATE: { name: "광고 노출 상태", description: "광고노출관리의 진행 상태", defaults: BOOST_STATE_LABEL },
  QUALITY_RULE: { name: "데이터 점검 규칙", description: "데이터오류관리의 구분", defaults: QUALITY_RULE_LABEL },
  UPGRADE_KIND: { name: "업그레이드 종류", description: "게임 고치기의 업그레이드 탭", defaults: UPGRADE_KIND_LABEL },
  MATCHED_BY: { name: "스토어 연결 방식", description: "게임 고치기의 스토어 연결 탭", defaults: MATCHED_BY_LABEL },
  SYNC_STATUS: { name: "수집 결과", description: "수집현황, 수집이력조회, 게임 고치기", defaults: SYNC_STATUS_LABEL },
} as const satisfies Record<string, CodeGroupDef>;

export type RegistryGroup = keyof typeof CODE_REGISTRY;

export function isRegistryGroup(g: string): g is RegistryGroup {
  return g in CODE_REGISTRY;
}
