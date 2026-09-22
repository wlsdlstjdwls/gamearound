// 게임 상세의 개발사, 배급사 표시.
// **나라는 여기서 적지 않는다**(2026-09-22, 사용자 지정). 회사마다 "(대한민국)" 을 괄호로 달면
// 칩 셋이 서는 줄에 같은 나라가 세 번 적히고, 그 괄호가 회사 이름보다 자리를 더 먹었다.
// 나라는 게임의 성질이지 칩마다의 성질이 아니라서 위 출시일 줄이 국기 한 장으로 한 번만 말한다.
// 회사 엔티티로 승격된 것은 회사 화면으로 가는 링크가 되고, 아직 승격되지 않은 것은
// games.developer / publisher 문자열 그대로 링크 없이 보여준다(폴백).
// 폴백을 "정보 없음"으로 처리하지 않는 이유: 이름은 아는데 회사 페이지만 없는 상태라 사용자에게는 정보가 맞다.
import Link from "next/link";
import { companyPath } from "@/lib/routes";
import { COMPANY_ROLE_LABEL } from "@/lib/games/messages";
import type { GameCompanyDto } from "@/server/services/games";

// 알약은 선이 아니라 면으로 선다(2026-09-21 리디자인). 한 화면에 이런 알약이 열 개 넘게 서는데
// 테두리를 쓰면 그 선들이 본문보다 먼저 읽힌다
const BASE = "inline-flex items-center gap-1 rounded-full bg-surface-2 px-[11px] py-[5px] text-[12.5px]";

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
              className={`${BASE} press text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink`}
            >
              <span className="text-dim">{COMPANY_ROLE_LABEL[c.role]}</span>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  // 폴백 — 회사 매칭 전. 문자열을 그대로, 링크 없이.
  // 이름조차 없으면 아무것도 그리지 않는다 — "정보 없어요" 는 빈칸을 읽을거리로 위장할 뿐,
  // 보는 사람이 할 수 있는 일이 없다(2026-09-17).
  const fallback = [developer, publisher].filter(Boolean).join(" | ");
  if (!fallback) return null;
  return <p className="text-[13px] text-dim">{fallback}</p>;
}
