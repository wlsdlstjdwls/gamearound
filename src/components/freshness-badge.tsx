// 신선도 표시 — 설계서 §4.6 + 리디자인 원칙 2.
// fresh는 아무것도 그리지 않는다. delayed/stale은 "2일 전 수집" 문장으로 말한다(빨간 배지 금지).
import { collectedAtText, type Freshness } from "@/lib/freshness";

type Props = {
  freshness: Freshness;
  lastSyncedAt?: Date | string | null;
  /** badge = 커버 위 흰 배지, inline = 본문 흐름 속 문구 */
  variant?: "badge" | "inline";
  className?: string;
};

export function FreshnessBadge({ freshness, lastSyncedAt, variant = "badge", className = "" }: Props) {
  if (freshness === "fresh") return null;
  const text = collectedAtText(lastSyncedAt);

  if (variant === "inline") {
    return (
      <span role="status" className={`text-[11.5px] text-warn ${className}`}>
        {text}
      </span>
    );
  }
  return (
    <span
      role="status"
      className={`inline-flex items-center rounded-[5px] border border-line-strong bg-surface px-2 py-[3px] text-[11px] font-semibold text-warn ${className}`}
    >
      {text}
    </span>
  );
}

/** 지연/만료 값 아래 한 줄 안내. 스토어 링크를 주 버튼으로 승격하는 자리와 함께 쓴다 */
export function StalenessNote({ freshness, lastSyncedAt }: { freshness: Freshness; lastSyncedAt?: Date | string | null }) {
  if (freshness === "fresh") return null;
  return (
    <p className="rounded-[7px] bg-surface-4 px-3 py-2 text-[12px] leading-[1.6] text-warn">
      {collectedAtText(lastSyncedAt)} | 표시된 가격이 바뀌었을 수 있습니다. 스토어에서 확인하세요.
    </p>
  );
}
