// /games 목록 필터 — 상태는 전부 쿼리스트링에 있고, 고르는 것은 곧 그 주소로 가는 일이다.
// 이 파일 자체는 서버 컴포넌트다. 펼치는 목록을 우리 토큰으로 그려야 하는 드롭다운(ui/select)만 클라이언트다.
//
// 넓은 화면에서는 목록 왼쪽 기둥에 세로로 선다(games/page.tsx 가 자리를 잡는다).
// 가로로 눕혀 두면 플랫폼, 장르 칩이 줄바꿈하며 화면 위쪽을 몇 줄씩 먹어 정작 게임이 밀린다.
// 좁은 화면에서는 접어 둔다 — details 라 JS 없이 열고 닫힌다.
import { PLATFORM_LABEL } from "@/lib/format";
import {
  familyOf,
  isPlatformFamily,
  PLATFORM_FAMILIES,
  PLATFORM_FAMILY_CHILD_LABEL,
  PLATFORM_FAMILY_LABEL,
  PLATFORM_ORDER,
  type PlatformFamily,
} from "@/lib/platform";
import { ChipLink } from "@/components/ui/chip";
import { Select, type SelectOption } from "@/components/ui/select";
import { GAME_SORTS, DEFAULT_GAME_SORT, SORT_LABEL, gamesHref, type GamesQuery } from "@/lib/games-query";
import type { GameFacets } from "@/server/services/games";
import { cardClass } from "@/components/ui/page";

/** "고르지 않음" 을 나타내는 값. 빈 문자열을 쓰면 현재 값 비교가 undefined 와 헷갈린다 */
const ALL = "__all__";

/** 갈래에 속한 플랫폼을 화면 순서대로. FAMILY_PLATFORMS 를 직접 쓰지 않는 이유는 순서 원천을 하나로 두기 위해서다 */
const byFamily = (f: PlatformFamily) => PLATFORM_ORDER.filter((p) => familyOf(p) === f);

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11.5px] text-dim">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * 칩에 건수를 붙이지 않는다. 필터를 고르는 자리에서 알고 싶은 것은 "무엇이 있는가" 이지
 * "몇 개인가" 가 아니고, 숫자가 붙으면 칩이 두 배로 길어져 기둥 폭을 넘는다.
 * 고른 뒤의 건수는 목록 머리글이 이미 말해 준다.
 *
 * 칩과 드롭다운을 가르는 기준은 개수다. 서넛이면 칩이 빠르고(한 번에 다 보이고 한 번에 눌린다),
 * 열 개를 넘으면 드롭다운이 낫다(안 고른 값이 자리를 차지하지 않는다).
 */
function Groups({ facets, filter }: { facets: GameFacets; filter: GamesQuery }) {
  const href = (patch: Partial<GamesQuery>) => gamesHref(filter, { ...patch, page: 1 });

  // 실제로 게임이 붙어 있는 플랫폼만 고를 수 있다(facets). 스토어 하나를 고른 상태에서도
  // 그 스토어가 속한 갈래를 펴 둬야 옆 스토어로 한 번에 옮겨 갈 수 있다.
  const available = new Set(facets.platforms.map((p) => p.platform));
  const families = PLATFORM_FAMILIES.filter((f) => byFamily(f).some((p) => available.has(p)));
  const family: PlatformFamily | undefined = isPlatformFamily(filter.platform)
    ? filter.platform
    : familyOf(filter.platform);
  const children = family ? byFamily(family).filter((p) => available.has(p)) : [];

  // 장르는 스무 개가 넘어 칩으로 늘어놓으면 기둥을 세로로 다 먹는다 — 드롭다운으로 접는다
  const genreOptions: SelectOption[] = [
    { value: ALL, label: "전체 장르", href: href({ genre: undefined }) },
    ...facets.genres.map((g) => ({ value: g.name, label: g.name, href: href({ genre: g.name }) })),
  ];
  const sortOptions: SelectOption[] = GAME_SORTS.map((s) => ({ value: s, label: SORT_LABEL[s], href: href({ sort: s }) }));

  return (
    <>
      <Group label="플랫폼">
        <ChipLink href={href({ platform: undefined })} active={!filter.platform}>전체</ChipLink>
        {families.map((f) => (
          <ChipLink key={f} href={href({ platform: f })} active={family === f}>
            {PLATFORM_FAMILY_LABEL[f]}
          </ChipLink>
        ))}
      </Group>

      {/* 갈래를 고른 뒤에만 안쪽을 편다 — 여덟 개를 늘 펴 두면 기둥이 플랫폼만으로 다 찬다 */}
      {family && children.length > 0 && (
        <Group label={PLATFORM_FAMILY_CHILD_LABEL[family]}>
          <ChipLink href={href({ platform: family })} active={filter.platform === family}>
            {PLATFORM_FAMILY_LABEL[family]} 전체
          </ChipLink>
          {children.map((p) => (
            <ChipLink key={p} href={href({ platform: p })} active={filter.platform === p}>
              {PLATFORM_LABEL[p] ?? p}
            </ChipLink>
          ))}
        </Group>
      )}

      {facets.genres.length > 0 && <Select label="장르" value={filter.genre ?? ALL} options={genreOptions} />}

      <Select label="정렬" value={filter.sort ?? DEFAULT_GAME_SORT} options={sortOptions} />

      <Group label="조건">
        <ChipLink href={href({ onSale: !filter.onSale })} active={Boolean(filter.onSale)}>할인 중만</ChipLink>
        {/* 구독 포함 여부는 Game Pass 하나로 시작하지만 조건은 "어떤 구독이든"이라 PS Plus 를 붙여도 문구가 그대로다 */}
        <ChipLink href={href({ subscription: !filter.subscription })} active={Boolean(filter.subscription)}>
          구독으로 즐길 수 있어요
        </ChipLink>
      </Group>
    </>
  );
}

export function GameFilters({ facets, filter }: { facets: GameFacets; filter: GamesQuery }) {
  return (
    <>
      {/* 좁은 화면: 접어 둔 서랍. 열어 둔 채로 두면 목록이 한 화면 아래로 밀린다 */}
      <details className={cardClass("p-0 lg:hidden")}>
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-ink">
          필터와 정렬
        </summary>
        <div className="flex flex-col gap-3.5 border-t border-line px-4 py-3">
          <Groups facets={facets} filter={filter} />
        </div>
      </details>

      {/* 넓은 화면: 왼쪽 기둥. 스크롤해도 따라오도록 붙여 둔다(헤더 높이만큼 띄운다) */}
      <aside aria-label="목록 필터" className={cardClass("hidden flex-col gap-4 p-4 lg:sticky lg:top-[86px] lg:flex")}>
        <Groups facets={facets} filter={filter} />
      </aside>
    </>
  );
}
