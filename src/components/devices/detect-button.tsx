"use client";
// "브라우저에서 불러오기" 버튼 — 기기 폼 두 곳(계정, 비회원)이 같은 것을 쓴다.
//
// 버튼을 공용으로 뽑은 이유는 규약(AGENTS §3)보다 앞서는 사정이 있다: 감지가 채우는 칸이
// 무엇인지가 두 화면에서 달라지면 안 된다. 한쪽만 메모리를 채우게 되는 날 판정이 화면마다 달라진다.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { detectSpec } from "@/lib/hardware/detect";
import { DEVICE_MESSAGES as M } from "@/lib/games/messages";
import type { OsFamily } from "@/server/db/schema";

export function DetectButton({
  onDetected,
  size = "sm",
}: {
  onDetected: (spec: { gpuName: string | null; osFamily: OsFamily | null }) => void;
  size?: "sm" | "md";
}) {
  const [note, setNote] = useState<string | null>(null);

  function run() {
    const spec = detectSpec();
    onDetected(spec);
    if (spec.gpuName) setNote(M.detectDone);
    else if (spec.osFamily) setNote(M.detectOsOnly);
    else setNote(M.detectFailed);
  }

  return (
    <div className="flex flex-col gap-1">
      <div>
        <Button variant="secondary" size={size} onClick={run}>
          {M.detect}
        </Button>
      </div>
      {/* 결과를 읽어 주지 않으면 화면이 조용히 바뀐 것처럼 보인다 — 어느 칸이 찼는지 말해 준다 */}
      <p aria-live="polite" className="text-[11.5px] leading-[1.6] text-dim">
        {note ?? M.detectRamNote}
      </p>
    </div>
  );
}
