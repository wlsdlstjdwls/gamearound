// 멀티플레이 칩 — 기획서 3-6: 솔로/협동/PvP, 로컬/온라인 최대 인원.
//
// 지원하는 것만 그린다(2026-09-15). 이전에는 미지원 항목을 취소선으로 남겼는데, 그 표시가
// 거짓을 자신 있게 말하고 있었다 — 값의 출처가 스토어 카테고리 하나뿐이라 `false` 가
// "지원 안 함" 과 "스토어가 안 알려 줌" 을 겸한다. 실측(2026-09-15): 팰월드의 Steam 카테고리에는
// PvP 항목이 아예 없어(싱글, 멀티, 협동, 온라인 협동까지만) 화면이 "PvP 안 됨" 으로 그었다.
// 모르는 것을 그리지 않으면 이 거짓말이 사라진다. 아는 것만 말한다.
type Props = {
  localMaxPlayers: number | null;
  onlineMaxPlayers: number | null;
  supportsSolo: boolean;
  supportsCoop: boolean;
  supportsPvp: boolean;
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line-strong px-[11px] py-1 text-[12px] text-ink-2">
      {children}
    </span>
  );
}

export function MultiplayerBadges(p: Props) {
  const items = [
    p.supportsSolo ? "솔로" : null,
    p.supportsCoop ? "협동" : null,
    p.supportsPvp ? "PvP" : null,
    p.localMaxPlayers && p.localMaxPlayers > 0 ? `로컬 최대 ${p.localMaxPlayers}인` : null,
    p.onlineMaxPlayers && p.onlineMaxPlayers > 0 ? `온라인 최대 ${p.onlineMaxPlayers}인` : null,
  ].filter((v): v is string => v !== null);

  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="플레이 방식">
      {items.map((label) => (
        <li key={label}>
          <Chip>{label}</Chip>
        </li>
      ))}
    </ul>
  );
}
