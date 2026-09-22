// 사양 한 줄 요약 — 마디 제목 옆에 세울 글자(2026-09-22, 사용자 지정).
//
// 왜 필요한가: "내 PC 로 돌아갈까요" 마디는 접혀 있다. 접힌 채로는 제목뿐이라 안에 무엇이 있는지,
// 이 게임이 무엇을 요구하는지가 보이지 않았다. 제목 옆 한 줄이 그 답을 대신한다 —
// 열지 않고도 "GTX 960 급이 필요하구나" 가 읽히면 대부분의 사람은 거기서 판단이 끝난다.
//
// **후보가 여럿인 문구는 첫 번째만 쓴다.** 스토어는 "NVIDIA GeForce GTX 960 2GB / AMD Radeon R7 370 2GB"
// 처럼 대안을 나열하는데, 한 줄 요약에 둘을 다 실으면 제목 줄이 통째로 접힌다. 첫 후보는 대개 엔비디아이고
// (실측), 자세한 것은 마디를 열면 표가 다 말한다.
import { formatSizeMb } from "@/lib/format";

/** 이 요약이 읽는 값. 사양 DTO 의 부분집합이라 서비스 타입을 그대로 들이지 않는다(lib 는 서버를 모른다) */
export type RequirementSummaryInput = {
  osFamily: string;
  minimum: { cpuText: string | null; gpuText: string | null; ramMb: number | null } | null;
  recommended: { cpuText: string | null; gpuText: string | null; ramMb: number | null } | null;
};

/** 대안 나열에서 첫 후보만. 구분자는 슬래시와 "or" 둘이다(실측 문구의 거의 전부) */
function firstCandidate(text: string | null): string | null {
  if (!text) return null;
  const head = text.split(/\s*(?:\/|,| or )\s*/i)[0]?.trim();
  return head && head.length > 0 ? head : null;
}

/**
 * 윈도우 사양을 먼저 본다 — PC 게임의 기본값이고, 이 요약이 서는 자리(판정 마디)가 답하는 질문도
 * "내 PC 로 돌아가나" 다. 윈도우 사양이 없으면 있는 것 중 첫 번째를 쓴다(맥 전용 게임).
 */
function pickGroup(groups: RequirementSummaryInput[]): RequirementSummaryInput | null {
  return groups.find((g) => g.osFamily === "windows") ?? groups[0] ?? null;
}

/**
 * 최소 사양 한 줄. 최소가 없으면 권장으로 대신한다(스토어가 하나만 적는 게임이 있다) —
 * 그때는 "권장" 이라고 말해야 한다. 아는 것이 하나도 없으면 null 이고 제목 옆은 비운다.
 */
export function requirementSummary(groups: RequirementSummaryInput[]): string | null {
  const group = pickGroup(groups);
  if (!group) return null;
  const spec = group.minimum ?? group.recommended;
  if (!spec) return null;
  const tier = group.minimum ? "최소" : "권장";
  const parts = [firstCandidate(spec.cpuText), firstCandidate(spec.gpuText), spec.ramMb ? formatSizeMb(spec.ramMb) : null].filter(
    (v): v is string => Boolean(v),
  );
  return parts.length > 0 ? `${tier} ${parts.join(" | ")}` : null;
}
