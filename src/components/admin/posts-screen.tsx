"use client";
// 게시글관리 화면 본문(2026-10-31). 백오피스 승인 화면 꼴:
// 위 조회조건(구분, 검색어), 왼쪽 글/댓글 그리드(체크 칸) + 아래 일괄 처리 띠(숨김, 숨김해제), 오른쪽 고른 줄의 상세.
// 앞 판은 칸 칩 줄 + 옛 data-rows 표에 줄마다 숨기기 단추였다 — 도배 글 여럿을 내리려면 한 줄씩 눌러야 했다.
//
// 구분은 서버가 다시 읽는 칸이라 주소로 간다(useUrlFilter). 검색어는 실린 줄을 바로 거르고, Enter 를 치면 주소에 실어
// 서버에서 다시 찾는다 — 서버는 최신 N건만 싣기 때문에(services/community/admin) 오래된 글은 서버 찾기로만 닿는다.
// 숨김은 지우기가 아니라 되살리기가 처리 한 번이라 사유를 받지 않는다(서버도 남기지 않는다).
import { useState } from "react";
import { moderateContentAction } from "@/app/(admin)/admin/posts/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { useUrlFilter } from "@/components/admin/screen/url-filter";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag } from "@/components/ui/tag";
import { TextField } from "@/components/ui/text-field";
import { APPROVAL_MESSAGES as AM, POST_ADMIN_MESSAGES as M } from "@/lib/admin/messages";
import type { ContentModerationInput } from "@/lib/admin/moderation-schema";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDotDate } from "@/lib/format";

type Status = "published" | "hidden";

/** 서버 화면이 넘기는 줄. 글과 댓글을 한 모양으로 편다 — 칸 묶음만 다르고 처리(숨김, 숨김해제)는 같다 */
export type PostAdminRow = {
  key: string;
  kind: ContentModerationInput["kind"];
  id: string;
  status: Status;
  /** 글이면 제목, 댓글이면 내용 */
  text: string;
  href: string;
  /** 글의 갈래 이름. 댓글은 null */
  category: string | null;
  game: string | null;
  authorName: string;
  authorEmail: string;
  createdAt: Date;
  reaction: { views: number; likes: number; comments: number } | null;
  /** 댓글이 달린 글. 글이면 null */
  onPost: { title: string; href: string; hidden: boolean } | null;
};

const DECISIONS: ApprovalDecision<PostAdminRow>[] = [
  { value: "hide", label: M.hide, danger: true, can: (r) => r.status === "published" },
  { value: "restore", label: M.restore, can: (r) => r.status === "hidden" },
];

const EXTERNAL = "text-[12.5px] font-semibold text-acc hover:underline";

function statusTag(s: Status) {
  return <Tag tone={s === "hidden" ? "outline" : "neutral"}>{s === "hidden" ? M.statusHidden : M.statusPublished}</Tag>;
}

export function PostsScreen({
  rows,
  mode,
  tab,
  tabs,
  q,
  baseHref,
}: {
  rows: PostAdminRow[];
  mode: "posts" | "comments";
  tab: string;
  tabs: Array<{ value: string; label: string; href: string }>;
  q: string;
  /** 지금 구분의 주소(검색어 없이). 검색어는 여기에 q 로 붙인다 */
  baseHref: string;
}) {
  const kind = useUrlFilter(tab, (v) => tabs.find((t) => t.value === v)?.href ?? tabs[0].href);
  const search = useUrlFilter(q, (v) => (v ? `${baseHref}${baseHref.includes("?") ? "&" : "?"}q=${encodeURIComponent(v)}` : baseHref));
  const [word, setWord] = useState(q);
  const [selected, setSelected] = useState<string | null>(null);
  const w = word.trim().toLowerCase();
  const shown = rows.filter((r) => !w || r.text.toLowerCase().includes(w) || r.authorName.toLowerCase().includes(w) || r.authorEmail.toLowerCase().includes(w));
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows,
    rowKey: (r) => r.key,
    run: async (r, decision) => moderateContentAction({ kind: r.kind, id: r.id, decision: decision === "hide" ? "hide" : "restore" }),
  });
  const current = rows.find((r) => r.key === selected) ?? null;
  const targets = checked.size > 0 ? shown.filter((r) => checked.has(r.key)) : current ? [current] : [];
  const pending = kind.pending || search.pending;

  const status: GridCol<PostAdminRow> = {
    key: "status",
    label: M.colStatus,
    width: "76px",
    align: "center",
    value: (r) => (r.status === "hidden" ? M.statusHidden : M.statusPublished),
    render: (r) => {
      const done = doneOf(r);
      return done ? <Tag tone="ok">{done}</Tag> : statusTag(r.status);
    },
  };
  const author: GridCol<PostAdminRow> = { key: "author", label: M.colAuthor, width: "minmax(84px,0.8fr)", value: (r) => r.authorName };
  const when: GridCol<PostAdminRow> = { key: "when", label: M.colWhen, width: "96px", align: "center", value: (r) => r.createdAt, text: (r) => formatDotDate(r.createdAt) };
  const columns: GridCol<PostAdminRow>[] =
    mode === "posts"
      ? [
          status,
          { key: "title", label: M.colPost, width: "minmax(180px,1.6fr)", value: (r) => r.text },
          { key: "category", label: M.colCategory, width: "80px", align: "center", value: (r) => r.category ?? "" },
          author,
          when,
        ]
      : [
          status,
          { key: "body", label: M.colComment, width: "minmax(160px,1.6fr)", value: (r) => r.text },
          { key: "post", label: M.colOnPost, width: "minmax(100px,1fr)", value: (r) => r.onPost?.title ?? "" },
          author,
          when,
        ];

  return (
    <div className="flex flex-col gap-3">
      <SearchBand label={M.search}>
        <SearchItem label={M.searchKind}>
          <FormSelect name="posts-kind" label={M.searchKind} hideLabel size="md" value={kind.value} onChange={kind.set} options={tabs.map((t) => ({ value: t.value, label: t.label }))} />
        </SearchItem>
        <SearchItem label={M.searchWord} htmlFor="posts-word">
          <TextField
            id="posts-word"
            type="search"
            label={M.searchWord}
            hideLabel
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && word.trim() !== q) search.set(word.trim());
            }}
            compact
          />
        </SearchItem>
      </SearchBand>
      <div className={cn("transition-opacity duration-fast", pending && "pointer-events-none opacity-50")} aria-busy={pending || undefined}>
        <MasterDetail
          listWidth="620px"
          list={
            <div className="flex flex-col gap-2">
              <DataGrid
                label={mode === "posts" ? M.listPosts : M.listComments}
                columns={columns}
                rows={shown}
                rowKey={(r) => r.key}
                selected={selected}
                onSelect={setSelected}
                autoSelectFirst
                checked={checked}
                onChecked={setChecked}
                rowTone={(r) => (doneOf(r) ? "muted" : undefined)}
                pageSize={50}
                empty={mode === "posts" ? M.empty : M.emptyComments}
                fit
              />
              <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />
            </div>
          }
          detailTitle={current ? (mode === "posts" ? current.text : M.detailComment) : mode === "posts" ? M.detailPost : M.detailComment}
          detailActions={
            current ? (
              <a href={current.href} target="_blank" rel="noreferrer" className={EXTERNAL}>
                {M.openPost}
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            ) : undefined
          }
          detail={current ? <Detail key={current.key} r={current} /> : <p className="px-2 py-6 text-center text-[13px] text-dim">{AM.pickHint}</p>}
        />
      </div>
    </div>
  );
}

function Detail({ r }: { r: PostAdminRow }) {
  const isPost = r.onPost === null;
  return (
    <>
      <FormSection title={isPost ? M.sectionPost : M.sectionComment} labelWidth="88px">
        <Field label={isPost ? M.fieldTitle : M.fieldBody} wide>
          <ReadValue>
            <span className="whitespace-pre-line break-words py-2">{r.text}</span>
          </ReadValue>
        </Field>
        {/* 짧은 값은 둘씩 한 줄, 길어질 수 있는 값(이메일, 게임 이름)은 한 줄을 다 쓴다 — 두 열에서 글자가 낱자로 꺾였다 */}
        <Field label={M.fieldStatus}>
          <ReadValue>{statusTag(r.status)}</ReadValue>
        </Field>
        {isPost && (
          <Field label={M.fieldCategory}>
            <ReadValue>{r.category ?? "-"}</ReadValue>
          </Field>
        )}
        <Field label={M.fieldAuthor} wide>
          <ReadValue>
            <span className="truncate">{r.authorName}</span>
          </ReadValue>
        </Field>
        <Field label={M.fieldEmail} wide>
          <ReadValue>
            <span className="break-all">{r.authorEmail}</span>
          </ReadValue>
        </Field>
        <Field label={M.fieldWhen} wide>
          <ReadValue>{formatDateTime(r.createdAt)}</ReadValue>
        </Field>
        {isPost && (
          <>
            <Field label={M.fieldGame} wide>
              <ReadValue>{r.game ?? "-"}</ReadValue>
            </Field>
            {r.reaction && (
              <Field label={M.fieldReaction} wide>
                <ReadValue>{M.reaction(r.reaction.views, r.reaction.likes, r.reaction.comments)}</ReadValue>
              </Field>
            )}
          </>
        )}
      </FormSection>
      {r.onPost && (
        <FormSection title={M.sectionOnPost} labelWidth="88px">
          <Field label={M.fieldTitle} wide>
            <ReadValue>
              <a href={r.onPost.href} target="_blank" rel="noreferrer" className="break-words py-2 text-acc hover:underline">
                {r.onPost.title}
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            </ReadValue>
          </Field>
          <Field label={M.fieldPostStatus}>
            <ReadValue>{statusTag(r.onPost.hidden ? "hidden" : "published")}</ReadValue>
          </Field>
          {r.kind === "indieComment" && (
            <Field label={M.colCategory}>
              <ReadValue>{M.kindIndie}</ReadValue>
            </Field>
          )}
        </FormSection>
      )}
    </>
  );
}
