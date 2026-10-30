"use client";
// 텔레그램 미리 보기(2026-10-30) — 알림템플릿관리와 알림발송관리가 같이 쓴다. 보낼 글을 대화 말풍선 모양으로 그린다.
// 글은 renderNotice(lib/notify/template)를 지난 HTML 이라 허용 태그(b, i, u, s, code, pre, blockquote, http 링크)만 남아 있다 —
// 그래서 innerHTML 로 그린다. 텔레그램처럼 줄바꿈 글자를 그대로 줄로 본다(pre-wrap).
import { cn } from "@/lib/cn";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";

export function TelegramPreview({ html, className }: { html: string; className?: string }) {
  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <figcaption className="px-1 text-[11.5px] font-semibold text-dim">{M.previewHint}</figcaption>
      <div className="rounded-xl bg-surface-2 p-3">
        <div
          className={cn(
            "max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-[13.5px] leading-[1.6] text-ink shadow-hair",
            "[&_a]:text-acc [&_a]:underline [&_blockquote]:my-1 [&_blockquote]:border-l-[3px] [&_blockquote]:border-acc [&_blockquote]:pl-2 [&_blockquote]:text-mut",
            "[&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:text-[12.5px] [&_pre]:rounded-lg [&_pre]:bg-surface-2 [&_pre]:p-2 [&_pre]:text-[12.5px]",
          )}
          // 허용 태그만 남긴 글이다(머리 주석)
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </figure>
  );
}
