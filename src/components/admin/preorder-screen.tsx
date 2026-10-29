"use client";
// 예약특전관리 화면 본문(2026-10-31). 백오피스 승인 화면 꼴:
// 위 조회조건(상태, 특전글 제목), 왼쪽 글 그리드(체크 칸) + 아래 일괄 처리 띠(공개, 숨김), 오른쪽 고른 글의 상세.
// 앞 판은 글마다 게임 주소 칸과 단추 셋을 단 줄 목록이었다.
//
// "잇고 공개" 는 글마다 게임 주소가 달라 일괄 처리 띠에 올리지 않고 상세의 게임 잇기 묶음에 둔다.
// 그래도 처리 흐름(확인 팝업, 누른 순간 "처리됨", 실패만 되돌림)은 띠와 같은 useApproval 을 탄다 — 게임 주소를 사유 자리로 넘긴다.
// 공개는 게임이 이어져 있고 특전을 하나 이상 뽑은 글에만 걸린다(서버 moderatePreorderPost 의 조건과 같다).
import { useState } from "react";
import { moderatePreorderPostAction } from "@/app/(admin)/admin/preorder/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { FULL_ROW } from "@/components/admin/screen/form-grid";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag, type TagTone } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { APPROVAL_MESSAGES as AM } from "@/lib/admin/messages";
import { fieldErrors } from "@/lib/admin/validation";
import { cn } from "@/lib/cn";
import { formatDotDate } from "@/lib/format";
import { MAX_PARAM_LEN } from "@/lib/games-query";
import type { PreorderAdminRowDto } from "@/lib/preorder/dto";
import { PREORDER_MESSAGES } from "@/lib/preorder/messages";
import { preorderLinkSchema } from "@/lib/preorder/schemas";
import { gamePath } from "@/lib/routes";
import type { PreorderPostStatus } from "@/server/db/schema";

const A = PREORDER_MESSAGES.admin;
type Row = PreorderAdminRowDto;

const EXTERNAL = "text-[12.5px] font-semibold text-acc hover:underline";
// 상태 배지는 옅게 — 검토 대기만 파랑 기운, 공개, 숨김은 무채색(누런색 금지, 10-27)
const STATUS_TONE: Record<PreorderPostStatus, TagTone> = { review: "info", published: "neutral", hidden: "outline" };
const STATUSES: PreorderPostStatus[] = ["review", "published", "hidden"];

const DECISIONS: ApprovalDecision<Row>[] = [
  { value: "publish", label: A.publish, can: (r) => r.status !== "published" && r.game !== null && r.bonusCount > 0 },
  { value: "hide", label: A.hide, danger: true, can: (r) => r.status !== "hidden" },
];
const LINK: ApprovalDecision<Row> = { value: "link", label: A.link };

export function PreorderScreen({ rows }: { rows: Row[] }) {
  const [status, setStatus] = useState("all");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = title.trim().toLowerCase();
  const shown = rows.filter((r) => (status === "all" || r.status === status) && (!q || r.title.toLowerCase().includes(q)));
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows,
    rowKey: (r) => r.id,
    run: async (r, decision, reason) => {
      const fd = new FormData();
      fd.set("postId", r.id);
      fd.set("decision", decision);
      if (decision === LINK.value) fd.set("gameSlug", reason);
      const res = await moderatePreorderPostAction(null, fd);
      return res && !res.ok ? res : { ok: true };
    },
  });
  const current = rows.find((r) => r.id === selected) ?? null;
  const targets = checked.size > 0 ? shown.filter((r) => checked.has(r.id)) : current ? [current] : [];

  const columns: GridCol<Row>[] = [
    {
      key: "status",
      label: A.colStatus,
      width: "84px",
      align: "center",
      value: (r) => A.status[r.status],
      render: (r) => {
        const done = doneOf(r);
        return done ? <Tag tone="ok">{done}</Tag> : <Tag tone={STATUS_TONE[r.status]}>{A.status[r.status]}</Tag>;
      },
    },
    { key: "title", label: A.colTitle, width: "minmax(180px,1.6fr)", value: (r) => r.title, render: (r) => <span className={cn(r.status === "hidden" && "text-dim line-through")}>{r.title}</span> },
    { key: "game", label: A.colGame, width: "minmax(110px,1fr)", value: (r) => r.game?.title ?? "", render: (r) => r.game?.title ?? <span className="text-dim-2">{A.noGame}</span> },
    { key: "bonus", label: A.colBonus, width: "64px", align: "right", value: (r) => r.bonusCount },
    { key: "published", label: A.colPublished, width: "96px", align: "center", value: (r) => r.publishedAt, text: (r) => formatDotDate(r.publishedAt) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={A.search}>
        <SearchItem label={A.searchStatus}>
          <FormSelect
            name="p-status"
            label={A.searchStatus}
            hideLabel
            size="md"
            value={status}
            onChange={setStatus}
            options={[{ value: "all", label: A.searchAll }, ...STATUSES.map((s) => ({ value: s, label: `${A.status[s]} ${rows.filter((r) => r.status === s).length}` }))]}
          />
        </SearchItem>
        <SearchItem label={A.searchTitle} htmlFor="p-title">
          <TextField id="p-title" label={A.searchTitle} hideLabel value={title} onChange={(e) => setTitle(e.target.value)} compact />
        </SearchItem>
      </SearchBand>
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
            <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />
          </div>
        }
        detailTitle={current ? current.title : A.detailTitle}
        detailActions={
          current ? (
            <a href={current.url} target="_blank" rel="noopener noreferrer" className={EXTERNAL}>
              {A.openSource}
              <span className="sr-only"> {PREORDER_MESSAGES.newTab}</span>
            </a>
          ) : undefined
        }
        detail={current ? <Detail key={current.id} r={current} busy={busy} onLink={(slug) => apply(LINK, slug, [current])} /> : <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>}
      />
    </div>
  );
}

function Detail({ r, busy, onLink }: { r: Row; busy: boolean; onLink: (slug: string) => void }) {
  const [slug, setSlug] = useState(r.game?.slug ?? "");
  const [error, setError] = useState<string | undefined>();
  const link = () => {
    // 액션과 같은 스키마로 칸을 먼저 본다 — 빈 주소로 확인 팝업까지 가지 않게
    const errors = fieldErrors(preorderLinkSchema.safeParse({ postId: r.id, decision: LINK.value, gameSlug: slug }));
    setError(errors.gameSlug);
    if (!errors.gameSlug) onLink(slug.trim());
  };
  return (
    <>
      <FormSection title={A.sectionPost} labelWidth="88px">
        <Field label={A.fieldTitle} wide>
          <ReadValue>
            <span className="break-words py-2">{r.title}</span>
          </ReadValue>
        </Field>
        <Field label={A.fieldStatus}>
          <ReadValue>
            <Tag tone={STATUS_TONE[r.status]}>{A.status[r.status]}</Tag>
          </ReadValue>
        </Field>
        <Field label={A.fieldPublished}>
          <ReadValue>{r.publishedAt ? formatDotDate(r.publishedAt) : "-"}</ReadValue>
        </Field>
        {r.statusReason && (
          <Field label={A.fieldReason} wide>
            <ReadValue>
              <span className="break-words py-2">{r.statusReason}</span>
            </ReadValue>
          </Field>
        )}
        <Field label={A.fieldNsuids} wide>
          <ReadValue>
            <span className="break-all font-mono text-[12.5px]">{r.nsuids.length ? r.nsuids.join(", ") : "-"}</span>
          </ReadValue>
        </Field>
      </FormSection>
      <FormSection title={A.sectionLink} labelWidth="88px">
        <Field label={A.fieldGame} wide>
          <ReadValue>
            {r.game ? (
              <a href={gamePath(r.game.slug)} target="_blank" rel="noreferrer" className="text-acc hover:underline">
                {r.game.title}
                <span className="sr-only"> {PREORDER_MESSAGES.newTab}</span>
              </a>
            ) : (
              A.noGame
            )}
          </ReadValue>
        </Field>
        <Field label={A.fieldGameSlug} htmlFor={`p-slug-${r.id}`} required wide>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                id={`p-slug-${r.id}`}
                label={A.fieldGameSlug}
                hideLabel
                value={slug}
                maxLength={MAX_PARAM_LEN}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setError(undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") link();
                }}
                error={error}
                compact
              />
            </div>
            <Button size="sm" variant="secondary" disabled={busy} onClick={link} className="shrink-0 [@media(pointer:fine)]:h-10">
              {A.link}
            </Button>
          </div>
        </Field>
      </FormSection>
      <FormSection title={`${A.sectionBonuses} (${A.bonusCount(r.bonusCount)})`}>
        {r.bonuses.length === 0 ? (
          <p className={cn("px-1.5 py-1 text-[13px] text-dim", FULL_ROW)}>{A.noBonus}</p>
        ) : (
          <ul className={cn("flex flex-col gap-1.5 pl-1.5", FULL_ROW)}>
            {r.bonuses.map((b, i) => (
              <li key={i} className="flex flex-col gap-0.5 rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
                <span className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                  <Tag tone="outline">{PREORDER_MESSAGES.edition[b.edition]}</Tag>
                  {b.name}
                </span>
                {b.retailers && (
                  <span className="text-ink-2">
                    {PREORDER_MESSAGES.retailers} {b.retailers}
                  </span>
                )}
                <span className="text-[12px] text-dim">{b.endsOn ? PREORDER_MESSAGES.endsOn(b.endsOn) : PREORDER_MESSAGES.untilStock}</span>
                {b.notes.map((n, j) => (
                  <span key={j} className="text-[12px] text-mut">
                    {n}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </FormSection>
    </>
  );
}
