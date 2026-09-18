// 필터 고르는 자리 — 플랫폼, 장르, 정렬, 할인, 가격, 조건.
// 고르는 것은 곧 그 주소로 가는 일이다(상태는 전부 쿼리스트링에 있다).
//
// 플랫폼은 여러 개를 같이 고를 수 있다(2026-09-15). 전에는 한 번에 하나만 골렸고 낱개 기기는
// 갈래를 먼저 누른 뒤에야 나타났다 — "PS5 와 스위치를 같이 보고 싶다" 에 답할 길이 아예 없었다.
// 지금은 낱개를 늘 펴 두고 칩마다 켜고 끈다. 고른 값은 주소에 쉼표로 이어 실린다.
import { PLATFORM_LABEL } from "@/lib/format";
import {
  familyOf,
  FAMILY_PLATFORMS,
  PLATFORM_FAMILIES,
  PLATFORM_FAMILY_LABEL,
  PLATFORM_ORDER,
  PLATFORM_VALUE_ORDER,
  type PlatformFamily,
} from "@/lib/platform";
import { ChipNavLink } from "@/components/ui/chip-nav";
import { Select, type SelectOption } from "@/components/ui/select";
import {
  GAME_SORTS,
  DEFAULT_GAME_SORT,
  MAX_PRICE_STEPS,
  MIN_DISCOUNT_STEPS,
  SORT_LABEL,
  gamesHref,
  joinPlatformValues,
  maxPriceLabel,
  parsePlatformValues,
  type GamesQuery,
  type MaxPrice,
  type MinDiscount,
} from "@/lib/games-query";
import type { GameFacets } from "@/server/services/games";
import type { CompatDevice } from "@/components/devices/guest-device";
import { RIG_FILTER_MESSAGES } from "@/lib/games/messages";
import { RigChip } from "./rig-chip";

/** "고르지 않음" 을 나타내는 값. 빈 문자열을 쓰면 현재 값 비교가 undefined 와 헷갈린다 */
const ALL = "__all__";

/** 갈래에 속한 플랫폼을 화면 순서대로. FAMILY_PLATFORMS 를 직접 쓰지 않는 이유는 순서 원천을 하나로 두기 위해서다 */
const byFamily = (f: PlatformFamily) => PLATFORM_ORDER.filter((p) => familyOf(p) === f);

/**
 * 필터를 고르는 일은 "다른 곳으로 가는" 일이 아니라 "보던 자리에서 거르는" 일이다.
 * 기본값(scroll)대로 두면 누를 때마다 맨 위로 튄다 — 왼쪽 기둥은 붙어 있어 필터는 계속 보이는데
 * 보고 있던 줄만 사라진다. 게다가 목록이 뼈대로 바뀌며 문서가 짧아지는 순간이 겹쳐
 * 위로 튀었다가 본문이 오면 다시 내려오는 것처럼 보인다.
 */
export const KEEP_SCROLL = { scroll: false } as const;

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
 *
 * 칩과 드롭다운을 가르는 기준은 개수다. 서넛이면 칩이 빠르고(한 번에 다 보이고 한 번에 눌린다),
 * 열 개를 넘으면 드롭다운이 낫다(안 고른 값이 자리를 차지하지 않는다).
 */
export function Groups({ facets, filter, devices }: { facets: GameFacets; filter: GamesQuery; devices: CompatDevice[] }) {
  const href = (patch: Partial<GamesQuery>) => gamesHref(filter, { ...patch, page: 1 });

  // 실제로 게임이 붙어 있는 플랫폼만 고를 수 있다(facets)
  const available = new Set(facets.platforms.map((p) => p.platform));
  const picked = parsePlatformValues(filter.platform);
  const pickedSet = new Set(picked);
  const families = PLATFORM_FAMILIES.filter((f) => byFamily(f).some((p) => available.has(p)));

  /** 값 하나를 켜고 끈 뒤의 주소. 같은 선택이 늘 같은 문자열이 되도록 joinPlatformValues 가 순서를 세운다 */
  const platformHref = (value: string, siblings: readonly string[] = []) => {
    const next = pickedSet.has(value)
      ? picked.filter((v) => v !== value)
      : // 갈래를 켜면 그 안의 낱개를 지운다(낱개를 켜면 갈래를 지운다) — 둘이 같이 서면 주소가 같은 말을 두 번 한다
        [...picked.filter((v) => !siblings.includes(v)), value];
    return href({ platform: joinPlatformValues(next, PLATFORM_VALUE_ORDER) });
  };

  // 장르는 스무 개가 넘어 칩으로 늘어놓으면 기둥을 세로로 다 먹는다 — 드롭다운으로 접는다
  const genreOptions: SelectOption[] = [
    { value: ALL, label: "전체 장르", href: href({ genre: undefined }) },
    ...facets.genres.map((g) => ({ value: g.name, label: g.name, href: href({ genre: g.name }) })),
  ];
  const sortOptions: SelectOption[] = GAME_SORTS.map((s) => ({ value: s, label: SORT_LABEL[s], href: href({ sort: s }) }));

  return (
    <>
      <Group label="플랫폼">
        <ChipNavLink {...KEEP_SCROLL} href={href({ platform: undefined })} active={picked.length === 0}>
          전체
        </ChipNavLink>
        {families.map((f) => (
          <ChipNavLink key={f} {...KEEP_SCROLL} href={platformHref(f, FAMILY_PLATFORMS[f])} active={pickedSet.has(f)}>
            {PLATFORM_FAMILY_LABEL[f]}
          </ChipNavLink>
        ))}
      </Group>

      {/* 낱개는 늘 펴 둔다 — 접어 두면 "PS5 만" 을 고르려고 콘솔을 한 번 더 눌러야 했고,
          그 한 번이 "낱개는 고를 수 없다" 로 읽혔다. 갈래가 켜져 있으면 안쪽은 이미 다 포함이라 꺼진 채로 둔다 */}
      {families.map((f) => {
        const children = byFamily(f).filter((p) => available.has(p));
        if (children.length === 0) return null;
        return (
          <Group key={f} label={PLATFORM_FAMILY_LABEL[f]}>
            {children.map((p) => (
              <ChipNavLink key={p} {...KEEP_SCROLL} href={platformHref(p, [f])} active={pickedSet.has(p)}>
                {PLATFORM_LABEL[p] ?? p}
              </ChipNavLink>
            ))}
          </Group>
        );
      })}

      {facets.genres.length > 0 && <Select label="장르" value={filter.genre ?? ALL} options={genreOptions} scroll={false} />}

      <Select label="정렬" value={filter.sort ?? DEFAULT_GAME_SORT} options={sortOptions} scroll={false} />

      {/*
        할인은 한 축이다. "할인 중만" 과 "30% 이상" 을 따로 두면 둘 다 켠 상태가 생기고
        그때 화면이 말하는 것과 질의가 거는 것이 어긋난다. 그래서 한 줄에서 하나만 서게 한다 —
        칸을 옮길 때 반대쪽을 반드시 지워 준다(주소에 찌꺼기가 남지 않는다).
      */}
      <Group label="할인">
        <ChipNavLink {...KEEP_SCROLL} href={href({ onSale: false, minDiscount: undefined })} active={!filter.onSale && !filter.minDiscount}>
          전체
        </ChipNavLink>
        <ChipNavLink {...KEEP_SCROLL} href={href({ onSale: true, minDiscount: undefined })} active={Boolean(filter.onSale) && !filter.minDiscount}>
          할인 중
        </ChipNavLink>
        {MIN_DISCOUNT_STEPS.map((pct: MinDiscount) => (
          <ChipNavLink
            key={pct}
            {...KEEP_SCROLL}
            href={href({ onSale: false, minDiscount: filter.minDiscount === pct ? undefined : pct })}
            active={filter.minDiscount === pct}
          >
            {pct}% 이상
          </ChipNavLink>
        ))}
      </Group>

      {/* 가격은 할인과 다른 질문이다 — "얼마나 깎였나" 가 아니라 "내 예산에 드나"(lib/games-query 주석) */}
      <Group label="가격">
        <ChipNavLink {...KEEP_SCROLL} href={href({ maxPrice: undefined })} active={filter.maxPrice === undefined}>
          전체
        </ChipNavLink>
        {MAX_PRICE_STEPS.map((won: MaxPrice) => (
          <ChipNavLink
            key={won}
            {...KEEP_SCROLL}
            href={href({ maxPrice: filter.maxPrice === won ? undefined : won })}
            active={filter.maxPrice === won}
          >
            {maxPriceLabel(won)}
          </ChipNavLink>
        ))}
      </Group>

      {/* 기기는 다른 필터와 달리 사람마다 값이 다르다 — 고르는 자리가 아니라 적는 자리가 함께 선다 */}
      <Group label={RIG_FILTER_MESSAGES.group}>
        <RigChip filter={filter} devices={devices} />
      </Group>

      <Group label="조건">
        {/* 구독 포함 여부는 Game Pass 하나로 시작하지만 조건은 "어떤 구독이든"이라 PS Plus 를 붙여도 문구가 그대로다 */}
        <ChipNavLink {...KEEP_SCROLL} href={href({ subscription: !filter.subscription })} active={Boolean(filter.subscription)}>
          구독으로 즐길 수 있어요
        </ChipNavLink>
      </Group>
    </>
  );
}
