"use client";
// 요금 카드의 구매 단추(2026-10-28). 사용자: "어디에 걸지 고르기 → 광고 걸기를 또 눌러야 결제 화면으로 간다, 불편하다".
// 카드에서 바로 결제 화면으로 간다. 걸 글이 하나면 단추가 곧 링크이고, 여럿일 때만 시트를 열어 글을 고른다 —
// 고르는 순간이 결제 화면으로 가는 순간이다. 하나도 없으면 왜 못 사는지와 글을 만드는 길을 단다.
// 고른 묶음(낱개/같이)은 주소에 실려 간다(lib/payments/products 의 PLAN_PARAM) — 결제 화면에서 다시 고르지 않는다.
import Link from "next/link";
import { buttonClass, type ButtonVariant } from "@/components/ui/button";
import { ROW, ROWS } from "@/components/ui/page";
import { Sheet } from "@/components/ui/sheet";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";

export type PlanCtaGroup = { title: string; items: Array<{ id: string; title: string; href: string }> };

type Props = {
  label: string;
  variant: ButtonVariant;
  groups: PlanCtaGroup[];
  /** 걸 글이 하나도 없을 때 */
  empty: { href: string; action: string };
  /** 단추 아래 덧말(묶음에 홍보 글이 없을 때 등) */
  note?: string;
};

export function PlanCta({ label, variant, groups, empty, note }: Props) {
  const filled = groups.filter((g) => g.items.length > 0);
  const all = filled.flatMap((g) => g.items);
  const cls = buttonClass({ variant, fullWidth: true });

  if (all.length === 0) {
    return (
      <div className="mt-auto flex flex-col gap-2">
        <p className="text-center text-[12.5px] text-dim">{M.noTarget}</p>
        <Link href={empty.href} className={buttonClass({ variant: "secondary", fullWidth: true })}>
          {empty.action}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-auto flex flex-col gap-2">
      {all.length === 1 ? (
        <Link href={all[0].href} className={cls}>
          {label}
        </Link>
      ) : (
        <Sheet label={label} title={M.pickTitle} unstyledTrigger triggerClassName={cls}>
          <div className="flex flex-col gap-4 pb-2 pt-1">
            {filled.map((g) => (
              <div key={g.title} className="flex flex-col gap-1.5">
                <h3 className="text-[13px] font-semibold text-mut">{g.title}</h3>
                <ul className={ROWS}>
                  {g.items.map((t) => (
                    <li key={t.id}>
                      <Link href={t.href} className={`${ROW} flex min-h-12 items-center text-[15px] font-semibold text-ink`}>
                        <span className="min-w-0 truncate">{t.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Sheet>
      )}
      {note && <p className="text-center text-[12.5px] text-dim">{note}</p>}
    </div>
  );
}
