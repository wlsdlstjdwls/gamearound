// 약관 문서 화면 — /terms 와 /privacy 가 같은 모양을 쓴다(§3: 같은 것이 2곳이면 추출).
import { Card, Page, SectionHead } from "@/components/ui/page";
import { EmptyState } from "@/components/empty-state";
import { LEGAL_MESSAGES, type LegalDocument } from "@/lib/legal";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <Page width="tight" gap={20}>
      <SectionHead title={doc.title} note={doc.updatedAt ? `${doc.updatedAt} 개정` : undefined} />

      {doc.sections.length === 0 ? (
        <EmptyState title={LEGAL_MESSAGES.empty} description={LEGAL_MESSAGES.contact} />
      ) : (
        <Card className="flex flex-col gap-6 px-5 py-5">
          {doc.sections.map((s) => (
            <section key={s.heading} className="flex flex-col gap-2">
              <h3 className="text-[14px] font-semibold text-ink">{s.heading}</h3>
              <p className="whitespace-pre-wrap text-[13px] leading-[1.75] text-mut">{s.body}</p>
            </section>
          ))}
        </Card>
      )}
    </Page>
  );
}
