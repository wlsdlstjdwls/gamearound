// 게임 상세의 개발사, 배급사 표시.
// 회사 엔티티로 승격된 것은 회사 화면으로 가는 링크가 되고, 아직 승격되지 않은 것은
// games.developer / publisher 문자열 그대로 링크 없이 보여준다(폴백).
// 폴백을 "정보 없음"으로 처리하지 않는 이유: 이름은 아는데 회사 페이지만 없는 상태라 사용자에게는 정보가 맞다.
import Link from "next/link";
import { companyPath } from "@/lib/routes";
import { COMPANY_ROLE_LABEL, GAME_MESSAGES } from "@/lib/games/messages";
import type { GameCompanyDto } from "@/server/services/games";

const BASE = "inline-flex items-center gap-1 rounded-full px-[11px] py-1 text-[12px]";

export function CompanyChips({
  companies,
  developer,
  publisher,
}: {
  companies: GameCompanyDto[];
  developer: string | null;
  publisher: string | null;
}) {
  if (companies.length > 0) {
    return (
      <ul className="flex flex-wrap gap-1.5" aria-label="제작사">
        {companies.map((c) => (
          <li key={`${c.slug}:${c.role}`}>
            <Link
              href={companyPath(c.slug)}
              className={`${BASE} press border border-line-strong text-ink-2 transition-colors hover:border-ink hover:text-ink`}
            >
              <span className="text-dim">{COMPANY_ROLE_LABEL[c.role]}</span>
              {c.name}
              {c.countryNameKo && <span className="text-dim">({c.countryNameKo})</span>}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  // 폴백 — 회사 매칭 전. 문자열을 그대로, 링크 없이
  const fallback = [developer, publisher].filter(Boolean).join(" | ");
  return <p className="text-[13px] text-dim">{fallback || GAME_MESSAGES.companyUnknown}</p>;
}
