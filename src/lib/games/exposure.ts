// 진열 줄 문턱(services/games/exposure 의 isKnownGame). 값을 고친 근거는 그 파일 머리 표에 있다.

/**
 * 평가 수 문턱. 2026-10-02 실측: 최근 30일 출시 1,639건 중 10건 이상이 479, 50건 이상이 315.
 * 홈 최근 출시는 24칸이라 10이면 넉넉하고, 50으로 올리면 콘솔 신작(평가가 늦게 쌓인다)이 먼저 빠진다
 */
export const SHOWCASE_MIN_REVIEWS = 10;

/** HLTB 기록 인원 문턱. 한 사람이라도 끝까지 해 본 기록이 있으면 아는 사람이 있는 게임이다 */
export const SHOWCASE_MIN_HLTB_LOGGED = 1;
