// 현황 띠와 오른쪽 패널(게시판 홈, 라운지 홈). news-blocks 폴더의 한 조각이다(2026-11-18 갈래 나눔).
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { NEWS_BOX, NewsHead } from "./parts";

/** 현황 띠의 한 칸. value 가 수면 크게 세우고 단위(unit)를 옆에 작게 붙인다. 글자(로그인 안내)면 한 줄 문장으로 선다 */
export type StatItem = { label: string; value: number | string; unit?: string; href?: string; icon?: React.ReactNode };

/**
 * 현황 띠(게시판 홈 S-10, 라운지 홈 S-16) — 흰 판 하나를 칸으로 가르고, 칸마다 아이콘, 이름, 큰 수를 세운다.
 * 10-28 검수("이 영역이 너무 안 이쁘다"): 연파랑 면에 작은 글자 줄이 흐릿한 빛과 겹쳐 숫자가 안 읽혔다. 숫자가 주인공이 되게
 * 수를 키우고, 면은 흰 판으로 바꾸고, 빛 웅덩이는 걷었다. 첫 칸만 아이콘 바탕을 채워 "지금 가장 중요한 수" 로 세운다.
 * 누르는 칸은 칸 전체가 누를 면이고 오른쪽에 꺾쇠가 선다. 좁은 화면은 두 칸씩 접히고 끝의 링크는 맨 아래 한 줄이 된다.
 */
export function StatStrip({ items, link, label }: { items: StatItem[]; link?: { href: string; label: string }; label: string }) {
  const four = items.length >= 4;
  const cols = four ? "grid-cols-2 md:grid-cols-4" : items.length === 3 ? "grid-cols-3" : "grid-cols-1";
  return (
    <section aria-label={label} className="flex flex-col overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair md:flex-row md:items-stretch">
      <dl className={cn("grid min-w-0 flex-1", cols)}>
        {items.map((it, i) => {
          const numeric = typeof it.value === "number";
          return (
            <div
              key={it.label}
              style={stagger(i)}
              className={cn(
                "enter-item group/stat relative flex min-w-0 flex-col gap-2.5 px-4 py-4 transition-colors sm:flex-row sm:items-center sm:gap-3.5 sm:px-5",
                // 칸 사이 선. 넷은 좁은 폭에서 두 칸씩 접혀 둘째 줄 위에도 선을 긋는다
                "border-line-soft",
                four ? i % 2 === 1 && "border-l" : i > 0 && "border-l",
                four && i >= 2 && "max-md:border-t",
                four && i === 2 && "md:border-l",
                // 눌러서 들어가는 칸은 눌린다는 티를 낸다(2026-10-28, 사용자: "클릭된다고 티 좀 내줘 이쁘게").
                // 바탕이 브랜드색으로 옅게 물들고, 그림 칸이 채운 파랑으로 바뀌고, 오른쪽 동그라미 화살표가 밀려 나간다.
                // 화살표는 좁은 폭에도 늘 선다 — 터치 기기에는 hover 가 없어 그것 말고는 눌린다는 표시가 없다
                it.href && "pr-12 hover:bg-surface-2 sm:pr-14",
              )}
            >
              {it.icon && (
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-fast sm:size-11",
                    // 그림 칸은 회색 면이다(2026-11-18 시안 C, 파랑은 화면당 단추 하나). 누르는 칸만 hover 때 먹색으로 찬다
                    "bg-surface-2 text-ink-2",
                    it.href && "group-hover/stat:bg-ink group-hover/stat:text-on-ink",
                  )}
                >
                  {it.icon}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <dt className={cn("line-clamp-2 break-keep text-[12.5px] leading-[1.35]", it.href ? "font-semibold text-ink-2" : "text-mut")}>{it.label}</dt>
                <dd className={cn("flex items-baseline gap-0.5", !numeric && "text-[14px] font-semibold text-ink")}>
                  {numeric ? (
                    <>
                      <span className="text-[22px] font-black leading-tight tracking-[-0.03em] tabular-nums text-ink sm:text-[24px]">{(it.value as number).toLocaleString("ko-KR")}</span>
                      {it.unit && <span className="text-[13px] font-semibold text-mut">{it.unit}</span>}
                    </>
                  ) : (
                    it.value
                  )}
                </dd>
              </div>
              {it.href && (
                <Link
                  href={it.href}
                  aria-label={`${it.label} ${typeof it.value === "number" ? it.value.toLocaleString("ko-KR") : it.value}${it.unit ?? ""}`}
                  className="press absolute inset-0 rounded-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-acc"
                >
                  <span
                    aria-hidden
                    className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2 text-mut transition-[background-color,color,translate] duration-fast group-hover/stat:translate-x-0.5 group-hover/stat:bg-ink group-hover/stat:text-on-ink sm:right-4 sm:size-8"
                  >
                    <ChevronLeftIcon size={15} className="rotate-180" />
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </dl>
      {link && (
        <Link
          href={link.href}
          className="press flex min-h-[var(--touch-target)] shrink-0 items-center justify-center gap-1 border-t border-line-soft bg-surface-4 px-5 text-[13.5px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 md:border-l md:border-t-0"
        >
          {link.label}
          <ChevronLeftIcon size={15} aria-hidden className="rotate-180" />
        </Link>
      )}
    </section>
  );
}

/**
 * 오른쪽 패널(목업 .lhsd) — 제목 줄, 흰 판 안의 줄들, 판 아래 안내 한 마디(guide).
 * 판 안 줄은 SideRow 를 쓰고, 비었을 때는 children 자리에 안내를 넣는다.
 */
export function SidePanel({
  id,
  title,
  action,
  guide,
  className,
  children,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
  guide?: { title: string; body: React.ReactNode; link?: React.ReactNode };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <aside aria-labelledby={id} className={cn("flex flex-col gap-2.5 lg:sticky lg:top-[calc(var(--header-h)+16px)]", className)}>
      <NewsHead id={id} title={title} action={action} />
      <div className={cn(NEWS_BOX, "flex flex-col gap-2.5 p-3.5")}>
        {children}
        {guide && (
          <div className="mt-1 flex flex-col gap-1.5 border-t border-line-soft px-1.5 pb-1 pt-4">
            <p className="text-[14px] font-bold text-ink">{guide.title}</p>
            <div className="text-[12.5px] leading-[1.7] text-mut">{guide.body}</div>
            {guide.link && <span className="text-[13px] font-semibold text-ink-2">{guide.link}</span>}
          </div>
        )}
      </div>
    </aside>
  );
}

/** 패널 안 한 줄 — 글자 칸(이름 첫 글자), 제목과 보조 줄, 오른쪽 알약 링크 */
export function SideRow({ mark, title, lines, href, cta, muted = false }: { mark: string; title: string; lines: React.ReactNode[]; href: string; cta: string; muted?: boolean }) {
  return (
    <div className="row-beam grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-[var(--radius-inset)] bg-surface-4 p-3 transition-colors hover:bg-surface-2 sm:grid-cols-[52px_minmax(0,1fr)_auto]">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-[10px] bg-surface-2 text-[19px] font-extrabold text-ink-2 sm:size-[52px]">
        {mark}
      </span>
      <Link href={href} className="flex min-w-0 flex-col gap-0.5 after:absolute after:inset-0">
        <span className="truncate text-[14.5px] font-bold text-ink">{title}</span>
        {lines.map((l, i) => (
          <span key={i} className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12px] text-dim">
            {l}
          </span>
        ))}
      </Link>
      <span
        aria-hidden
        className={cn("whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold", muted ? "text-dim" : "text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)]")}
      >
        {cta}
      </span>
    </div>
  );
}

/** 패널이 비었을 때 — 한 마디와 행동 하나 */
export function SideEmpty({ title, lead, action }: { title: string; lead?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 px-1.5 py-2">
      <p className="text-[14px] font-bold text-ink">{title}</p>
      {lead && <p className="text-[12.5px] leading-[1.6] text-dim">{lead}</p>}
      {action}
    </div>
  );
}

/** 따로 뜬 숫자 칸 하나(목업 .lsk) — 등록현황의 상단 집계처럼 칸마다 숫자가 주인공인 자리. 누르면 그 목록으로 간다 */
export function StatTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <>
      <span className="text-[12.5px] text-dim">{label}</span>
      <span className="text-[22px] font-black tabular-nums text-ink sm:text-[26px]">{value.toLocaleString("ko-KR")}</span>
    </>
  );
  const cls = "flex flex-col gap-1 rounded-[var(--radius-md)] bg-surface px-4 py-3.5 shadow-hair";
  return href ? (
    <Link href={href} className={`${cls} press transition-colors hover:bg-surface-2`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
