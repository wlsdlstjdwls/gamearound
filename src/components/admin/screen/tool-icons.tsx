// 화면 머리 툴바 그림(조회, 입력, 삭제, 저장, 엑셀). screen/head 가 300줄을 넘어 뗐다(2026-10-30).
// 공용 ui/icons 에 두지 않는 이유: 툴바 단추 모양에 맞춘 원 안 기호라 다른 자리에서 쓸 일이 없다.
export type IconProps = { size?: number };
const svg = (size = 16) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });
export function RefreshIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
    </svg>
  );
}
export function PlusCircleIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
export function MinusCircleIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}
export function SaveIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}
export function DownloadIcon({ size }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
    </svg>
  );
}
