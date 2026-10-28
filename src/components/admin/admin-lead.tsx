// 관리자 화면 제목 밑 설명 한 줄.
//
// 2026-10-28 사용자: "관리자 화면이 투박하다, 컴팩트하게". 화면마다 13px 설명 문단이 두세 줄씩 서서 첫 화면의 위쪽 5분의 1을
// 먹었다. 그 문단은 처음 한 번 읽으면 끝나는 글이고, 이 화면은 운영자가 매일 여는 자리다 — 한 줄로 자르고 전문은 말풍선으로 본다.
import { Clamp } from "@/components/ui/tooltip";

export function AdminLead({ text, children }: { text?: string; children: React.ReactNode }) {
  return (
    <Clamp lines={1} text={text} className="mt-1 max-w-[760px] text-[12.5px] leading-[1.6] text-dim">
      {children}
    </Clamp>
  );
}
