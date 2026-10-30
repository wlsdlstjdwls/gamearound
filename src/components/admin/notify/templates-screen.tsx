"use client";
// 알림템플릿관리 화면 본문(2026-10-30, 사용자 "템플릿도 설정 가능하도록"). 백오피스 등록 화면 꼴:
// 위 조회조건(템플릿코드/명, 분류, 사용여부), 왼쪽 템플릿 그리드, 오른쪽 템플릿 정보 + 본문, 옆 기둥에 텔레그램 미리 보기.
// 시스템 템플릿(업무요청, 데이터 점검)은 코드가 부른다 — 코드는 잠그고, 본문에 쓸 수 있는 변수를 칩으로 보이며, 미리 보기는 예시 값으로 채운다.
// 수동 템플릿은 본문에 쓴 {이름} 이 곧 변수다(발송 화면이 그 순서로 칸을 세운다).
// 지우지 않는다. 안 쓰는 템플릿은 미사용으로 끈다 — 발송 이력이 템플릿코드를 들고 있다.
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveTemplateAction } from "@/app/(admin)/admin/notify-templates/actions";
import { BodyField, notifyErrors } from "@/components/admin/notify/body-field";
import { TelegramPreview } from "@/components/admin/notify/preview";
import { reportDirty } from "@/components/admin/program-shell/store";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { CodeName, Field, FormSection, MasterDetail, SearchBand, SearchItem, WithAside } from "@/components/admin/screen/layout";
import { confirmRowLeave } from "@/components/admin/screen/row-leave";
import { useAdminStatus } from "@/components/admin/screen/status";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_NAV, NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { newRowKey } from "@/lib/admin/row-key";
import { firstError } from "@/lib/admin/validation";
import { DEFAULT_NOTIFY_CHANNEL } from "@/lib/codes/groups";
import { notifyTemplateSchema, type NotifyTemplateInput } from "@/lib/notify/schemas";
import { isSystemTemplate, SYSTEM_TEMPLATE_VARS } from "@/lib/notify/system-templates";
import { renderNotice, templateVars } from "@/lib/notify/template";
import { NOTIFY_COMPOSE_PARAM, ROUTES } from "@/lib/routes";
import type { NotifyTemplateDto } from "@/server/services/notify-admin";

type Option = { value: string; label: string };
type Draft = NotifyTemplateInput & { key: string; isNew: boolean; system: boolean };

const toDraft = (t: NotifyTemplateDto): Draft => ({ key: t.code, isNew: false, system: t.system, code: t.code, name: t.name, category: t.category, channel: t.channel, body: t.body, active: t.active, memo: t.memo });
const inputOf = (d: Draft): NotifyTemplateInput => ({ code: d.code, name: d.name, category: d.category, channel: d.channel, body: d.body, active: d.active, memo: d.memo });
const same = (a?: Draft, b?: Draft) => JSON.stringify(a && inputOf(a)) === JSON.stringify(b && inputOf(b));
const labelOf = (opts: Option[], v: string) => opts.find((o) => o.value === v)?.label ?? v;

/** 미리 보기 변수 값. 시스템 템플릿은 예시 값, 수동은 비워 {이름} 그대로 보인다 */
function previewVars(d: Draft): Record<string, string> {
  return isSystemTemplate(d.code) ? Object.fromEntries(SYSTEM_TEMPLATE_VARS[d.code].map((v) => [v.name, v.sample])) : {};
}

export function NotifyTemplatesScreen({ templates, channels, categories }: { templates: NotifyTemplateDto[]; channels: Option[]; categories: Option[] }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [saved, setSaved] = useState(() => templates.map(toDraft));
  const [value, setValue] = useState(saved);
  const [selected, setSelected] = useState<string | null>(null);
  const [f, setF] = useState({ text: "", category: "all", active: "all" });
  const [pending, start] = useTransition();

  const [source, setSource] = useState(templates);
  if (source !== templates) {
    setSource(templates);
    const next = templates.map(toDraft);
    setSaved(next);
    setValue(next);
  }

  const current = value.find((d) => d.key === selected) ?? null;
  const savedOf = (key: string) => saved.find((d) => d.key === key);
  const dirtyOf = (d: Draft | null) => !!d && (d.isNew || !same(d, savedOf(d.key)));
  const dirty = value.some(dirtyOf);
  const errors = current ? notifyErrors(notifyTemplateSchema.safeParse(inputOf(current))) : {};
  if (current?.isNew && !errors.code && saved.some((d) => d.code === current.code.trim())) errors.code = M.codeExists;

  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

  const set = (next: Partial<Draft>) => current && setValue((v) => v.map((d) => (d.key === current.key ? { ...d, ...next } : d)));

  const save = (): boolean => {
    if (!current) return false;
    const bad = firstError(errors);
    if (bad) {
      say(`${M.invalid} ${bad.message}`, "error");
      return false;
    }
    const d = current;
    start(async () => {
      const r = await saveTemplateAction(inputOf(d), d.isNew).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) return say(r.error, "error");
      const fixed: Draft = { ...d, key: d.code, isNew: false };
      setValue((v) => v.map((x) => (x.key === d.key ? fixed : x)));
      setSaved((s) => (s.some((x) => x.key === fixed.key) ? s.map((x) => (x.key === fixed.key ? fixed : x)) : [...s, fixed]));
      setSelected(fixed.key);
      say(M.saved, "ok");
      router.refresh();
    });
    return true;
  };

  const revert = (key: string) => {
    const old = savedOf(key);
    setValue((v) => (old ? v.map((d) => (d.key === key ? old : d)) : v.filter((d) => d.key !== key)));
  };
  const leave = () => confirmRowLeave({ dirty: dirtyOf(current), save, revert: () => current && revert(current.key) });

  const select = async (key: string) => {
    if (key !== selected && (await leave())) setSelected(key);
  };

  const insert = async () => {
    if (!(await leave())) return;
    const d: Draft = { key: newRowKey("tpl"), isNew: true, system: false, code: "", name: M.newName, category: categories[0]?.value ?? "", channel: channels.find((c) => c.value === DEFAULT_NOTIFY_CHANNEL)?.value ?? channels[0]?.value ?? "", body: "", active: true, memo: null };
    setValue((v) => [...v, d]);
    setF({ text: "", category: "all", active: "all" });
    setSelected(d.key);
  };

  const q = f.text.trim().toLowerCase();
  const rows = value.filter(
    (d) => d.isNew || ((f.category === "all" || d.category === f.category) && (f.active === "all" || (f.active === "on") === d.active) && (!q || d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q))),
  );
  const columns: GridCol<Draft>[] = [
    { key: "kind", label: M.colKind, width: "60px", align: "center", value: (d) => (d.system ? M.kindLabels.system : M.kindLabels.manual) },
    { key: "code", label: M.colCode, width: "minmax(110px,1fr)", value: (d) => d.code },
    { key: "name", label: M.colName, width: "minmax(110px,1fr)", value: (d) => d.name },
    { key: "category", label: M.colCategory, width: "76px", align: "center", value: (d) => labelOf(categories, d.category) },
    { key: "active", label: M.colActive, width: "56px", align: "center", value: (d) => (d.active ? M.activeLabels.on : M.activeLabels.off) },
  ];
  const all = { value: "all", label: M.all };
  const html = current ? renderNotice(current.body, previewVars(current)) : "";

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.notifyTemplates}
        count={rows.length}
        tools={{
          retrieve: () => {
            setValue(saved);
            router.refresh();
            say(M.reloaded);
          },
          insert: () => void insert(),
          save: () => void save(),
          saveDisabled: !dirtyOf(current),
          saving: pending,
          dirty,
        }}
      />
      <div className="flex flex-col gap-3">
        <SearchBand label={M.search}>
          <SearchItem label={M.searchText} htmlFor="nt-q">
            <TextField id="nt-q" label={M.searchText} hideLabel value={f.text} onChange={(e) => setF((x) => ({ ...x, text: e.target.value }))} compact />
          </SearchItem>
          <SearchItem label={M.searchCategory}>
            <FormSelect name="nt-cat" label={M.searchCategory} hideLabel size="md" value={f.category} onChange={(v) => setF((x) => ({ ...x, category: v }))} options={[all, ...categories]} />
          </SearchItem>
          <SearchItem label={M.fieldActive}>
            <FormSelect
              name="nt-act"
              label={M.fieldActive}
              hideLabel
              size="md"
              value={f.active}
              onChange={(v) => setF((x) => ({ ...x, active: v }))}
              options={[all, { value: "on", label: M.activeLabels.on }, { value: "off", label: M.activeLabels.off }]}
            />
          </SearchItem>
        </SearchBand>
        <MasterDetail
          listWidth="420px"
          list={
            <DataGrid
              label={M.listLabel}
              columns={columns}
              rows={rows}
              rowKey={(d) => d.key}
              fileKey={(d) => ({ code: d.code, name: d.name })}
              selected={selected}
              onSelect={(k) => void select(k)}
              autoSelectFirst
              rowState={(d) => (d.key === current?.key && Object.keys(errors).length > 0 ? "error" : d.isNew ? "new" : dirtyOf(d) ? "changed" : undefined)}
              rowTone={(d) => (d.active ? undefined : "muted")}
              empty={M.empty}
              fit
            />
          }
          detailTitle={current?.name}
          detailActions={
            current && !current.isNew && current.active && !current.system ? (
              <Link href={`${ROUTES.adminNotifySends}?${NOTIFY_COMPOSE_PARAM}=${encodeURIComponent(current.code)}`} className="text-[12.5px] font-semibold text-acc hover:underline">
                {M.sendWith}
              </Link>
            ) : undefined
          }
          detail={
            current && (
              <WithAside key={current.key} aside={<TelegramPreview html={html} />}>
                <FormSection title={M.sectionBasic} action={current.system ? <span className="text-[11.5px] text-dim">{M.systemLocked}</span> : undefined}>
                  <Field label={M.fieldCodeName} htmlFor={`nt-name-${current.key}`} required wide error={errors.code ?? errors.name}>
                    {current.isNew ? (
                      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-1.5">
                        <TextField id={`nt-code-${current.key}`} label={M.colCode} hideLabel value={current.code} onChange={(e) => set({ code: e.target.value.trim() })} compact autoFocus />
                        <TextField id={`nt-name-${current.key}`} label={M.colName} hideLabel value={current.name} onChange={(e) => set({ name: e.target.value })} compact />
                      </div>
                    ) : (
                      <CodeName code={current.code}>
                        <TextField id={`nt-name-${current.key}`} label={M.colName} hideLabel value={current.name} onChange={(e) => set({ name: e.target.value })} compact />
                      </CodeName>
                    )}
                  </Field>
                  <Field label={M.fieldCategory} required>
                    <FormSelect name={`nt-c-${current.key}`} label={M.fieldCategory} hideLabel size="lg" value={current.category} onChange={(v) => set({ category: v })} options={categories} />
                  </Field>
                  <Field label={M.fieldChannel} required>
                    <FormSelect name={`nt-ch-${current.key}`} label={M.fieldChannel} hideLabel size="lg" value={current.channel} onChange={(v) => set({ channel: v })} options={channels} />
                  </Field>
                  <Field label={M.fieldActive} required>
                    <FormSelect
                      name={`nt-a-${current.key}`}
                      label={M.fieldActive}
                      hideLabel
                      size="lg"
                      value={current.active ? "on" : "off"}
                      onChange={(v) => set({ active: v === "on" })}
                      options={[
                        { value: "on", label: M.activeLabels.on },
                        { value: "off", label: M.activeLabels.off },
                      ]}
                    />
                  </Field>
                  <Field label={M.fieldMemo} htmlFor={`nt-m-${current.key}`}>
                    <TextField id={`nt-m-${current.key}`} label={M.fieldMemo} hideLabel value={current.memo ?? ""} onChange={(e) => set({ memo: e.target.value || null })} compact />
                  </Field>
                </FormSection>
                <FormSection title={M.sectionBody}>
                  <Field label={M.fieldBody} htmlFor={`nt-b-${current.key}`} required wide>
                    <BodyField
                      id={`nt-b-${current.key}`}
                      value={current.body}
                      onChange={(body) => set({ body })}
                      renderedLength={html.length}
                      error={errors.body}
                      vars={isSystemTemplate(current.code) ? SYSTEM_TEMPLATE_VARS[current.code] : templateVars(current.body).length > 0 ? templateVars(current.body).map((name) => ({ name })) : null}
                    />
                  </Field>
                </FormSection>
              </WithAside>
            )
          }
        />
      </div>
    </>
  );
}
