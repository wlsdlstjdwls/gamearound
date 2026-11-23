"use client";
// 패치 노트 한 건의 본문 — 업데이트 노트 팝업(patch-list) 안에서 한글 전문을 다 펴 보이고, "원본 보기" 로 영어 원문과 바꾼다.
//
// 2026-11-23 사용자: 목록에는 제목과 버전만, 줄을 누르면 팝업으로 번역본. 그래서 "더 보기" 접기와 줄마다 서던 "스토어에서 보기" 를 걷었다 —
// 팝업은 스크롤이 되니 접을 까닭이 없고, 원문 링크는 팝업 머리가 한 번 단다.
// 바꾸기는 이 칸만 아는 상태라 서버를 부르지 않는다 — 본문 두 벌이 이미 내려와 있어 누른 순간 바뀐다(AGENTS 6장).
// 글은 lib/patch/body-blocks 가 덩어리로 가른 것을 React 글자로 그린다. 스토어 HTML 을 꽂지 않는다(dangerouslySetInnerHTML 없음).
// 스토어가 처음부터 한국어로 준 공지는 원문과 번역이 같아 바꾸기 단추를 세우지 않는다.
import { useMemo, useState } from "react";
import { parsePatchBody, type PatchBlock } from "@/lib/patch/body-blocks";
import { PATCH_BODY_MESSAGES as M } from "@/lib/patch/messages";

const ACTION = "press tap text-[12.5px] font-semibold text-mut transition-colors duration-base hover:text-acc";

function Blocks({ blocks }: { blocks: PatchBlock[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === "heading" ? (
          <p key={i} className="mt-2 text-[14.5px] font-bold text-ink first:mt-0">
            {b.text}
          </p>
        ) : b.kind === "list" ? (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {b.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        ),
      )}
    </>
  );
}

export function PatchBody({ bodyKo, bodyEn }: { bodyKo: string; bodyEn: string | null }) {
  const [original, setOriginal] = useState(false);
  const canSwitch = bodyEn !== null && bodyKo !== bodyEn;
  const showingOriginal = original && canSwitch;
  const text = showingOriginal && bodyEn !== null ? bodyEn : bodyKo;
  const blocks = useMemo(() => parsePatchBody(text), [text]);

  return (
    <div className="flex flex-col gap-3">
      {canSwitch && (
        <div>
          <button type="button" aria-pressed={original} onClick={() => setOriginal((v) => !v)} className={ACTION}>
            {original ? M.showKorean : M.showOriginal}
          </button>
        </div>
      )}
      <div lang={showingOriginal ? "en" : "ko"} className="flex flex-col gap-2 text-[14px] leading-[1.7] break-words text-ink-2">
        <Blocks blocks={blocks} />
      </div>
    </div>
  );
}
