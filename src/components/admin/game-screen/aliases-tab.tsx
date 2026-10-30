"use client";
// 게임 고치기의 "검색 별칭" 탭(2026-10-30). 제목에 없는 말(시리즈명, 원작명, 약칭)로 게임을 찾게 하는 자리 — 스토어가 주지 않아 사람이 넣는다.
// 위 그리드(체크 칸 + 처리 띠의 삭제), 아래 별칭 추가 묶음. 앞 판은 알약 목록 + 줄마다 삭제 단추였다.
// 별칭은 저장한 값 그대로가 검색에 쓰이는 줄이라 삭제가 곧 처리다(다른 편집 화면처럼 "저장된 줄 삭제 금지" 를 걸지 않는다).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAliasAction, deleteAliasAction } from "@/app/(admin)/admin/actions";
import { ApprovalBar, useApproval, type ApprovalDecision } from "@/components/admin/screen/approval";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { Field, FormSection } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_ACTION_MESSAGES as A, GAME_ADMIN_MESSAGES as M } from "@/lib/admin/messages";
import { ALIAS_MAX_LEN } from "@/lib/aliases";
import type { AliasRow } from "./types";

const DECISIONS: ApprovalDecision<AliasRow>[] = [{ value: "delete", label: M.deleteAlias, danger: true }];
const COLUMNS: GridCol<AliasRow>[] = [{ key: "alias", label: M.colAlias, width: "minmax(200px,1fr)", value: (r) => r.alias }];

export function AliasesTab({ gameId, aliases }: { gameId: string; aliases: AliasRow[] }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [selected, setSelected] = useState<string | null>(null);
  const [alias, setAlias] = useState("");
  const [pending, start] = useTransition();
  const { checked, setChecked, doneOf, apply, busy } = useApproval({
    rows: aliases,
    rowKey: (r) => String(r.id),
    run: async (r) => {
      const res = await deleteAliasAction(gameId, r.id);
      return res && !res.ok ? res : { ok: true };
    },
  });
  const current = aliases.find((r) => String(r.id) === selected) ?? null;
  const targets = checked.size > 0 ? aliases.filter((r) => checked.has(String(r.id))) : current ? [current] : [];

  const add = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("gameId", gameId);
      fd.set("alias", alias.trim());
      const r = await addAliasAction(null, fd).catch(() => null);
      if (!r || !r.ok) return say(r && !r.ok ? r.error : A.failed, "error");
      say(r.message ?? "", "ok");
      setAlias("");
      router.refresh();
    });

  return (
    <>
      <div className="flex flex-col gap-2">
        <DataGrid
          label={M.aliasesListLabel}
          columns={COLUMNS}
          rows={aliases}
          rowKey={(r) => String(r.id)}
          selected={selected}
          onSelect={setSelected}
          autoSelectFirst
          checked={checked}
          onChecked={setChecked}
          rowTone={(r) => (doneOf(r) ? "muted" : undefined)}
          empty={M.aliasesEmpty}
        />
        <ApprovalBar decisions={DECISIONS} targets={targets} checkedCount={checked.size} busy={busy} onApply={apply} />
      </div>
      <FormSection
        title={M.sectionAddAlias}
        action={
          <Button size="sm" onClick={add} loading={pending} disabled={!alias.trim()}>
            {M.addAlias}
          </Button>
        }
      >
        <Field label={M.fieldAlias} htmlFor="ga-alias" required wide>
          <TextField id="ga-alias" label={M.fieldAlias} hideLabel placeholder={M.aliasPlaceholder} maxLength={ALIAS_MAX_LEN} value={alias} onChange={(e) => setAlias(e.target.value)} compact />
        </Field>
      </FormSection>
    </>
  );
}
