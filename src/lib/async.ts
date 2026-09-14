/** 비동기 공통 유틸 — 크롤 요청 간격, 재시도 백오프에서 쓴다 */

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
