// 업무관리 판 번호 — 누가 판(칸반, 일정)을 고칠 때마다 1씩 올린다. 열린 화면은 이 번호만 짧게 물어보고, 바뀌었을 때만 판을 다시 읽는다(2026-11-04,
// 사용자 "업무관리 화면에서 실시간 데이터 반영이 안 된다" — 다른 사람이 옮기거나 적은 카드는 새로 고치기 전까지 안 보였다).
//
// 번호를 DB 가 아니라 Redis 에 두는 이유: 열린 탭마다 몇 초에 한 번 묻는다. Neon 에 물으면 그 탭이 열려 있는 내내 compute 가 잠들지 못한다
// (neon-compute-quota, 2026-10-13 한도 초과). Redis 는 요청 단위 과금이고 자는 compute 가 없다.
// 번호를 못 올려도 고친 일은 이미 저장됐다 — 다른 화면이 늦게 알 뿐이라 오류를 던지지 않는다.
import { getRedis } from "@/server/redis";
import { errorMessage } from "@/lib/errors";

/** 칸반과 일정이 한 번호를 나눈다 — 두 보기를 페이지가 한꺼번에 읽어 보낸다(admin/tasks/page) */
const WORK_VERSION_KEY = "admin:work-version";

export async function bumpWorkVersion(): Promise<void> {
  try {
    await getRedis().incr(WORK_VERSION_KEY);
  } catch (e) {
    console.warn(`[admin-tasks] 판 번호 올리기 실패: ${errorMessage(e)}`);
  }
}

/** 못 읽으면 null — 화면은 그 회차를 건너뛴다(없는 변화를 지어내 다시 읽지 않는다) */
export async function readWorkVersion(): Promise<number | null> {
  try {
    return Number((await getRedis().get<number | string>(WORK_VERSION_KEY)) ?? 0);
  } catch {
    return null;
  }
}
