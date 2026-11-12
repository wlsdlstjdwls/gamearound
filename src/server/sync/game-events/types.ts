// 이벤트 카드 수집 한 회차의 집계. 출처마다 따로 세어 크론 응답에 그대로 낸다
import { errorMessage } from "@/lib/errors";
import { ERROR_SAMPLE_MAX } from "@/server/sync/constants";

export type EventRunPart = {
  /** 카드 후보(닌텐도: 제목 규칙에 걸린 글, 스팀: 물어본 게임) */
  candidates: number;
  /** 넣거나 값이 바뀐 줄 */
  written: number;
  /** 게임을 못 이었거나 묶음 글이라 건너뛴 수 */
  skipped: number;
  failed: number;
  errors: string[];
  fail(label: string, e: unknown): void;
};

export function newPart(): EventRunPart {
  const part: EventRunPart = {
    candidates: 0,
    written: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    fail(label, e) {
      part.failed++;
      if (part.errors.length < ERROR_SAMPLE_MAX) part.errors.push(`[${label}] ${errorMessage(e)}`);
    },
  };
  return part;
}
