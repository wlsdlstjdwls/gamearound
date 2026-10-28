// 에디터 툴바 아이콘 — 이 툴바에서만 쓰여 ui/icons 에 올리지 않았다(한 곳이면 지역에 둔다, AGENTS §3).
// 글자 단추(B, I)를 글꼴로 쓰지 않고 그린다 — 글꼴마다 굵기, 기울기가 달라 단추 줄이 들쭉날쭉했다(ui/icons 머리 주석과 같은 이유).
export type ToolIconName = "h2" | "h3" | "bold" | "italic" | "strike" | "bullet" | "ordered" | "quote" | "code" | "link" | "image" | "file" | "undo" | "redo";

const PATHS: Record<ToolIconName, React.ReactNode> = {
  h2: (
    <>
      <path d="M4 6v12M12 6v12M4 12h8" />
      <path d="M16 10.5a2.2 2.2 0 0 1 4.2.9c0 1.6-4.2 3.3-4.2 6.6h4.4" />
    </>
  ),
  h3: (
    <>
      <path d="M4 6v12M12 6v12M4 12h8" />
      <path d="M16 9.5h4l-2.3 3a2.3 2.3 0 1 1-1.9 3.8" />
    </>
  ),
  bold: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />,
  italic: <path d="M10 5h8M6 19h8M14 5l-4 14" />,
  strike: <path d="M5 12h14M16 7.5A3.5 3 0 0 0 12.5 5h-1A3.5 3 0 0 0 8 8c0 1.4 1 2.3 2.4 2.8M8 16.5a3.5 3 0 0 0 3.5 2.5h1a3.5 3 0 0 0 3.4-3.6" />,
  bullet: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  ordered: <path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.2a1.4 1.4 0 0 1 2.6.6c0 1-2.6 2-2.6 3.2h2.8" />,
  quote: <path d="M5 5v14M10 8h9M10 12h9M10 16h6" />,
  code: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20.5 15.5l-5-5-9.5 9" />
    </>
  ),
  file: <path d="M20 11.5l-7.6 7.6a5 5 0 0 1-7.1-7.1l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />,
  undo: <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <path d="M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />,
};

export function ToolIcon({ name, size = 18 }: { name: ToolIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
