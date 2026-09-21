// 필터 고르는 자리 — 플랫폼, 장르, 조건.
// 고르는 것은 곧 그 주소로 가는 일이다(상태는 전부 쿼리스트링에 있다).
//
// 왜 이 셋만인가(2026-09-21): 기둥에 있던 할인, 가격, 내 기기를 걷었다.
// 할인과 가격은 정렬이 이미 답한다 — "할인율순", "가격 낮은순" 으로 세우면 맨 위가 그 답이고,
// 칩으로 얻는 것은 "그 아래를 안 보이게 하는 것" 뿐이었다. 내 기기는 값을 적어야 쓸 수 있는
// 유일한 필터라 기둥 한 칸을 늘 입력 폼으로 쓰고 있었다.
// 거르는 규칙 자체(sale, max, rig)는 살아 있다 — 주소로 들어오면 그대로 거르고, 푸는 길은
// 결과 위 "걸린 조건" 띠에 있다(./active). 고르는 자리만 걷어냈다.
//
// 플랫폼도 갈래(전체, PC, 콘솔) 셋으로 접었다. 낱개 스토어는 값으로는 계속 살아 있지만
// (주소, 회사, 상세 화면의 링크가 쓴다) 고르는 자리에서는 뺀다 — 스토어 아홉 칸이 기둥 위쪽을
// 두 줄씩 먹으면서 정작 "PC 냐 콘솔이냐" 라는 첫 물음을 가렸다.
import { PLATFORM_FAMILIES, PLATFORM_FAMILY_LABEL, FAMILY_PLATFORMS, familyOf, PLATFORM_ORDER, PLATFORM_VALUE_ORDER, type PlatformFamily } from "@/lib/platform";
import { ChipNavLink } from "@/components/ui/chip-nav";
import { Select, type SelectOption } from "@/components/ui/select";
import { gamesHref, joinPlatformValues, parsePlatformValues, type GamesQuery } from "@/lib/games-query";
import type { GameFacets } from "@/server/services/games";

/** "고르지 않음" 을 나타내는 값. 빈 문자열을 쓰면 현재 값 비교가 undefined 와 헷갈린다 */
const ALL = "__all__";

/** 갈래에 속한 플랫폼. 갈래 칩을 세울지 정할 때만 쓴다(그 갈래에 게임이 하나라도 붙어 있는가) */
const byFamily = (f: PlatformFamily) => PLATFORM_ORDER.filter((p) => familyOf(p) === f);

/**
 * 필터를 고르는 일은 "다른 곳으로 가는" 일이 아니라 "보던 자리에서 거르는" 일이다.
 * 기본값(scroll)대로 두면 누를 때마다 맨 위로 튄다 — 왼쪽 기둥은 붙어 있어 필터는 계속 보이는데
 * 보고 있던 줄만 사라진다. 게다가 목록이 뼈대로 바뀌며 문서가 짧아지는 순간이 겹쳐
 * 위로 튀었다가 본문이 오면 다시 내려오는 것처럼 보인다.
 */
export const KEEP_SCROLL = { scroll: false } as const;

/** 무리 하나. 이름표는 제목이 아니라 꼬리표라 작고 자간을 벌려 세운다(ui/page 의 SectionHead size="label" 과 같은 값) */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-[12px] font-bold tracking-[0.08em] text-dim">{label}</h2>
      <div className="flex flex-wrap gap-1.5">{children}</div>
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
export function Groups({ facets, filter }: { facets: GameFacets; filter: GamesQuery }) {
  const href = (patch: Partial<GamesQuery>) => gamesHref(filter, { ...patch, page: 1 });

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

  // 장르는 스무 개가 넘어 칩으로 늘어놓으면 기둥을 세로로 다 먹는다 — 드롭다운으로 접는다
  const genreOptions: SelectOption[] = [
    { value: ALL, label: "전체 장르", href: href({ genre: undefined }) },
    ...facets.genres.map((g) => ({ value: g.name, label: g.name, href: href({ genre: g.name }) })),
  ];

  return (
    <>
      <Group label="플랫폼">
        <ChipNavLink {...KEEP_SCROLL} href={href({ platform: undefined })} active={picked.length === 0}>
          전체
        </ChipNavLink>
        {families.map((f) => (
          <ChipNavLink key={f} {...KEEP_SCROLL} href={familyHref(f)} active={pickedSet.has(f)}>
            {PLATFORM_FAMILY_LABEL[f]}
          </ChipNavLink>
        ))}
      </Group>

      {facets.genres.length > 0 && <Select label="장르" value={filter.genre ?? ALL} options={genreOptions} scroll={false} />}

      <Group label="조건">
        {/* 구독 포함 여부는 Game Pass 하나로 시작하지만 조건은 "어떤 구독이든"이라 PS Plus 를 붙여도 문구가 그대로다 */}
        <ChipNavLink {...KEEP_SCROLL} href={href({ subscription: !filter.subscription })} active={Boolean(filter.subscription)}>
          구독으로 즐길 수 있어요
        </ChipNavLink>
      </Group>
    </>
  );
}
