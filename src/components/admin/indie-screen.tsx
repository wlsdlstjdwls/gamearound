"use client";
// 인디게임승인관리 화면 본문(2026-10-30). 백오피스 승인 화면 꼴:
// 위 조회조건(구분, 제목/개발사), 왼쪽 글 그리드(체크 칸) + 아래 일괄 처리 띠(처리, 사유, 적용), 오른쪽 고른 글의 상세.
// 앞 판은 글마다 사유 칸과 단추 대여섯 개를 단 카드 목록이었다 — 승인 대기 몇 건을 몰아 승인하려면 한 장씩 내려가며 눌러야 했다.
//
// 처리 낱말은 그 글에 할 수 있을 때만 걸린다(can) — 앞 판의 IndieModeration 이 단추를 보이던 조건과 같다.
// 구분(승인 대기, 신고, 게임 연결, 숨김, 전체)은 서버가 다시 읽는 칸이라 주소로 간다(useUrlFilter).
import Link from "next/link";
import { useState } from "react";
import { moderateIndiePostAction } from "@/app/(admin)/admin/indie/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { useUrlFilter } from "@/components/admin/screen/url-filter";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { APPROVAL_MESSAGES as AM } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { INDIE_HIDE_REASON_MAX } from "@/lib/indie/constants";
import type { IndieAdminRowDto } from "@/lib/indie/dto";
import { INDIE_ADMIN_MESSAGES as A, INDIE_MESSAGES, INDIE_REVIEW_LABEL, INDIE_REVIEW_TONE } from "@/lib/indie/messages";
import { gamePath, indiePath } from "@/lib/routes";

type Row = IndieAdminRowDto;

const DECISIONS: ApprovalDecision<Row>[] = [
  { value: "approve", label: A.approve, can: (r) => r.review === "pending" },
  { value: "reject", label: A.reject, danger: true, needsReason: true, can: (r) => r.review === "pending" },
  { value: "hide", label: A.hide, danger: true, needsReason: true, can: (r) => r.review !== "pending" && r.status === "published" },
  { value: "restore", label: A.restore, can: (r) => r.review !== "pending" && r.status !== "published" },
  { value: "verify_link", label: A.verifyLink, can: (r) => r.game !== null && !r.game.verified },
  { value: "reject_link", label: A.rejectLink, danger: true, can: (r) => r.game !== null },
];

function linkText(r: Row) {
  return r.game ? (r.game.verified ? A.linkVerified : A.linkPending) : A.linkNone;
}

export function IndieScreen({ rows, tab, tabs }: { rows: Row[]; tab: string; tabs: Array<{ value: string; label: string; href: string }> }) {
  const kind = useUrlFilter(tab, (v) => tabs.find((t) => t.value === v)?.href ?? tabs[0].href);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = text.trim().toLowerCase();
  const shown = rows.filter((r) => !q || r.title.toLowerCase().includes(q) || r.developerName.toLowerCase().includes(q));
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows,
    rowKey: (r) => r.id,
    run: async (r, decision, reason) => {
      const fd = new FormData();
      fd.set("postId", r.id);
      fd.set("decision", decision);
      fd.set("reason", reason);
      const res = await moderateIndiePostAction(null, fd);
      return res && !res.ok ? res : { ok: true };
    },
  });
  const current = rows.find((r) => r.id === selected) ?? null;
  const targets = checked.size > 0 ? shown.filter((r) => checked.has(r.id)) : current ? [current] : [];

  const columns: GridCol<Row>[] = [
    {
      key: "review",
      label: A.colReview,
      width: "76px",
      align: "center",
      value: (r) => INDIE_REVIEW_LABEL[r.review],
      render: (r) => {
        const done = doneOf(r);
        return done ? <Tag tone="ok">{done}</Tag> : <Tag tone={INDIE_REVIEW_TONE[r.review]}>{INDIE_REVIEW_LABEL[r.review]}</Tag>;
      },
    },
    { key: "title", label: A.colTitle, width: "minmax(140px,1.4fr)", value: (r) => r.title, render: (r) => <span className={cn(r.status !== "published" && "text-dim line-through")}>{r.title}</span> },
    { key: "dev", label: A.colDeveloper, width: "minmax(90px,1fr)", value: (r) => r.developerName },
    { key: "reports", label: A.colReports, width: "56px", align: "right", value: (r) => r.reportCount, render: (r) => (r.reportCount > 0 ? <span className="font-bold text-danger">{r.reportCount}</span> : "") },
    { key: "game", label: A.colGame, width: "72px", align: "center", value: linkText },
    { key: "created", label: A.colCreated, width: "88px", align: "center", value: (r) => r.createdAt, text: (r) => r.createdAt.slice(0, 10) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={A.search}>
        <SearchItem label={A.searchKind}>
          <FormSelect name="indie-kind" label={A.searchKind} hideLabel size="md" value={kind.value} onChange={kind.set} options={tabs.map((t) => ({ value: t.value, label: t.label }))} />
        </SearchItem>
        <SearchItem label={A.searchText} htmlFor="indie-text">
          <TextField id="indie-text" label={A.searchText} hideLabel value={text} onChange={(e) => setText(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
      <div className={cn("transition-opacity duration-fast", kind.pending && "pointer-events-none opacity-50")} aria-busy={kind.pending || undefined}>
        <MasterDetail
          listWidth="620px"
          list={
            <div className="flex flex-col gap-2">
              <DataGrid
                label={A.listLabel}
                columns={columns}
                rows={shown}
                rowKey={(r) => r.id}
                selected={selected}
                onSelect={setSelected}
                autoSelectFirst
                checked={checked}
                onChecked={setChecked}
                rowTone={(r) => (doneOf(r) ? "muted" : undefined)}
                pageSize={50}
                empty={A.empty}
                maxHeight="calc(100svh - var(--header-h) - 330px)"
              />
              <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} reasonMax={INDIE_HIDE_REASON_MAX} busy={busy} onApply={apply} />
            </div>
          }
          detailTitle={current ? current.title : A.detailTitle}
          detailActions={
            current ? (
              <Link href={indiePath(current.slug)} className="text-[12.5px] font-semibold text-acc hover:underline">
                {A.openPost}
              </Link>
            ) : undefined
          }
          detail={current ? <Detail key={current.id} r={current} /> : <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>}
        />
      </div>
    </div>
  );
}

function Detail({ r }: { r: Row }) {
  return (
    <>
      <FormSection title={A.sectionPost}>
        <Field label={A.colDeveloper}>
          <ReadValue>{r.developerName}</ReadValue>
        </Field>
        <Field label={A.author}>
          <ReadValue>
            <span className="break-all">{r.authorEmail}</span>
          </ReadValue>
        </Field>
        <Field label={A.colCreated}>
          <ReadValue>{formatDate(r.createdAt)}</ReadValue>
        </Field>
        <Field label={A.linkedGame}>
          <ReadValue>
            {r.game ? (
              <Link href={gamePath(r.game.slug)} className="text-acc hover:underline">
                {r.game.title} ({linkText(r)})
              </Link>
            ) : (
              A.linkNone
            )}
          </ReadValue>
        </Field>
      </FormSection>
      <FormSection title={A.sectionState}>
        <Field label={A.colReview}>
          <ReadValue>
            <Tag tone={INDIE_REVIEW_TONE[r.review]}>{INDIE_REVIEW_LABEL[r.review]}</Tag>
          </ReadValue>
        </Field>
        <Field label={A.fieldStatus}>
          <ReadValue>{r.status === "published" ? A.statusOpen : A.statusHidden}</ReadValue>
        </Field>
        {r.review === "rejected" && (
          <Field label={A.rejectReason} wide>
            <ReadValue>{r.reviewReason ?? "-"}</ReadValue>
          </Field>
        )}
        {r.status !== "published" && (
          <Field label={A.hideReason} wide>
            <ReadValue>
              {INDIE_MESSAGES.hiddenNotice} {r.statusReason}
            </ReadValue>
          </Field>
        )}
      </FormSection>
      {r.reportCount > 0 && (
        <FormSection title={`${A.sectionReports} (${A.reports(r.reportCount)})`}>
          <ul className="flex flex-col gap-1 text-[13px] text-ink-2 @2xl:col-span-2">
            {r.reportReasons.map((reason, i) => (
              <li key={i} className="rounded-lg bg-surface-2 px-3 py-2">
                {reason}
              </li>
            ))}
          </ul>
        </FormSection>
      )}
    </>
  );
}
