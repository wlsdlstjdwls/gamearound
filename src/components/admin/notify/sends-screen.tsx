"use client";
// 알림발송관리 화면 본문(2026-10-30, 사용자 "텔레그램 알림 보내는 것도 관리, 직접 보낼 수 있게"). 백오피스 이력 조회 꼴:
// 위 조회조건(발송일 기간, 상태, 템플릿), 왼쪽 발송 이력, 오른쪽 고른 이력의 상세(보낸 글 미리 보기, 실패 사유).
// 툴바 입력이 "새 발송" 이다 — 오른쪽 자리가 직접 발송 폼으로 바뀐다(compose). 실패한 이력은 "이 내용으로 다시 쓰기" 로 폼에 옮겨 다시 보낸다.
// 조회조건은 칸을 고친 뒤 조회(F8)를 눌러야 다시 읽는다 — 기간 칸 둘을 고치는 사이에 한 번씩 서버를 부르지 않게(백오피스 조회 버튼과 같다).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ComposeForm, type ComposeSeed } from "@/components/admin/notify/compose";
import { TelegramPreview } from "@/components/admin/notify/preview";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { Field, FieldPair, FormSection, MasterDetail, ReadValue, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FormSelect } from "@/components/ui/select/fields";
import { Tag, type TagTone } from "@/components/ui/tag";
import { ADMIN_NAV, NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { NotifySendStatus } from "@/server/db/schema";
import type { NotifySendDto, NotifyTemplateDto } from "@/server/services/notify-admin";

type Option = { value: string; label: string };
type Filter = { from: string; to: string; status: string; template: string };

/** 상태 색. 성공은 파랑, 실패는 빨강, 건너뜀은 회색(관리자 배지 규칙: 초록 금지) */
const STATUS_TONE: Record<NotifySendStatus, TagTone> = { sent: "acc", failed: "danger", skipped: "neutral" };
/** 그리드 내용 칸에 보일 글 길이. 태그를 걷은 첫 줄 앞부분이면 무슨 알림인지 읽힌다 */
const PREVIEW_CHARS = 60;

const plain = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, PREVIEW_CHARS);

export function NotifySendsScreen({ rows, limit, filter, templates, channels, compose }: { rows: NotifySendDto[]; limit: number; filter: Filter; templates: NotifyTemplateDto[]; channels: Option[]; compose: string | null }) {
  const router = useRouter();
  const [f, setF] = useState(filter);
  const [selected, setSelected] = useState<string | null>(null);
  // 발송 폼 씨앗. 바뀔 때마다 폼을 새로 세운다(key) — 다시 쓰기로 옮긴 글이 앞 폼의 칸 값과 섞이지 않게
  const [seed, setSeed] = useState<(ComposeSeed & { n: number }) | null>(compose ? { templateCode: compose, body: "", channel: null, n: 0 } : null);

  const templateName = (code: string | null) => (code ? (templates.find((t) => t.code === code)?.name ?? code) : M.noTemplate);
  const channelName = (code: string) => channels.find((c) => c.value === code)?.label ?? code;
  const current = rows.find((r) => r.id === selected) ?? null;

  const retrieve = () => {
    const q = new URLSearchParams({ from: f.from, to: f.to });
    if (f.status !== "all") q.set("status", f.status);
    if (f.template !== "all") q.set("template", f.template);
    router.push(`${ROUTES.adminNotifySends}?${q}`, { scroll: false });
    router.refresh();
  };

  const columns: GridCol<NotifySendDto>[] = [
    { key: "at", label: M.colSentAt, width: "128px", align: "center", value: (r) => r.createdAt, text: (r) => formatDateTime(r.createdAt) },
    { key: "status", label: M.colStatus, width: "64px", align: "center", value: (r) => M.statusLabels[r.status], render: (r) => <Tag small tone={STATUS_TONE[r.status]}>{M.statusLabels[r.status]}</Tag> },
    { key: "template", label: M.searchTemplate, width: "minmax(96px,0.8fr)", value: (r) => templateName(r.templateCode) },
    { key: "text", label: M.colPreview, width: "minmax(140px,1.2fr)", value: (r) => plain(r.text) },
    { key: "channel", label: M.colChannel, width: "84px", align: "center", value: (r) => channelName(r.channel) },
    { key: "actor", label: M.colActor, width: "80px", align: "center", value: (r) => (r.trigger === "system" && !r.actorName ? M.systemActor : (r.actorName ?? "")) },
  ];
  const all = { value: "all", label: M.all };

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.notifySends}
        count={rows.length}
        note={rows.length >= limit ? M.limitNote(limit) : undefined}
        tools={{ retrieve, insert: () => setSeed((s) => ({ templateCode: null, body: "", channel: null, n: (s?.n ?? 0) + 1 })) }}
      />
      <div className="flex flex-col gap-3">
        <SearchBand label={M.search}>
          {/* 기간 칸은 고정 폭 — 조회 띠 칸은 띠 끝까지 늘리지 않고 왼쪽부터 선다(admin-search-band-compact). 좁으면 두 날짜가 위아래로 꺾였다 */}
          <SearchItem label={M.searchPeriod} auto>
            <div className="w-full sm:w-[380px]">
            <FieldPair
              from={<DateField label={M.searchPeriod} hideLabel value={f.from} max={f.to} clearable={false} onChange={(v) => v && setF((x) => ({ ...x, from: v }))} />}
              to={<DateField label={M.searchPeriod} hideLabel value={f.to} min={f.from} clearable={false} onChange={(v) => v && setF((x) => ({ ...x, to: v }))} />}
            />
            </div>
          </SearchItem>
          <SearchItem label={M.searchStatus}>
            <FormSelect
              name="nsf-status"
              label={M.searchStatus}
              hideLabel
              size="md"
              value={f.status}
              onChange={(v) => setF((x) => ({ ...x, status: v }))}
              options={[all, ...(Object.keys(M.statusLabels) as NotifySendStatus[]).map((k) => ({ value: k, label: M.statusLabels[k] }))]}
            />
          </SearchItem>
          <SearchItem label={M.searchTemplate}>
            <FormSelect name="nsf-tpl" label={M.searchTemplate} hideLabel size="md" value={f.template} onChange={(v) => setF((x) => ({ ...x, template: v }))} options={[all, ...templates.map((t) => ({ value: t.code, label: t.name }))]} />
          </SearchItem>
        </SearchBand>
        <MasterDetail
          listWidth="560px"
          list={
            <DataGrid
              label={M.historyLabel}
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              selected={seed ? null : selected}
              onSelect={(k) => {
                setSeed(null);
                setSelected(k);
              }}
              rowTone={(r) => (r.status === "skipped" ? "muted" : undefined)}
              paging
              searchable
              empty={M.historyEmpty}
              fit
            />
          }
          detailTitle={seed ? M.composeTitle : current ? formatDateTime(current.createdAt) : undefined}
          detail={
            seed ? (
              <ComposeForm key={seed.n} templates={templates} channels={channels} seed={seed} onSent={() => router.refresh()} />
            ) : current ? (
              <div className="flex flex-col gap-3">
                <FormSection
                  title={M.sectionDetail}
                  action={
                    <Button variant="secondary" size="sm" onClick={() => setSeed((s) => ({ templateCode: null, body: current.text, channel: current.channel, n: (s?.n ?? 0) + 1 }))}>
                      {M.resend}
                    </Button>
                  }
                >
                  <Field label={M.colStatus}>
                    <ReadValue>
                      <Tag small tone={STATUS_TONE[current.status]}>
                        {M.statusLabels[current.status]}
                      </Tag>
                    </ReadValue>
                  </Field>
                  <Field label={M.colTrigger}>
                    <ReadValue>{M.triggerLabels[current.trigger]}</ReadValue>
                  </Field>
                  <Field label={M.searchTemplate}>
                    <ReadValue>{templateName(current.templateCode)}</ReadValue>
                  </Field>
                  <Field label={M.colChannel}>
                    <ReadValue>{channelName(current.channel)}</ReadValue>
                  </Field>
                  <Field label={M.fieldChatId}>
                    <ReadValue>{current.chatId ?? "-"}</ReadValue>
                  </Field>
                  <Field label={M.colActor}>
                    <ReadValue>{current.actorName ?? M.systemActor}</ReadValue>
                  </Field>
                  {current.error && (
                    <Field label={M.fieldError} wide>
                      <ReadValue>{current.error}</ReadValue>
                    </Field>
                  )}
                </FormSection>
                <TelegramPreview html={current.text} />
              </div>
            ) : (
              <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] text-dim">{M.pickHistory}</p>
            )
          }
        />
      </div>
    </>
  );
}
