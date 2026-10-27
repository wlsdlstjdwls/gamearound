// 약관 문서 화면 — /terms 와 /privacy 가 같은 모양을 쓴다(§3: 같은 것이 2곳이면 추출).
//
// 2026-10-27(사용자: "이용약관, 개인정보처리방침 쪽 내용도 개선"): 회색 판 하나에 13px 글이 이어져 어디가 무슨 조항인지 찾기 어려웠다.
// 맨 위 "한눈에 보기" 상자, 조항 목차(누르면 그 조항으로), 흰 판 위 큰 글씨, "- " 줄은 점 목록으로 그린다.
import { Page, PageHead } from "@/components/ui/page";
import { EmptyState } from "@/components/empty-state";
import { CheckIcon } from "@/components/ui/icons";
import { LEGAL_MESSAGES, type LegalDocument } from "@/lib/legal";

/** 본문을 문단과 점 목록으로 나눈다. "- " 로 시작하는 줄이 이어지면 한 목록이다 */
function Body({ text }: { text: string }) {
  const blocks: Array<{ kind: "p"; text: string } | { kind: "ul"; items: string[] }> = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ul") last.items.push(line.slice(2));
      else blocks.push({ kind: "ul", items: [line.slice(2)] });
    } else if (line.trim()) blocks.push({ kind: "p", text: line });
  }
  return (
    <div className="flex flex-col gap-2 text-[14.5px] leading-[1.8] text-ink-2">
      {blocks.map((b, i) =>
        b.kind === "p" ? (
          <p key={i}>{b.text}</p>
        ) : (
          <ul key={i} className="flex flex-col gap-1 pl-1">
            {b.items.map((it) => (
              <li key={it} className="flex gap-2.5">
                <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-acc" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <Page width="tight" gap={20}>
      <PageHead title={doc.title} note={doc.updatedAt ? `${doc.updatedAt} 개정` : undefined} />

      {doc.sections.length === 0 ? (
        <EmptyState title={LEGAL_MESSAGES.empty} description={LEGAL_MESSAGES.contact} />
      ) : (
        <>
          {doc.summary && doc.summary.length > 0 && (
            <section aria-labelledby="legal-summary" className="enter-item flex flex-col gap-3 rounded-[var(--radius-panel)] bg-acc-soft p-5 sm:p-6">
              <h2 id="legal-summary" className="text-[15px] font-extrabold text-acc">
                {LEGAL_MESSAGES.summaryTitle}
              </h2>
              <ul className="flex flex-col gap-2">
                {doc.summary.map((line) => (
                  <li key={line} className="flex gap-2.5 text-[14px] leading-[1.7] text-ink">
                    <CheckIcon size={16} className="mt-[0.3em] shrink-0 text-acc" />
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 목차 — 조항으로 바로 간다 */}
          <nav aria-label={LEGAL_MESSAGES.tocLabel} className="flex flex-wrap gap-1.5">
            {doc.sections.map((s, i) => (
              <a key={s.heading} href={`#legal-${i}`} className="press rounded-full bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 shadow-hair transition-colors hover:text-acc">
                {s.heading}
              </a>
            ))}
          </nav>

          <div className="flex flex-col divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface px-5 shadow-[var(--elev-card)] sm:px-7">
            {doc.sections.map((s, i) => (
              <section key={s.heading} id={`legal-${i}`} className="flex scroll-mt-[calc(var(--header-h)+16px)] flex-col gap-2.5 py-6">
                <h2 className="text-[16.5px] font-extrabold tracking-[-0.02em] text-ink">{s.heading}</h2>
                <Body text={s.body} />
              </section>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
