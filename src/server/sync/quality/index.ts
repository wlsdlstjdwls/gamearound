// 데이터 점검기(2026-10-28). 사람이 손으로 하던 카탈로그 손질을 규칙으로 옮긴 자리 — 머리 설명은 rules.ts.
// 바깥(크론, 관리자 서비스)은 이 파일만 import 한다.
export { runDataQuality, type QualityRunResult } from "./run";
export { applyQualityFix, StaleFixError } from "./apply";
export { findIssuesByIds, resolveIssue } from "./issues";
export type { QualityFix, QualityRule, Verdict } from "./rules";
