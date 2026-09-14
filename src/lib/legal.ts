// 약관, 개인정보처리방침 문서의 단일 원천.
// 본문은 **운영자가 채워야 하는 법적 문서**라 여기 임의로 쓰지 않는다 —
// 지어낸 약관을 띄우면 사용자에게 거짓 고지를 하는 셈이다.
// 문단 배열이 비어 있으면 화면이 "준비 중"으로 떨어진다(components/../legal-document).
import { SITE } from "@/lib/site";

export interface LegalDocument {
  title: string;
  /** 마지막 개정일(YYYY-MM-DD). 본문이 비어 있으면 표시하지 않는다 */
  updatedAt: string | null;
  /** 문단 목록. 채우는 순간 화면에 그대로 나간다 */
  sections: Array<{ heading: string; body: string }>;
}

export const TERMS: LegalDocument = {
  title: "이용약관",
  updatedAt: null,
  sections: [],
};

export const PRIVACY: LegalDocument = {
  title: "개인정보처리방침",
  updatedAt: null,
  sections: [],
};

/** 본문이 아직 없을 때 보여줄 안내. 문서마다 같은 문구를 쓴다 */
export const LEGAL_MESSAGES = {
  empty: "아직 준비 중이에요. 내용이 확정되면 이 자리에 올려요.",
  contact: `문의는 ${SITE.contactEmail} 로 보내주세요.`,
  disclaimer: SITE.dataDisclaimer,
} as const;
