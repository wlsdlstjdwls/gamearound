// /admin/companies — 회사 이름 확정 큐.
// 자동 확정은 이름이 정확히 일치하는 회사가 위키데이터에 딱 하나일 때만 한다. 여기 쌓이는 이름은
// 후보가 0건이거나 2건 이상이어서 배치가 판단을 미룬 것들이다. 사람이 보고 다시 조회한다.
// 2026-09-30 부터 게임 수 순이다 — 최근 수정 순이던 때는 게임 2개짜리 이름이 앞에 서고
// Square Enix(162), Rebellion(112) 같은 큰 이름이 화면에 잘 안 떴다.
//
// 화면 이름을 "회사" 에서 "회사 이름" 으로 바꿨다 — 회사를 만드는 자리가 아니라
// 수집이 주워 온 **이름 문자열**을 어느 회사로 볼지 정하는 자리다. 앞 이름은 그 구분을 지웠다.
import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listPendingCompanies, PENDING_COMPANIES_LIMIT } from "@/server/services/admin-companies";
import { listCompanies } from "@/server/services/companies";
import { CompanyResolveButton } from "@/components/admin/company-resolve-button";
import { PageHead, ROWS } from "@/components/ui/page";
import { DataCell, DataHead, DataList, DataRow } from "@/components/admin/data-rows";
import { COMPANY_MESSAGES } from "@/lib/admin/messages";
import { Clamp } from "@/components/ui/tooltip";
import { COMPANY_PENDING_COLS } from "@/lib/admin/table-cols";

export const metadata: Metadata = { title: COMPANY_MESSAGES.title };

export default async function AdminCompaniesPage() {
  await requireRoleOrForbid("admin");
  // 관리자 화면은 첫 페이지만 본다 — 전수 목록이 필요하면 공개 회사 화면이 이미 페이지네이션을 갖고 있다
  const [pending, known] = await Promise.all([listPendingCompanies(), listCompanies(undefined, 1)]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <PageHead title={COMPANY_MESSAGES.title} />
          <p className="mt-1 max-w-[620px] text-[13px] text-mut">{COMPANY_MESSAGES.lead}</p>
        </div>

        <header className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
            {COMPANY_MESSAGES.pendingTitle} <span className="text-[13px] font-normal text-dim">{pending.length}건</span>
          </h2>
          <p className="text-[11.5px] text-dim">{COMPANY_MESSAGES.limitHint(PENDING_COMPANIES_LIMIT)}</p>
        </header>

        {pending.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-mut">
            {COMPANY_MESSAGES.empty}
          </p>
        ) : (
          <div>
            <DataHead cols={COMPANY_PENDING_COLS} labels={[COMPANY_MESSAGES.colName, COMPANY_MESSAGES.colGameCount, COMPANY_MESSAGES.colAction]} />
            <DataList>
              {pending.map((p) => (
                <DataRow key={p.name} cols={COMPANY_PENDING_COLS}>
                  <DataCell label={COMPANY_MESSAGES.colName} className="text-ink">
                    <Clamp>{p.name}</Clamp>
                    <p className="mt-0.5 text-[11.5px] text-dim">
                      {p.outcome ? COMPANY_MESSAGES.outcome[p.outcome] : COMPANY_MESSAGES.notTriedYet}
                    </p>
                  </DataCell>
                  <DataCell label={COMPANY_MESSAGES.colGameCount} className="text-mut">
                    {p.gameCount}
                  </DataCell>
                  <DataCell>
                    <CompanyResolveButton name={p.name} />
                  </DataCell>
                </DataRow>
              ))}
            </DataList>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
          {COMPANY_MESSAGES.knownTitle} <span className="text-[13px] font-normal text-dim">{COMPANY_MESSAGES.knownCount(known.total)}</span>
        </h2>
        {known.items.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-mut">{COMPANY_MESSAGES.knownEmpty}</p>
        ) : (
          <ul className={ROWS}>
            {known.items.map((c) => (
              <li key={c.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
                <Link href={`${ROUTES.company}/${c.slug}`} className="font-semibold text-ink hover:text-acc">
                  {c.name}
                </Link>
                <span className="text-[11.5px] text-dim">{c.countryNameKo ?? COMPANY_MESSAGES.unknownCountry}</span>
                <span className="ml-auto text-[11.5px] text-mut">{COMPANY_MESSAGES.gameCount(c.gameCount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
