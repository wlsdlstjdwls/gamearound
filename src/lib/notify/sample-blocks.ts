// 알림템플릿관리 미리 보기에 쓰는 덩어리 예시(2026-11-04). 코드가 그리는 자리(lib/notify/email 의 EmailBlock)는 글자 예시로는 모양을 못 본다 —
// 보낼 때와 같은 함수로 예시 기사를 그려, 운영자가 둘레 문구를 고치며 실제 메일 모양을 본다.
// system-templates 에 두지 않은 이유: 그 파일은 수집 실행(tsx)도 읽는 변수 계약표다. 카드 그리기까지 끌고 가지 않는다.
import type { EmailBlocks } from "@/lib/notify/email";
import { digestMailBlock, type DigestMailItem } from "@/lib/news/digest-mail";
import { SYSTEM_TEMPLATES } from "@/lib/notify/system-templates";

const SAMPLE_AT = new Date("2026-11-03T09:00:00+09:00");
const item = (title: string, sourceName: string, gameTitle: string, summary: string): DigestMailItem => ({
  title,
  url: "https://gamearound.kr/news",
  sourceName,
  thumbnailUrl: null,
  summary,
  gameTitle,
  gameUrl: "https://gamearound.kr/games/sample",
  publishedAt: SAMPLE_AT,
});

/** 템플릿 코드 → 그 템플릿의 덩어리 자리 예시. 여기 있는 이름은 미리 보기 변수(글자 예시)에서 빠진다 */
export const SAMPLE_EMAIL_BLOCKS: Readonly<Record<string, EmailBlocks>> = {
  [SYSTEM_TEMPLATES.mailNewsDigest]: {
    목록: digestMailBlock(
      [item("하데스 II 새 무기 공개", "IGN", "하데스 II", "슈퍼자이언트가 다음 업데이트에 들어갈 새 무기와 보스를 미리 공개했어요.")],
      [item("붉은사막 출시일 확정", "게임메카", "붉은사막", "펄어비스가 출시일과 사전 구매 일정을 발표했어요.")],
    ),
  },
};
