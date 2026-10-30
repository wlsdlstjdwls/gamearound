"use client";
// 게임 고치기의 "세대 업그레이드" 탭(기획서 F6, 2026-10-30 백오피스 꼴). 닌텐도 수집이 막혀 있는 동안 사람이 넣는 경로이고,
// 어댑터가 붙어도 남는다(크롤러가 못 읽는 조건, 예외를 사람이 적는 자리).
// 위 그리드(체크 칸 + 처리 띠의 삭제), 아래 추가 묶음. 같은 원본, 대상 짝이 있으면 덮어쓴다(services/admin-upgrades).
// 가격 칸은 유료일 때만 연다 — 무료인데 금액이 남아 있으면 무엇이 맞는지 화면에서 알 수 없다.
import { useCodes } from "@/components/code-book";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteUpgradeAction, upsertUpgradeAction } from "@/app/(admin)/admin/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/ui/number-field";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_ACTION_MESSAGES as A, GAME_ADMIN_MESSAGES as M } from "@/lib/admin/messages";
import { formatPrice } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import type { Platform, UpgradeKind } from "@/server/db/schema";
import type { UpgradeRow } from "./types";

/** 새 줄의 기본 짝. 지금 이 화면을 쓰는 까닭이 스위치 2 업그레이드라 그 짝을 먼저 둔다 */
const DEFAULT_FROM: Platform = "switch";
const DEFAULT_TO: Platform = "switch2";

const platformName = (p: Platform) => PLATFORM_LABEL[p] ?? p;
const DECISIONS: ApprovalDecision<UpgradeRow>[] = [{ value: "delete", label: M.deleteUpgrade, danger: true }];

/** 종류 이름표는 공통코드 UPGRADE_KIND */
const columns = (name: (g: string, c: string) => string): GridCol<UpgradeRow>[] => [
  { key: "from", label: M.colFrom, width: "112px", value: (r) => platformName(r.fromPlatform) },
  { key: "to", label: M.colTo, width: "112px", value: (r) => platformName(r.toPlatform) },
  { key: "kind", label: M.colKind, width: "88px", align: "center", value: (r) => name("UPGRADE_KIND", r.kind) },
  { key: "price", label: M.colPrice, width: "96px", align: "right", value: (r) => r.price ?? -1, text: (r) => (r.price === null ? "-" : formatPrice(r.price)) },
  { key: "note", label: M.colNote, width: "minmax(140px,1fr)", value: (r) => r.note ?? "" },
];

export function UpgradesTab({ gameId, upgrades, platforms, kinds }: { gameId: string; upgrades: UpgradeRow[]; platforms: readonly Platform[]; kinds: readonly UpgradeKind[] }) {
  const { name, options: codeOpts } = useCodes();
  const router = useRouter();
  const { say } = useAdminStatus();
  const [selected, setSelected] = useState<string | null>(null);
  const [from, setFrom] = useState<Platform>(DEFAULT_FROM);
  const [to, setTo] = useState<Platform>(DEFAULT_TO);
  const [kind, setKind] = useState<UpgradeKind>("paid");
  const [price, setPrice] = useState(0);
  const [storeUrl, setStoreUrl] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows: upgrades,
    rowKey: (r) => String(r.id),
    run: async (r) => {
      const res = await deleteUpgradeAction(gameId, r.id);
      return res && !res.ok ? res : { ok: true };
    },
  });
  const current = upgrades.find((r) => String(r.id) === selected) ?? null;
  const targets = checked.size > 0 ? upgrades.filter((r) => checked.has(String(r.id))) : current ? [current] : [];
  const options = platforms.map((p) => ({ value: p, label: platformName(p) }));

  const save = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("gameId", gameId);
      fd.set("fromPlatform", from);
      fd.set("toPlatform", to);
      fd.set("kind", kind);
      fd.set("price", kind === "paid" ? String(price) : "");
      fd.set("storeExternalId", "");
      fd.set("storeUrl", storeUrl.trim());
      fd.set("note", note.trim());
      const r = await upsertUpgradeAction(null, fd).catch(() => null);
      if (!r || !r.ok) return say(r && !r.ok ? r.error : A.failed, "error");
      say(r.message ?? "", "ok");
      setPrice(0);
      setStoreUrl("");
      setNote("");
      router.refresh();
    });

  return (
    <>
      <div className="flex flex-col gap-2">
        <DataGrid
          label={M.upgradesListLabel}
          columns={columns(name)}
          rows={upgrades}
          rowKey={(r) => String(r.id)}
          selected={selected}
          onSelect={setSelected}
          autoSelectFirst
          checked={checked}
          onChecked={setChecked}
          rowTone={(r) => (doneOf(r) ? "muted" : undefined)}
          empty={M.upgradesEmpty}
        />
        <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />
      </div>
      <FormSection
        title={M.sectionAddUpgrade}
        labelWidth="88px"
        action={
          <Button size="sm" onClick={save} loading={pending}>
            {M.saveUpgrade}
          </Button>
        }
      >
        <Field label={M.fieldFrom} required>
          <FormSelect name="gu-from" label={M.fieldFrom} hideLabel size="lg" value={from} onChange={(v) => setFrom(v as Platform)} options={options} />
        </Field>
        <Field label={M.fieldTo} required>
          <FormSelect name="gu-to" label={M.fieldTo} hideLabel size="lg" value={to} onChange={(v) => setTo(v as Platform)} options={options} />
        </Field>
        <Field label={M.fieldKind} required>
          <FormSelect name="gu-kind" label={M.fieldKind} hideLabel size="lg" value={kind} onChange={(v) => setKind(v as UpgradeKind)} options={codeOpts("UPGRADE_KIND").filter((o) => (kinds as readonly string[]).includes(o.value))} />
        </Field>
        <Field label={M.fieldPrice} htmlFor="gu-price">
          <NumberField id="gu-price" label={M.fieldPrice} hideLabel value={price} onValue={setPrice} disabled={kind !== "paid"} compact />
        </Field>
        <Field label={M.fieldStoreUrl} htmlFor="gu-url" wide>
          <TextField id="gu-url" label={M.fieldStoreUrl} hideLabel type="url" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} compact />
        </Field>
        <Field label={M.fieldNote} htmlFor="gu-note" wide>
          <TextField id="gu-note" label={M.fieldNote} hideLabel placeholder={M.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} compact />
        </Field>
      </FormSection>
    </>
  );
}
