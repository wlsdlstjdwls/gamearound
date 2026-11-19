// 예약 특전 화면 문구 단일 원천(규약 §2). 관리자 화면 문구는 lib/admin/messages/preorder.ts 에 둔다.
import { PREORDER_SOURCE, type PreorderSource } from "./sources";

type SourceCopy = {
  /** 마디 아래 출처 줄 */
  source: string;
  /** 마디 머리 설명. 출처가 섞이면 기본(lead)을 쓴다 */
  lead: string;
  /** 원문 링크 이름 */
  sourceLink: string;
  /** 출처 이름(관리자 화면 칸) */
  name: string;
  /**
   * 마감일이 없는 특전의 기한 문구. null 이면 기한 줄을 안 그린다 — 스토어 디지털 특전은 "재고" 가 없고,
   * 마감일을 안 적은 특전은 출시로 끝난다(수집이 출시 뒤 그 줄을 지운다, sync/store-preorder).
   */
  noDeadline: string | null;
};

/** 스토어 상품 소개에서 읽은 특전(Xbox, PlayStation)의 마디 머리 설명 */
const STORE_LEAD = "예약하거나 일찍 사면 받는 디지털 특전이에요";

const SOURCES: Record<PreorderSource, SourceCopy> = {
  [PREORDER_SOURCE.nintendoKr]: { source: "출처: 한국닌텐도", lead: "판매처마다 주는 특전이 달라요", sourceLink: "원문 보기", name: "한국닌텐도 뉴스", noDeadline: "재고 소진 시까지" },
  [PREORDER_SOURCE.xboxKr]: { source: "Xbox 스토어 기준", lead: STORE_LEAD, sourceLink: "스토어에서 보기", name: "Xbox 스토어", noDeadline: null },
  [PREORDER_SOURCE.psstoreKr]: { source: "PlayStation 스토어 기준", lead: STORE_LEAD, sourceLink: "스토어에서 보기", name: "PlayStation 스토어", noDeadline: null },
};

export const PREORDER_MESSAGES = {
  title: "예약 특전",
  lead: SOURCES[PREORDER_SOURCE.nintendoKr].lead,
  edition: { package: "패키지", download: "다운로드" },
  retailers: "받는 곳",
  endsOn: (date: string) => `${date}까지`,
  newTab: "(새 창에서 열림)",
  imageAlt: (name: string) => `${name} 특전 이미지`,
  /** 출처별 문구. 모르는 출처는 한국닌텐도 문구로 물러선다 — 출처가 늘 때 여기에 한 줄 더한다 */
  sourceCopy: (source: string): SourceCopy => SOURCES[source as PreorderSource] ?? SOURCES[PREORDER_SOURCE.nintendoKr],
} as const;
