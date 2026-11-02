"use client";
// 알림 미리 보기(2026-10-30) — 알림템플릿관리와 알림발송관리가 같이 쓴다. 텔레그램은 대화 말풍선, 이메일(2026-11-02)은 메일 한 통 모양이다.
// 글은 renderNotice(lib/notify/template)를 지난 HTML 이라 허용 태그(b, i, u, s, code, pre, blockquote, http 링크)만 남아 있다 —
// 그래서 innerHTML 로 그린다. 텔레그램처럼 줄바꿈 글자를 그대로 줄로 본다(pre-wrap).
// 이메일은 보낼 때와 같은 감싸기(wrapEmailHtml)로 그린다 — 인라인 스타일 그대로라 받은편지함에서 볼 모양과 같다.
import { cn } from "@/lib/cn";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { wrapEmailHtml } from "@/lib/notify/email";
import { splitNotice } from "@/lib/notify/media";
import { BellIcon } from "@/components/ui/icons";
import { SITE } from "@/lib/site";
import type { NotifyMedium } from "@/server/db/schema";

/** 텔레그램은 이미지, 영상 자리에서 메시지가 나뉜다(lib/notify/media splitNotice) — 보낼 때와 같은 함수로 나눠 말풍선을 따로 그린다 */
export function TelegramPreview({ html, className }: { html: string; className?: string }) {
  const parts = splitNotice(html);
  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <figcaption className="px-1 text-[11.5px] font-semibold text-dim">
        {M.previewHint}
        {parts.length > 1 && <span className="font-normal"> | {M.telegramSplitNote}</span>}
      </figcaption>
      <div className="flex flex-col items-start gap-1.5 rounded-xl bg-surface-2 p-3">
        {parts.map((p, i) =>
          p.kind === "text" ? (
            <div
              key={i}
              className={cn(
                "max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-[13.5px] leading-[1.6] text-ink shadow-hair",
                "[&_a]:text-acc [&_a]:underline [&_blockquote]:my-1 [&_blockquote]:border-l-[3px] [&_blockquote]:border-acc [&_blockquote]:pl-2 [&_blockquote]:text-mut",
                "[&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:text-[12.5px] [&_pre]:rounded-lg [&_pre]:bg-surface-2 [&_pre]:p-2 [&_pre]:text-[12.5px]",
              )}
              // 허용 태그만 남긴 글이다(머리 주석)
              dangerouslySetInnerHTML={{ __html: p.html }}
            />
          ) : p.kind === "image" ? (
            // 우리 Blob 주소만 남는다(lib/notify/template). next/image 를 쓰지 않는 이유: 운영자가 막 올린 원본 그대로를 보여야 보낼 모양이다
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p.src} alt="" className="max-h-64 max-w-full rounded-2xl rounded-tl-md shadow-hair" />
          ) : (
            <video key={i} src={p.src} poster={p.poster ?? undefined} controls preload="metadata" className="max-h-64 max-w-full rounded-2xl rounded-tl-md bg-ink shadow-hair" />
          ),
        )}
      </div>
    </figure>
  );
}

/** 메일 미리 보기. 메일 본문은 흰 종이 위에 그려지므로 어두운 테마에서도 흰 바탕을 둔다(보낸 메일의 모양) */
export function EmailPreview({ subject, html, className }: { subject: string; html: string; className?: string }) {
  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <figcaption className="px-1 text-[11.5px] font-semibold text-dim">{M.emailPreviewHint}</figcaption>
      <div className="overflow-hidden rounded-xl shadow-hair">
        <p className="break-words border-b border-line-soft bg-surface px-3.5 py-2.5 text-[13.5px] font-semibold text-ink">{subject.trim() || M.emailNoSubject}</p>
        {/* 허용 태그만 남긴 글을 보낼 때와 같은 틀로 감쌌다(머리 주석) */}
        <div className="break-words bg-white [&>div]:!p-4" dangerouslySetInnerHTML={{ __html: wrapEmailHtml(html) }} />
      </div>
    </figure>
  );
}

/** 웹 알림 미리 보기 — 알림함 한 줄 모양. 글은 renderWebNotice 결과(태그 없는 글)라 글자로 그린다 */
export function WebPreview({ text, className }: { text: string; className?: string }) {
  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <figcaption className="px-1 text-[11.5px] font-semibold text-dim">{M.webPreviewHint}</figcaption>
      <div className="flex items-start gap-2.5 rounded-xl bg-surface px-3.5 py-3 shadow-hair">
        <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-acc" />
        <p className="min-w-0 break-words text-[13.5px] leading-[1.55] text-ink">{text}</p>
      </div>
    </figure>
  );
}

/** 웹푸시 미리 보기 — 기기 알림 한 장 모양(제목 굵게, 본문 한 줄). 글은 renderWebNotice 결과 */
export function PushPreview({ title, text, className }: { title: string; text: string; className?: string }) {
  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <figcaption className="px-1 text-[11.5px] font-semibold text-dim">{M.pushPreviewHint}</figcaption>
      <div className="flex items-start gap-3 rounded-xl bg-surface px-3.5 py-3 shadow-hair">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-acc-soft text-acc">
          <BellIcon size={18} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[11.5px] text-dim">{SITE.name}</span>
          <b className="break-words text-[13.5px] font-bold text-ink">{title.trim() || M.emailNoSubject}</b>
          <span className="break-words text-[13px] text-mut">{text}</span>
        </div>
      </div>
    </figure>
  );
}

/** 수단에 맞는 미리 보기 하나. html 은 텔레그램, 이메일이면 renderNotice 결과, 웹 알림이면 renderWebNotice 결과(글) */
export function NoticePreview({ medium, subject, html }: { medium: NotifyMedium; subject: string | null; html: string }) {
  if (medium === "web") return <WebPreview text={html} />;
  if (medium === "push") return <PushPreview title={subject ?? ""} text={html} />;
  return medium === "email" ? <EmailPreview subject={subject ?? ""} html={html} /> : <TelegramPreview html={html} />;
}
