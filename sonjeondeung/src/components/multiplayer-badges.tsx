// 멀티플레이 배지 — 기획서 3-6: 솔로/협동/PvP, 로컬/온라인 최대 인원

type Props = {
  localMaxPlayers: number | null;
  onlineMaxPlayers: number | null;
  supportsSolo: boolean;
  supportsCoop: boolean;
  supportsPvp: boolean;
};

function Badge({ children, on }: { children: React.ReactNode; on: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
        on ? "border-slate-600 bg-slate-800 text-slate-100" : "border-slate-800 text-slate-600 line-through"
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
      <li>
        <Badge on={p.supportsSolo}>솔로</Badge>
      </li>
      <li>
        <Badge on={p.supportsCoop}>협동</Badge>
      </li>
      <li>
        <Badge on={p.supportsPvp}>PvP</Badge>
      </li>
      {p.localMaxPlayers !== null && p.localMaxPlayers > 0 && (
        <li>
          <Badge on>로컬 최대 {p.localMaxPlayers}인</Badge>
        </li>
      )}
      {p.onlineMaxPlayers !== null && p.onlineMaxPlayers > 0 && (
        <li>
          <Badge on>온라인 최대 {p.onlineMaxPlayers}인</Badge>
        </li>
      )}
    </ul>
  );
}
