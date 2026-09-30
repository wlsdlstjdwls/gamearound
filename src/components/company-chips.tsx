// 게임 상세의 개발사, 배급사 표시.
// **나라는 여기서 적지 않는다**(2026-09-22, 사용자 지정). 회사마다 "(대한민국)" 을 괄호로 달면
// 칩 셋이 서는 줄에 같은 나라가 세 번 적히고, 그 괄호가 회사 이름보다 자리를 더 먹었다.
// 나라는 게임의 성질이지 칩마다의 성질이 아니라서 위 출시일 줄이 국기 한 장으로 한 번만 말한다.
// 회사 엔티티로 승격된 것은 회사 화면으로 가는 링크가 되고, 아직 승격되지 않은 것은
// games.developer / publisher 문자열 그대로 링크 없이 보여준다(폴백).
// 폴백을 "정보 없음"으로 처리하지 않는 이유: 이름은 아는데 회사 페이지만 없는 상태라 사용자에게는 정보가 맞다.
//
// 장르도 이 줄 끝에 칩 **하나**로 선다(2026-09-30, 사용자: "장르 뱃지가 눈에 안 띄고 자리를 차지한다").
// 전에는 설명 아래에 장르마다 칩이 따로 서는 줄이 있었다 — 설명 뒤라 눈이 거기까지 안 내려갔고,
// 장르가 대여섯이면 칩이 두 줄로 접혀 자리를 먹었다. 제목 바로 아래 "개발 | 배급 | 장르" 가
// 같은 모양의 칩으로 이어지면 "누가 만든 어떤 게임인가" 가 한 줄에서 끝난다.
// 장르 칩은 누를 수 없다 — 장르 목록 화면이 아직 주소로만 살아 있다(목록 필터의 장르 축이 그 일을 한다).
import Link from "next/link";
import { companyPath } from "@/lib/routes";
import { COMPANY_ROLE_LABEL } from "@/lib/games/messages";
import type { GameCompanyDto } from "@/server/services/games";

/** 장르 칩의 이름표 — 회사 칩의 "개발", "배급" 과 같은 자리에 선다 */
const GENRE_LABEL = "장르";

// 알약은 선이 아니라 면으로 선다(2026-09-21 리디자인). 한 화면에 이런 알약이 열 개 넘게 서는데
// 테두리를 쓰면 그 선들이 본문보다 먼저 읽힌다.
// 면은 **흰 판**이다(2026-09-30). 이 줄은 회청 바탕 위에 바로 서는데, 칩 면(--surface-2)과 바탕의 차이가
// 1% 도 안 돼 알약이 바탕에 녹아 글자만 떠 있었다. 흰 면에 --line-strong 링을 둘러 바탕에서 갈리고,
// 값(회사, 장르)은 진한 굵은 글자, 이름표(개발, 배급, 장르)는 보통 굵기 회색이라 칩 안에서도 둘이 갈린다
// (사용자 지적: "배경이랑 뱃지 배경이 비슷해서 구분이 잘 안된다")
const BASE = "inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[13px] font-semibold ring-1 ring-line-strong ring-inset";

export function CompanyChips({
  companies,
  developer,
  publisher,
  genres = [],
}: {
  companies: GameCompanyDto[];
  developer: string | null;
  publisher: string | null;
  genres?: string[];
}) {
  const genreChip =
    genres.length > 0 ? (
      <li className={`${BASE} text-ink`}>
        <span className="font-normal text-dim">{GENRE_LABEL}</span>
        {genres.join(", ")}
      </li>
    ) : null;

  if (companies.length > 0) {
    return (
      <ul className="flex flex-wrap gap-1.5" aria-label="제작사와 장르">
        {companies.map((c) => (
          <li key={`${c.slug}:${c.role}`}>
            <Link
              href={companyPath(c.slug)}
              className={`${BASE} press text-ink transition-colors hover:bg-surface-2 hover:ring-dim-2`}
            >
              <span className="font-normal text-dim">{COMPANY_ROLE_LABEL[c.role]}</span>
              {c.name}
            </Link>
          </li>
        ))}
        {genreChip}
      </ul>
    );
  }

  // 폴백 — 회사 매칭 전. 문자열을 그대로, 링크 없이.
  // 이름조차 없으면 아무것도 그리지 않는다 — "정보 없어요" 는 빈칸을 읽을거리로 위장할 뿐,
  // 보는 사람이 할 수 있는 일이 없다(2026-09-17).
  const fallback = [developer, publisher].filter(Boolean).join(" | ");
  if (!fallback && !genreChip) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {fallback && <p className="text-[13px] text-dim">{fallback}</p>}
      {genreChip && (
        <ul className="flex flex-wrap gap-1.5" aria-label="장르">
          {genreChip}
        </ul>
      )}
    </div>
  );
}
