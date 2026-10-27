"use client";
// 기둥에서 고르는 자리 — 정렬, 플랫폼, 장르.
//
// 클라이언트 조각이다(2026-10-12): 누른 순간 칩과 드롭다운이 새 조건으로 바뀌어야 해서(./optimistic) 서버 값 대신
// useFilterQuery 가 주는 "먼저 그릴 조건" 으로 그린다. 공유 상수는 ./constants 에 있다(클라이언트 파일 상수 사고).
// 고르는 것은 곧 그 주소로 가는 일이다(상태는 전부 쿼리스트링에 있다).
//
// 정렬이 여기 있는 이유(2026-09-21): 목록 위 칩 줄에서 기둥으로 들여왔다. 칩 다섯이 제목 줄
// 오른쪽을 가로로 다 먹어 좁은 화면에서는 줄이 한 번 더 접혔다. 기둥에서는 드롭다운 한 칸이면
// 되고, 무엇으로 세우고 있는지는 닫힌 채로도 버튼에 적혀 있다.
// 거르는 일이 아니라 세우는 일이라 맨 위에 따로 선다 — 아래 무리와 사이를 띄워 층을 가른다.
//
// 왜 이 셋만인가(2026-09-21): 기둥에 있던 할인, 가격, 내 기기, 구독 조건을 걷었다.
// 할인과 가격은 정렬이 이미 답한다 — "할인율순", "가격 낮은순" 으로 세우면 맨 위가 그 답이고,
// 칩으로 얻는 것은 "그 아래를 안 보이게 하는 것" 뿐이었다. 내 기기는 값을 적어야 쓸 수 있는
// 유일한 필터라 기둥 한 칸을 늘 입력 폼으로 쓰고 있었다. 구독 조건은 쓸 사람이 구독자뿐이라
// 기둥 맨 아래 한 칸을 늘 비워 두는 쪽에 가까웠다.
// 거르는 규칙 자체(sale, max, rig, sub)는 살아 있다 — 주소로 들어오면 그대로 거르고, 푸는 길은
// 결과 위 "걸린 조건" 띠에 있다(./active). 고르는 자리만 걷어냈다.
//
// 플랫폼도 갈래(전체, PC, 콘솔) 셋으로 접었다. 낱개 스토어는 값으로는 계속 살아 있지만
// (주소, 회사, 상세 화면의 링크가 쓴다) 고르는 자리에서는 뺀다 — 스토어 아홉 칸이 기둥 위쪽을
// 두 줄씩 먹으면서 정작 "PC 냐 콘솔이냐" 라는 첫 물음을 가렸다.
import { PLATFORM_FAMILIES, PLATFORM_FAMILY_LABEL, FAMILY_PLATFORMS, familyOf, PLATFORM_ORDER, PLATFORM_VALUE_ORDER, type PlatformFamily } from "@/lib/platform";
import { ChipNavLink } from "@/components/ui/chip-nav";
import { Select, type SelectOption } from "@/components/ui/select";
import { defaultSortFor, GAME_SORTS, SORT_LABEL, gamesHref, joinPlatformValues, parsePlatformValues, type GamesQuery } from "@/lib/games-query";
import { GAMES_FILTER_MESSAGES } from "@/lib/games/messages";
import type { GameFacets } from "@/server/services/games";
import type { RunningSaleDto } from "@/server/services/sales";
import { RUNNING_SALE_MESSAGES } from "@/lib/sales/messages";
import { HideAfter } from "@/components/sales/hide-after";
import { PersonalToggle, type PersonalFilter } from "./personal-toggle";
import { FILTER_LABEL, KEEP_SCROLL } from "./constants";
import { useFilterClick, useFilterNavigate, useFilterQuery } from "./optimistic";

/** "고르지 않음" 을 나타내는 값. 빈 문자열을 쓰면 현재 값 비교가 undefined 와 헷갈린다 */
const ALL = "__all__";

/** 갈래에 속한 플랫폼. 갈래 칩을 세울지 정할 때만 쓴다(그 갈래에 게임이 하나라도 붙어 있는가) */
const byFamily = (f: PlatformFamily) => PLATFORM_ORDER.filter((p) => familyOf(p) === f);


/**
 * 어디에 선 무리인가. 기둥(column)은 232px 안의 조밀한 값이고, 시트(sheet)는 손가락으로 고르는 자리다.
 * 값 하나로 칩 크기, 이름표 크기, 사이 간격을 함께 정한다 — 세 가지를 따로 넘기면 부르는 자리마다
 * 조합이 달라져 같은 무리가 화면마다 다른 크기로 선다.
 */
export type GroupsVariant = "column" | "sheet";

/** 무리 하나. 이름표 모양(FILTER_LABEL)의 근거는 ./constants */
function Group({ label, sheet, children }: { label: string; sheet: boolean; children: React.ReactNode }) {
  return (
    <div className={sheet ? "flex flex-col gap-3" : "flex flex-col gap-2.5"}>
      <h2 className={FILTER_LABEL}>{label}</h2>
      <div className={sheet ? "flex flex-wrap gap-2" : "flex flex-wrap gap-1.5"}>{children}</div>
    </div>
  );
}

/**
 * 칩에 건수를 붙이지 않는다. 필터를 고르는 자리에서 알고 싶은 것은 "무엇이 있는가" 이지
 * "몇 개인가" 가 아니고, 숫자가 붙으면 칩이 두 배로 길어져 기둥 폭을 넘는다.
 *
 * 칩과 드롭다운을 가르는 기준은 개수다. 서넛이면 칩이 빠르고(한 번에 다 보이고 한 번에 눌린다),
 * 열 개를 넘으면 드롭다운이 낫다(안 고른 값이 자리를 차지하지 않는다).
 */
export function Groups({
  facets,
  filter: serverFilter,
  sale = null,
  personal = null,
  variant = "column",
}: {
  facets: GameFacets;
  filter: GamesQuery;
  /** 지금 데이터로 확인된 스팀 정기 세일(services/sales). 있을 때만 조건 칩이 하나 더 선다 */
  sale?: RunningSaleDto | null;
  /** 온보딩 취향이 있는 사람에게만 맨 위 "내 취향" 토글이 선다(./personal-toggle) */
  personal?: PersonalFilter | null;
  variant?: GroupsVariant;
}) {
  const filter = useFilterQuery(serverFilter);
  const click = useFilterClick();
  const go = useFilterNavigate();
  const sheet = variant === "sheet";
  /*
   * 시트 안의 칩은 크다(ui/chip 의 SIZE.lg 주석).
   *
   * 테두리는 이제 **기둥에서도** 두른다(2026-09-22, 사용자 지적: "필터 버튼들도 선택이 된건지
   * 안된건지"). 테두리를 걷었던 근거는 "기둥에 칩이 스무 개 서면 테두리 스무 겹이 먼저 읽힌다"
   * 였는데, 그 뒤 고르는 자리가 플랫폼 넷과 조건 하나로 줄어 전제가 사라졌다. 남은 건 반대
   * 문제다 — 면도 테두리도 없는 회색 글자는 "안 고른 단추" 가 아니라 그냥 적어 둔 말로 읽힌다.
   */
  const chip = sheet ? ({ size: "lg", outline: true } as const) : ({ outline: true } as const);
  const href = (patch: Partial<GamesQuery>) => gamesHref(filter, { ...patch, page: 1 });
  /** 칩 하나의 이동 — 주소, 먼저 그리기(onClick), 제자리 유지를 한 묶음으로 건넨다 */
  const nav = (h: string) => ({ ...KEEP_SCROLL, href: h, onClick: click(h) });

  // 실제로 게임이 붙어 있는 플랫폼만 고를 수 있다(facets)
  const available = new Set(facets.platforms.map((p) => p.platform));
  const picked = parsePlatformValues(filter.platform);
  const pickedSet = new Set(picked);
  const families = PLATFORM_FAMILIES.filter((f) => byFamily(f).some((p) => available.has(p)));

  /**
   * 갈래 하나를 켜고 끈 뒤의 주소. 갈래를 켜면 그 안의 낱개 값은 지운다 —
   * 주소로 들어온 `platform=steam` 위에 "PC" 를 얹으면 같은 말을 두 번 하는 주소가 된다.
   * 순서는 joinPlatformValues 가 세운다(같은 선택이 늘 같은 캐시 키여야 한다).
   */
  const familyHref = (f: PlatformFamily) => {
    const siblings: readonly string[] = FAMILY_PLATFORMS[f];
    const next = pickedSet.has(f) ? picked.filter((v) => v !== f) : [...picked.filter((v) => !siblings.includes(v)), f];
    return href({ platform: joinPlatformValues(next, PLATFORM_VALUE_ORDER) });
  };

  // 정렬을 바꾸면 1페이지로 돌아간다 — 3페이지에서 기준을 바꾸면 그 자리는 아무 뜻이 없다(href 가 page 를 1 로 둔다)
  const sortOptions: SelectOption[] = GAME_SORTS.map((s) => ({ value: s, label: SORT_LABEL[s], href: href({ sort: s }) }));

  // 장르는 스무 개가 넘어 칩으로 늘어놓으면 기둥을 세로로 다 먹는다 — 드롭다운으로 접는다
  const genreOptions: SelectOption[] = [
    { value: ALL, label: "전체 장르", href: href({ genre: undefined }) },
    ...facets.genres.map((g) => ({ value: g.name, label: g.name, href: href({ genre: g.name }) })),
  ];

  return (
    <>
      {/* 취향은 아래 무리 전부를 한꺼번에 채우는 스위치라 맨 위에 선다 */}
      {personal && <PersonalToggle personal={personal} sheet={sheet} />}

      {/* 정렬은 거르는 일이 아니다 — 아래 헤어라인으로 필터 무리와 층을 가른다 */}
      {/* 드롭다운은 기둥에서도 큰 칸(lg)이다 — 작은 칸(h-9, 12.5px)은 흰 판 위에서 칩보다 약해 보였다.
          이름표는 Select 의 작은 회색 이름표를 감추고 무리와 같은 FILTER_LABEL 로 밖에서 그린다 */}
      <div className={sheet ? "flex flex-col gap-3 border-b border-line pb-6" : "flex flex-col gap-2.5 border-b border-line pb-5"}>
        <span aria-hidden className={FILTER_LABEL}>
          정렬
        </span>
        <Select label="정렬" hideLabel value={filter.sort ?? defaultSortFor(filter)} options={sortOptions} scroll={false} onNavigate={go} size="lg" />
      </div>

      <Group label="플랫폼" sheet={sheet}>
        <ChipNavLink {...nav(href({ platform: undefined }))} {...chip} active={picked.length === 0}>
          전체
        </ChipNavLink>
        {families.map((f) => (
          <ChipNavLink key={f} {...nav(familyHref(f))} {...chip} active={pickedSet.has(f)}>
            {PLATFORM_FAMILY_LABEL[f]}
          </ChipNavLink>
        ))}
      </Group>

      {facets.genres.length > 0 && (
        <div className={sheet ? "flex flex-col gap-3" : "flex flex-col gap-2.5"}>
          <span aria-hidden className={FILTER_LABEL}>
            장르
          </span>
          <Select label="장르" hideLabel value={filter.genre ?? ALL} options={genreOptions} scroll={false} onNavigate={go} size="lg" />
        </div>
      )}

      {/* 거르는 조건 — 처음엔 하나뿐이었지만 무리로 세웠다(2026-09-22, 사용자 요청). 한국어 지원은 2026-10-07 에 더했다.
          "무료 제외" 칩은 2026-10-27 에 걷었다(사용자) — 인기순이 무료 게임을 뒤로 보내 할 일이 없다. nofree=1 주소는 계속 읽는다.
          칩 하나가 켜고 끄는 값이라 드롭다운을 쓰지 않는다 — 고를 값이 둘(켬, 끔)뿐이다 */}
      <Group label="조건" sheet={sheet}>
        {/* 세일 칩은 **세일이 열려 있을 때만** 선다(2026-10-02). 홈 배너와 같은 판정이라 둘이 늘 같이 서고 같이 내려간다.
            늘 세워 두지 않는 이유: 세일이 없는 열한 달 동안 눌러도 아무 일도 안 일어나는 칩이 된다 */}
        {sale && (
          <HideAfter untilIso={sale.endsAt}>
            <ChipNavLink {...nav(href({ event: filter.event === sale.key ? undefined : sale.key }))} {...chip} active={filter.event === sale.key} toggle>
              {RUNNING_SALE_MESSAGES.chip(sale.name)}
              <span className="sr-only">{filter.event === sale.key ? GAMES_FILTER_MESSAGES.toggleOn : GAMES_FILTER_MESSAGES.toggleOff}</span>
            </ChipNavLink>
          </HideAfter>
        )}
        {/* toggle: 앞에 체크 네모가 서고(켬/끔이 옆 칩 없이도 읽힌다), 누른 순간 켜짐이 바뀐다(ui/chip-nav).
            화면에 보이는 것은 네모뿐이라, 읽어 주는 기기에는 상태를 말로 준다 */}
        <ChipNavLink {...nav(href({ korean: !filter.korean }))} {...chip} active={Boolean(filter.korean)} toggle>
          {GAMES_FILTER_MESSAGES.korean}
          <span className="sr-only">{filter.korean ? GAMES_FILTER_MESSAGES.toggleOn : GAMES_FILTER_MESSAGES.toggleOff}</span>
        </ChipNavLink>
      </Group>
    </>
  );
}
