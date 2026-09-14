// 멀티플레이 칩 — 기획서 3-6: 솔로/협동/PvP, 로컬/온라인 최대 인원.
// 미지원 항목은 지우지 않고 취소선으로 남긴다("없는 것"이 아니라 "지원 안 함"이 정보다).

type Props = {
  localMaxPlayers: number | null;
  onlineMaxPlayers: number | null;
  supportsSolo: boolean;
  supportsCoop: boolean;
  supportsPvp: boolean;
};

function Chip({ children, on }: { children: React.ReactNode; on: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-[11px] py-1 text-[12px] ${
        on ? "border border-line-strong text-ink-2" : "border border-line text-dim-2 line-through"
      }`}
      aria-label={on ? undefined : "미지원"}
    >
      {children}
    </span>
  );
}

export function MultiplayerBadges(p: Props) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="플레이 방식">
      <li><Chip on={p.supportsSolo}>솔로</Chip></li>
      <li><Chip on={p.supportsCoop}>협동</Chip></li>
      <li><Chip on={p.supportsPvp}>PvP</Chip></li>
      {p.localMaxPlayers !== null && p.localMaxPlayers > 0 && (
        <li><Chip on>로컬 최대 {p.localMaxPlayers}인</Chip></li>
      )}
      {p.onlineMaxPlayers !== null && p.onlineMaxPlayers > 0 && (
        <li><Chip on>온라인 최대 {p.onlineMaxPlayers}인</Chip></li>
      )}
    </ul>
  );
}
