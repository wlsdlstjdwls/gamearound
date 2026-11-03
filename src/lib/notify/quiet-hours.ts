// 회원에게 닿는 발송(웹푸시, 메일)을 해도 되는 한국 시각(2026-11-03). 밤에는 휴대폰을 울리지 않는다.
//
// 사용자 지적 둘에서 나왔다: 주간 맞춤 소식이 한국 03시 크론에 얹혀 새벽 3시에 메일이 갈 뻔했고("새벽 3시에 알림이랑 메일이 가?"),
// 가격 회차가 한국 02, 03시에도 돌아 가격 알림, 찜 할인 알림이 그 자리에서 푸시, 메일을 보내고 있었다.
// 밤에 생긴 알림은 버리지 않는다 — 알림함에는 그 자리에서 적고, 푸시와 메일은 아침 8시에 한 통으로 모아 보낸다(sync/morning-alerts).
//
// 알림함(사이트 안 종 아이콘)은 막지 않는다. 기기를 울리지 않고, 아침에 열었을 때 밤사이 일이 순서대로 남아 있어야 한다.
// 회원이 누른 순간 가는 것(비밀번호 재설정 메일)과 관리자가 직접 보내는 것(알림발송관리)은 여기를 거치지 않는다 — 사람이 시각을 고른 발송이다.

/**
 * 보내도 되는 시각(시작 시 이상, 끝 시 미만, 한국 시각). 끝을 22시로 둔 이유: 가격 회차가 한국 21시(UTC 12시)에도 돈다 —
 * 21시에 내려간 할인을 이튿날 아침까지 미루면 저녁 세일을 놓친다. 아침 8시는 아침 모아 보내기 크론(vercel.json "0 23 * * *")과 같다.
 */
export const MEMBER_SEND_HOURS_KST = { from: 8, to: 22 } as const;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 지금 회원에게 푸시, 메일을 보내도 되는가 */
export function isMemberSendHour(now: Date): boolean {
  const hour = new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
  return hour >= MEMBER_SEND_HOURS_KST.from && hour < MEMBER_SEND_HOURS_KST.to;
}
