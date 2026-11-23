// 히어로 오른쪽 기둥 맨 밑 정보 판 — 출시(출시 전과 당일만), 개발, 배급 줄. 히어로 파일이 300줄을 넘어 뗐다(2026-11-20).
// 왜 이 자리에 한 판으로 모았는지는 hero.tsx 의 InfoCard 자리 주석에 있다.
import Link from "next/link";
import { companyPath } from "@/lib/routes";
import { COMPANY_ROLE_LABEL } from "@/lib/games/messages";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { formatDate, kstDateKey } from "@/lib/format";
import type { GameDetail } from "@/server/services/games";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 출시일까지 남은 날(한국 날짜 기준). 날짜 열쇠끼리 빼서 시각 때문에 하루가 흔들리지 않는다 */
export function daysUntil(dateKey: string): number {
  return Math.round((Date.parse(dateKey) - Date.parse(kstDateKey(new Date()))) / MS_PER_DAY);
}

/** 출시일까지 남은 날과 날짜. 올해면 해를 뺀다 — 남은 날이 이미 가까움을 말한다 */
function releaseParts(date: string): { dday: string; today: boolean; dateText: string } {
  const key = date.slice(0, 10);
  const days = daysUntil(key);
  const full = formatDate(date);
  const dateText = key.slice(0, 4) === kstDateKey(new Date()).slice(0, 4) ? full.replace(/^\d+년 /, "") : full;
  return { dday: days > 0 ? D.releaseDday(days) : D.releaseToday, today: days <= 0, dateText };
}

/** 출시(출시 전과 당일만), 개발, 배급 줄. 회사 행이 이어진 게임은 회사 화면 링크(밑줄), 이름만 아는 게임은 글자만 */
export function InfoCard({ game, showRelease }: { game: GameDetail; showRelease: boolean }) {
  const companies: Array<{ key: string; role: string; name: string; href: string | null }> =
    game.companies.length > 0
      ? game.companies.map((c) => ({ key: `${c.slug}:${c.role}`, role: COMPANY_ROLE_LABEL[c.role], name: c.name, href: companyPath(c.slug) }))
      : (
          [
            ["developer", game.developer],
            ["publisher", game.publisher],
          ] as const
        )
          .filter((r): r is readonly ["developer" | "publisher", string] => Boolean(r[1]))
          .map(([role, name]) => ({ key: `${role}:${name}`, role: COMPANY_ROLE_LABEL[role], name, href: null }));
  const release = showRelease && game.releaseDate ? releaseParts(game.releaseDate) : null;
  if (!release && companies.length === 0) return null;
  return (
    // 히어로 오른쪽 기둥의 마지막 판이라 남은 높이까지 늘어난다(hero 의 세 기둥 바닥 맞추기) — 늘어도 줄이 위에 몰리지 않게 가운데로 모은다
    <dl className="flex flex-col justify-center gap-2 rounded-[var(--radius-panel)] bg-surface p-4 text-[13.5px] shadow-[var(--elev-card)]">
      {release && (
        <div className="flex items-center gap-3">
          {/* 이름표 앞 달력 아이콘은 걷었다(2026-11-19 사용자 "출시 앞에 아이콘도 빼") — 개발, 배급 줄과 같은 글자만 */}
          <dt className="w-10 shrink-0 text-mut">
            {D.releaseRowLabel}
          </dt>
          <dd className="flex min-w-0 items-center gap-2 font-bold text-ink-2">
            {/* 출시 당일은 면 없는 파란 글자다 — 카드의 "오늘 출시", 역대 최저가와 같은 모양(2026-11-19 사용자 "상세 뱃지는 왜 안 바꿈").
                남은 날(D-n)은 그대로 채운 면이다 */}
            {release.today ? (
              <span className="font-bold text-acc">{D.releaseToday}</span>
            ) : (
              <span className="rounded-[var(--radius-xs)] bg-acc px-1.5 py-0.5 text-[12.5px] font-extrabold tabular-nums text-on-ink">{release.dday}</span>
            )}
            {release.dateText}
          </dd>
        </div>
      )}
      {companies.map((r) => (
        <div key={r.key} className="flex items-baseline gap-3">
          <dt className="w-10 shrink-0 text-mut">{r.role}</dt>
          <dd className="min-w-0">
            {r.href ? (
              <Link href={r.href} className="font-bold text-ink-2 underline decoration-line-strong underline-offset-[3px] transition-colors hover:text-acc hover:decoration-acc">
                {r.name}
              </Link>
            ) : (
              <span className="font-bold text-ink-2">{r.name}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
