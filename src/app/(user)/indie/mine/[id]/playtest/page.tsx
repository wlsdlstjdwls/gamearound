// /indie/mine/[id]/playtest — 내 게임 플레이테스트 모집 관리(2026-10-27, 기획서 3장 5번 "신청자 목록은 개발자만 본다").
// 위는 열린 모집(안내, 신청 수, 마감 단추) 또는 새 모집 폼, 아래는 신청자 목록과 지난 모집. 내 글이 아니면 404.
// 공개 전 글에는 폼 대신 "공개된 뒤에 열 수 있어요" — 승인 전 글의 모집은 아무도 못 본다(services/indie/playtests).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PlaytestCloseButton, PlaytestCreateForm, PlaytestEdit } from "@/components/indie/playtest-manage";
import { Page, PageHead, ROWS, sectionCardClass } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { formatDate, formatDateTime } from "@/lib/format";
import { PLAYTEST_MESSAGES as M, PLAYTEST_PHASE_LABEL } from "@/lib/indie/playtest-messages";
import { indiePath, ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getPlaytestManage, type PlaytestApplicantDto } from "@/server/services/indie";

export const metadata: Metadata = { title: M.listTitle, robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

function Applicants({ list }: { list: PlaytestApplicantDto[] }) {
  if (list.length === 0) return <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.applicantsEmpty}</p>;
  return (
    <ul className={ROWS}>
      {list.map((a, i) => (
        <li key={`${a.name}-${i}`} className="flex flex-col gap-1 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[14px] font-semibold text-ink">{a.name}</span>
            <span className="text-[12px] tabular-nums text-dim">{formatDateTime(a.appliedAt)}</span>
          </div>
          <p className="whitespace-pre-line break-words text-[13.5px] text-ink-2">{a.message}</p>
        </li>
      ))}
    </ul>
  );
}

export default async function IndiePlaytestManagePage({ params }: Props) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUserOrRedirect();
  const data = await getPlaytestManage(user.id, id);
  if (!data) notFound();
  const [latest, ...older] = data.playtests;
  const open = latest && latest.phase !== "closed" ? latest : null;
  const history = open ? older : data.playtests;

  return (
    <Page gap={20} width="tight">
      <PageHead
        title={M.manageTitle(data.post.title)}
        action={
          <Link href={ROUTES.indieStats} className="tap inline-flex items-center text-[13.5px] font-semibold text-acc hover:underline">
            {M.back}
          </Link>
        }
      >
        <p className="text-[14px] text-mut">{M.manageLead}</p>
      </PageHead>

      {open ? (
        <section className={sectionCardClass("enter-item flex flex-col gap-3")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={open.phase === "open" ? "ok" : "warn"}>{PLAYTEST_PHASE_LABEL[open.phase]}</Tag>
              <Link href={indiePath(data.post.slug)} className="text-[15px] font-bold text-ink hover:text-acc hover:underline">
                {open.title}
              </Link>
            </div>
            <PlaytestCloseButton id={open.id} />
          </div>
          <p className="text-[12.5px] tabular-nums text-dim">{[M.closesAt(formatDate(open.closesAt)), M.applicants(open.applicants, open.slots)].join(" | ")}</p>
          <p className="whitespace-pre-line text-[14px] leading-[1.7] text-ink-2">{open.body}</p>
          <PlaytestEdit postId={data.post.id} playtest={{ id: open.id, title: open.title, body: open.body, slots: open.slots }} />
          <h2 className="mt-2 text-[14px] font-bold text-ink">{M.applicantsTitle}</h2>
          <Applicants list={open.applicantList} />
        </section>
      ) : (
        <section className={sectionCardClass("enter-item flex flex-col gap-3")}>
          <h2 className="text-[15px] font-bold text-ink">{M.createTitle}</h2>
          {data.post.live ? <PlaytestCreateForm postId={data.post.id} /> : <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.notLive}</p>}
        </section>
      )}

      {history.length > 0 && (
        <section aria-labelledby="playtest-history" className="flex flex-col gap-3">
          <h2 id="playtest-history" className="text-[15px] font-bold text-ink">
            {M.history}
          </h2>
          {history.map((p) => (
            <div key={p.id} className={sectionCardClass("flex flex-col gap-2")}>
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="acc">{PLAYTEST_PHASE_LABEL[p.phase]}</Tag>
                <span className="text-[14.5px] font-semibold text-ink">{p.title}</span>
              </div>
              <p className="text-[12.5px] tabular-nums text-dim">{[M.closesAt(formatDate(p.closesAt)), M.applicants(p.applicants, p.slots)].join(" | ")}</p>
              <Applicants list={p.applicantList} />
            </div>
          ))}
        </section>
      )}
    </Page>
  );
}
