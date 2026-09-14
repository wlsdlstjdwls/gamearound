// 개인정보처리방침 — 본문은 lib/legal.ts 의 PRIVACY 가 유일한 원천이다.
import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal-document";
import { PRIVACY } from "@/lib/legal";

export const metadata: Metadata = { title: PRIVACY.title };

export default function PrivacyPage() {
  return <LegalDocumentView doc={PRIVACY} />;
}
