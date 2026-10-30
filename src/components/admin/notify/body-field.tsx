"use client";
// 알림 본문 칸(2026-10-30) — 템플릿 화면과 직접 발송 화면이 같이 쓴다. 여러 줄 입력, 글자 수, 쓸 수 있는 변수와 꾸밈 안내.
// 글자 수는 변수를 채운 뒤 길이(텔레그램 상한은 보낸 글 기준)를 센다 — 템플릿 글자만 세면 긴 제목이 들어가 넘친다.
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { TEXTAREA_CLASS } from "@/components/ui/text-field";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { fieldErrors, VALIDATION_MESSAGES, type FieldErrors } from "@/lib/admin/validation";
import { TELEGRAM_TEXT_MAX } from "@/lib/notify/schemas";
import type { z } from "zod";

/** 본문 칸이 받는 줄 수. 시스템 템플릿이 열 줄 남짓이라 그만큼은 굴리지 않고 보인다 */
const BODY_ROWS = 10;

/** 스키마 오류를 칸 문구로. 태그 짝 오류는 스키마가 "tags:종류:태그" 로 넘긴다(lib/notify/schemas) */
export function notifyErrors(result: { success: true } | { success: false; error: z.ZodError }): FieldErrors {
  const errs = fieldErrors(result);
  for (const [path, msg] of Object.entries(errs)) {
    const tag = /^tags:(unclosed|unexpected):(\w+)$/.exec(msg);
    if (tag) errs[path] = tag[1] === "unclosed" ? M.tagUnclosed(tag[2]) : M.tagUnexpected(tag[2]);
    else if (msg === VALIDATION_MESSAGES.format && path === "code") errs[path] = M.codePattern;
  }
  return errs;
}

/** 꾸밈 단추. 고른 글을 태그로 감싼다(고른 글이 없으면 빈 태그를 넣고 커서를 가운데에). 태그 글자를 외우지 않게 — 앞에는 안내 줄에 태그를 글자로 늘어놓았다 */
const FORMATS = [
  { key: "bold", open: "<b>", close: "</b>" },
  { key: "italic", open: "<i>", close: "</i>" },
  { key: "underline", open: "<u>", close: "</u>" },
  { key: "strike", open: "<s>", close: "</s>" },
  { key: "quote", open: "<blockquote>", close: "</blockquote>" },
  { key: "link", open: '<a href="https://">', close: "</a>" },
] as const;

const CHIP = "press rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold";

/** vars: 누르면 커서 자리에 {이름} 을 넣는 변수 칩. null 이면 자유 변수 안내만 */
export function BodyField({ id, value, onChange, renderedLength, error, vars }: { id: string; value: string; onChange: (v: string) => void; renderedLength: number; error?: string; vars: Array<{ name: string; hint?: string }> | null }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const over = renderedLength > TELEGRAM_TEXT_MAX;
  /** 고른 자리를 before + 고른 글 + after 로 바꾸고, 커서를 고른 글 끝(없으면 before 뒤)에 둔다 */
  const wrap = (before: string, after: string) => {
    const el = ref.current;
    const at = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? at;
    const picked = value.slice(at, end);
    onChange(value.slice(0, at) + before + picked + after + value.slice(end));
    const caret = at + before.length + picked.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div role="toolbar" aria-label={M.tags} aria-controls={id} className="flex flex-wrap items-center gap-1">
        {FORMATS.map((f) => (
          <button key={f.key} type="button" onClick={() => wrap(f.open, f.close)} className={cn(CHIP, "bg-surface-2 text-ink-2 hover:bg-line-soft")}>
            {M.formatLabels[f.key]}
          </button>
        ))}
      </div>
      <textarea ref={ref} id={id} rows={BODY_ROWS} className={cn(TEXTAREA_CLASS, "text-[14px] leading-[1.65]")} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error) || over} aria-describedby={`${id}-help`} />
      <div id={`${id}-help`} className="flex flex-col gap-1 text-[11.5px] text-dim">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-1">
            <span className="font-semibold text-mut">{M.vars}</span>
            {vars === null
              ? M.varsFree
              : vars.map((v) => (
                  <button key={v.name} type="button" onClick={() => wrap(`{${v.name}}`, "")} className={cn(CHIP, "bg-acc-soft text-acc")} aria-label={v.hint ? `{${v.name}} ${v.hint}` : `{${v.name}}`}>
                    {`{${v.name}}`}
                  </button>
                ))}
          </span>
          <span className={cn("shrink-0 tabular-nums", over && "font-semibold text-danger")}>{over ? M.tooLong(renderedLength, TELEGRAM_TEXT_MAX) : M.length(renderedLength, TELEGRAM_TEXT_MAX)}</span>
        </div>
        {error && (
          <p role="alert" className="text-[12px] font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
