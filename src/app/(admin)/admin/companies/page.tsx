// /admin/companies — 회사 검수 큐.
// 자동 확정은 이름이 정확히 일치하는 회사가 위키데이터에 딱 하나일 때만 한다. 여기 쌓이는 이름은
// 후보가 0건이거나 2건 이상이어서 배치가 판단을 미룬 것들이다. 사람이 보고 다시 조회한다.
import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listPendingCompanies, PENDING_COMPANIES_LIMIT } from "@/server/services/admin-companies";
import { listCompanies } from "@/server/services/companies";
import { CompanyResolveButton } from "@/components/admin/company-resolve-button";
import { PageHead, cardClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";

export const metadata: Metadata = { title: "회사 검수" };

export default async function AdminCompaniesPage() {
  await requireRoleOrForbid("admin");
  // 관리자 화면은 첫 페이지만 본다 — 전수 목록이 필요하면 공개 회사 화면이 이미 페이지네이션을 갖고 있다
  const [pending, known] = await Promise.all([listPendingCompanies(), listCompanies(undefined, 1)]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <PageHead title="회사 검수 큐" note={`${pending.length}건`} />
          <p className="text-[11.5px] text-dim">한 번에 최대 {PENDING_COMPANIES_LIMIT}건까지 봅니다</p>
        </header>

        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface p-6 text-[13px] text-mut">
            검수할 이름이 없습니다. 수집이 돌면 새 이름이 여기 쌓입니다.
          </p>
        ) : (
          <div className={cardClass("overflow-x-auto")}>
            <table className="w-full text-[13px]">
              <thead className="border-b border-line text-left text-[11.5px] text-dim">
                <tr>
                  <th className="px-3 py-2">이름</th>
                  <th className="px-3 py-2">게임 수</th>
                  <th className="px-3 py-2">조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {pending.map((p) => (
                  <tr key={p.name}>
                    <td className="max-w-[320px] px-3 py-2 text-ink">
                      <Clamp>{p.name}</Clamp>
                    </td>
                    <td className="px-3 py-2 text-mut">{p.gameCount}</td>
                    <td className="px-3 py-2">
                      <CompanyResolveButton name={p.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
          등록된 회사 <span className="text-[13px] font-normal text-dim">{known.total}곳</span>
        </h2>
        {known.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface p-6 text-[13px] text-mut">아직 없습니다.</p>
        ) : (
          <ul className={cardClass("divide-y divide-line-soft")}>
            {known.items.map((c) => (
              <li key={c.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
                <Link href={`${ROUTES.company}/${c.slug}`} className="font-semibold text-ink hover:text-acc">
                  {c.name}
                </Link>
                <span className="text-[11.5px] text-dim">{c.countryNameKo ?? "국가 미상"}</span>
                <span className="ml-auto text-[11.5px] text-mut">게임 {c.gameCount}개</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
