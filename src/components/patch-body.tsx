"use client";
// 패치 노트 한 건의 본문 — 한글 전문을 먼저, "원본 보기" 로 영어 원문을, 길면 "더 보기" 로 편다(2026-11-18 사용자 결정).
//
// 둘 다 이 칸만 아는 상태라 주소에 싣지 않고 서버도 부르지 않는다 — 본문 두 벌이 이미 내려와 있어 누른 순간 바뀐다(AGENTS 6장).
// 글은 lib/patch/body-blocks 가 덩어리로 가른 것을 React 글자로 그린다. 스토어 HTML 을 꽂지 않는다(dangerouslySetInnerHTML 없음).
// 스토어가 처음부터 한국어로 준 공지는 원문과 번역이 같아 바꾸기 단추를 세우지 않는다.
import { useMemo, useState } from "react";
import { parsePatchBody, previewBlocks, type PatchBlock } from "@/lib/patch/body-blocks";
import { PATCH_BODY_MESSAGES as M } from "@/lib/patch/messages";

/** 접힌 채 보일 글자 수. 패치 노트 첫 단락과 목록 몇 줄이 드는 크기다 — 목록이 다섯 건씩 서는 탭이라 길게 펴 두지 않는다 */
const PREVIEW_CHARS = 280;

const ACTION = "press tap text-[12.5px] font-semibold text-mut transition-colors duration-base hover:text-acc";

function Blocks({ blocks }: { blocks: PatchBlock[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === "heading" ? (
          <p key={i} className="mt-2 text-[13px] font-bold text-ink first:mt-0">
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

export function PatchBody({ bodyKo, bodyEn, summaryKo, url }: { bodyKo: string | null; bodyEn: string | null; summaryKo: string | null; url: string | null }) {
  const [original, setOriginal] = useState(false);
  const [open, setOpen] = useState(false);
  const canSwitch = bodyKo !== null && bodyEn !== null && bodyKo !== bodyEn;
  const showingOriginal = bodyKo === null || (original && canSwitch);
  const text = showingOriginal ? bodyEn : bodyKo;
  const blocks = useMemo(() => (text ? parsePatchBody(text) : []), [text]);
  const { shown, truncated } = useMemo(() => previewBlocks(blocks, PREVIEW_CHARS), [blocks]);

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {blocks.length > 0 ? (
        <div lang={showingOriginal ? "en" : "ko"} className="flex flex-col gap-1.5 text-[12.5px] leading-[1.6] break-words text-ink-2">
          <Blocks blocks={open ? blocks : shown} />
        </div>
      ) : (
        summaryKo && <p className="text-[12.5px] leading-[1.55] text-mut">{summaryKo}</p>
      )}
      {bodyKo === null && <p className="text-[11.5px] text-dim">{bodyEn ? M.pendingWithOriginal : M.pending}</p>}
      <div className="flex flex-wrap items-center gap-x-3">
        {truncated && (
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={ACTION}>
            {open ? M.less : M.more}
          </button>
        )}
        {canSwitch && (
          <button type="button" aria-pressed={original} onClick={() => setOriginal((v) => !v)} className={ACTION}>
            {original ? M.showKorean : M.showOriginal}
          </button>
        )}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className={ACTION}>
            {M.openStore}
            <span className="sr-only"> (새 창에서 열림)</span>
          </a>
        )}
      </div>
    </div>
  );
}
