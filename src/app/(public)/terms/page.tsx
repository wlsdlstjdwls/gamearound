// 이용약관 — 본문은 lib/legal.ts 의 TERMS 가 유일한 원천이다.
import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal-document";
import { TERMS } from "@/lib/legal";

export const metadata: Metadata = { title: TERMS.title };

export default function TermsPage() {
  return <LegalDocumentView doc={TERMS} />;
}
