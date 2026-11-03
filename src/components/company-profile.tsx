// 회사 한눈에 보기 — 우리 카탈로그로 계산한 회사 정보 한 판(services/company-profile).
// 값이 없는 줄은 그리지 않는다. 다 비면 판 자체를 내지 않는다(게임 한두 개짜리 회사에 빈 표가 서지 않게).
import Link from "next/link";
import { sectionCardClass } from "@/components/ui/page";
import { PLATFORM_LABEL } from "@/lib/format";
import { companyPath } from "@/lib/routes";
import type { CompanyProfile } from "@/server/services/company-profile";

function activeYears(p: CompanyProfile): string | null {
  if (!p.firstYear) return null;
  return p.lastYear && p.lastYear !== p.firstYear ? `${p.firstYear} ~ ${p.lastYear}` : `${p.firstYear}`;
}

export function CompanyProfilePanel({ profile }: { profile: CompanyProfile }) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [];
  const years = activeYears(profile);
  if (years) rows.push({ label: "활동", value: years });
  if (profile.genres.length > 0) rows.push({ label: "주력 장르", value: profile.genres.join(", ") });
  if (profile.platforms.length > 0) {
    rows.push({ label: "플랫폼", value: profile.platforms.map((p) => PLATFORM_LABEL[p] ?? p).join(", ") });
  }
  if (profile.developedCount > 0 || profile.publishedCount > 0) {
    rows.push({ label: "개발작 | 배급작", value: `${profile.developedCount}개 | ${profile.publishedCount}개` });
  }
  if (profile.upcomingCount > 0) rows.push({ label: "출시 예정", value: `${profile.upcomingCount}개` });
  if (profile.partners.length > 0) {
    rows.push({
      label: "자주 함께한 회사",
      value: (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {profile.partners.map((c) => (
            <Link key={c.slug} href={companyPath(c.slug)} className="font-semibold text-acc underline-offset-2 hover:underline">
              {c.name}
              <span className="ml-1 font-normal text-dim">{c.count}개</span>
            </Link>
          ))}
        </span>
      ),
    });
  }
  if (rows.length === 0) return null;

  return (
    <section aria-label="회사 한눈에 보기" className={sectionCardClass()}>
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex min-w-0 gap-3 text-[13.5px]">
            <dt className="w-[96px] shrink-0 text-dim">{r.label}</dt>
            <dd className="min-w-0 text-ink-2">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
