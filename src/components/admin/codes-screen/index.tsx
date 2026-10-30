"use client";
// 공통코드관리 화면 본문(2026-10-30, 사용자 "공통 코드로 쓰는 것들을 추가하고 수정하고 미사용 처리"). 백오피스 공통코드관리 꼴:
// 위 조회조건(그룹코드/명, 사용여부), 왼쪽 코드그룹 그리드, 오른쪽 그룹 정보 + 코드 목록 + 고른 코드 묶음.
// 툴바 입력은 새 그룹, 코드 목록 위 "코드 추가" 는 고른 그룹에 새 코드다. 삭제는 흐리게 둔다 — 지우지 않고 사용여부로 끈다.
// 저장은 고른 그룹 하나 단위(F9, Ctrl+S). 다른 그룹으로 옮길 때 저장 안 한 값이 있으면 묻는다(screen/row-leave).
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCodeGroupAction } from "@/app/(admin)/admin/codes/actions";
import { reportDirty } from "@/components/admin/program-shell/store";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { MasterDetail, SearchBand, SearchItem } from "@/components/admin/screen/layout";
import { confirmRowLeave } from "@/components/admin/screen/row-leave";
import { useAdminStatus } from "@/components/admin/screen/status";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { ADMIN_NAV, CODES_MESSAGES as M } from "@/lib/admin/messages";
import { firstError } from "@/lib/admin/validation";
import type { CommonCodeGroupDto } from "@/server/services/common-codes";
import { CodeForm, CodeList, GroupForm, PickCode } from "./forms";
import { draftsOf, groupErrors, inputOf, newCode, newGroup, sameGroup, SORT_STEP, type CodeDraft, type GroupDraft } from "./model";

const GROUP_COLUMNS: GridCol<GroupDraft>[] = [
  { key: "code", label: M.colGroup, width: "minmax(140px,1.2fr)", value: (g) => g.groupCode },
  { key: "name", label: M.colGroupName, width: "minmax(96px,1fr)", value: (g) => g.name },
  { key: "count", label: M.colCount, width: "64px", align: "right", value: (g) => g.codes.length },
  { key: "active", label: M.colActive, width: "56px", align: "center", value: (g) => (g.active ? M.activeLabels.on : M.activeLabels.off) },
];

export function CodesScreen({ groups }: { groups: CommonCodeGroupDto[] }) {
  const router = useRouter();
  const { say } = useAdminStatus();
  const [saved, setSaved] = useState(() => draftsOf(groups));
  const [value, setValue] = useState(saved);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [codeKey, setCodeKey] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", active: "all" });
  const [pending, start] = useTransition();

  // 서버가 새 값을 주면(저장 뒤 refresh, 조회) 그 값으로 다시 선다
  const [source, setSource] = useState(groups);
  if (source !== groups) {
    setSource(groups);
    const next = draftsOf(groups);
    setSaved(next);
    setValue(next);
  }

  const current = value.find((g) => g.key === groupKey) ?? null;
  const savedOf = (key: string | null) => saved.find((g) => g.key === key);
  const dirtyOf = (g: GroupDraft | null) => !!g && (g.isNew || !sameGroup(g, savedOf(g.key)));
  const dirty = value.some(dirtyOf);
  const taken = useMemo(() => new Set(saved.map((g) => g.groupCode)), [saved]);
  const errors = current ? groupErrors(current, taken) : {};
  const code = current?.codes.find((c) => c.key === codeKey) ?? null;

  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [dirty]);

  const patchGroup = (key: string, next: (g: GroupDraft) => GroupDraft) => setValue((v) => v.map((g) => (g.key === key ? next(g) : g)));
  const setGroup = (next: Partial<GroupDraft>) => current && patchGroup(current.key, (g) => ({ ...g, ...next }));
  const setCode = (next: Partial<CodeDraft>) => current && code && patchGroup(current.key, (g) => ({ ...g, codes: g.codes.map((c) => (c.key === code.key ? { ...c, ...next } : c)) }));

  /** 고른 그룹 저장. 검사에 걸리면 false — 행 이동 확인이 그 자리에 머문다 */
  const save = (): boolean => {
    if (!current) return false;
    const bad = firstError(errors);
    if (bad) {
      say(`${M.invalid} ${bad.message}`, "error");
      return false;
    }
    const g = current;
    start(async () => {
      const r = await saveCodeGroupAction(inputOf(g), g.isNew).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) return say(r.error, "error");
      // 저장한 그룹과 코드의 열쇠를 서버 값(코드값)으로 바꾼다 — 고른 줄이 풀리지 않게 고른 열쇠도 같이 옮긴다
      const fixed: GroupDraft = { ...g, key: g.groupCode, isNew: false, codes: g.codes.map((c) => ({ ...c, key: c.code, isNew: false })) };
      setValue((v) => v.map((x) => (x.key === g.key ? fixed : x)));
      setSaved((s) => (s.some((x) => x.key === fixed.key) ? s.map((x) => (x.key === fixed.key ? fixed : x)) : [...s, fixed]));
      setGroupKey(fixed.key);
      setCodeKey((k) => fixed.codes.find((c, i) => g.codes[i]?.key === k)?.key ?? k);
      say(M.saved, "ok");
      router.refresh();
    });
    return true;
  };

  /** 그룹을 저장된 값으로(새 그룹이면 목록에서 뺀다) */
  const revert = (key: string) => {
    const old = savedOf(key);
    setValue((v) => (old ? v.map((g) => (g.key === key ? old : g)) : v.filter((g) => g.key !== key)));
  };

  const selectGroup = async (key: string) => {
    if (key === groupKey) return;
    if (!(await confirmRowLeave({ dirty: dirtyOf(current), save, revert: () => current && revert(current.key) }))) return;
    setGroupKey(key);
    setCodeKey(null);
  };

  const insertGroup = async () => {
    if (!(await confirmRowLeave({ dirty: dirtyOf(current), save, revert: () => current && revert(current.key) }))) return;
    const g = newGroup(value.reduce((n, x) => Math.max(n, x.sortOrder), 0) + SORT_STEP);
    setValue((v) => [...v, g]);
    setF({ name: "", active: "all" });
    setGroupKey(g.key);
    setCodeKey(null);
  };

  const addCode = () => {
    if (!current) return;
    const c = newCode(current);
    patchGroup(current.key, (g) => ({ ...g, codes: [...g.codes, c] }));
    setCodeKey(c.key);
  };

  const q = f.name.trim().toUpperCase();
  const rows = value.filter((g) => (f.active === "all" || (f.active === "on") === g.active) && (!q || g.isNew || g.groupCode.includes(q) || g.name.toUpperCase().includes(q)));

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.codes}
        count={rows.length}
        tools={{
          retrieve: () => {
            setValue(saved);
            router.refresh();
            say(M.reloaded);
          },
          insert: insertGroup,
          save: () => void save(),
          saveDisabled: !dirtyOf(current),
          saving: pending,
          dirty,
        }}
      />
      <div className="flex flex-col gap-3">
        <SearchBand label={M.search}>
          <SearchItem label={M.searchName} htmlFor="cs-name">
            <TextField id="cs-name" label={M.searchName} hideLabel value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} compact />
          </SearchItem>
          <SearchItem label={M.searchActive}>
            <FormSelect
              name="cs-active"
              label={M.searchActive}
              hideLabel
              size="md"
              value={f.active}
              onChange={(v) => setF((x) => ({ ...x, active: v }))}
              options={[
                { value: "all", label: M.all },
                { value: "on", label: M.activeLabels.on },
                { value: "off", label: M.activeLabels.off },
              ]}
            />
          </SearchItem>
        </SearchBand>
        <MasterDetail
          listWidth="420px"
          list={
            <DataGrid
              label={M.groupList}
              columns={GROUP_COLUMNS}
              rows={rows}
              rowKey={(g) => g.key}
              fileKey={(g) => ({ code: g.groupCode, name: g.name })}
              selected={groupKey}
              onSelect={(k) => void selectGroup(k)}
              autoSelectFirst
              rowState={(g) => (g.key === current?.key && Object.keys(errors).length > 0 ? "error" : g.isNew ? "new" : dirtyOf(g) ? "changed" : undefined)}
              rowTone={(g) => (g.active ? undefined : "muted")}
              empty={M.groupEmpty}
              fit
            />
          }
          detailTitle={current ? `${current.groupCode || M.newGroupName} ${current.name}` : undefined}
          detail={
            current && (
              <div key={current.key} className="flex flex-col gap-3">
                <GroupForm g={current} set={setGroup} errors={errors} />
                <CodeList g={current} saved={savedOf(current.key)} selected={codeKey} onSelect={setCodeKey} onAdd={addCode} errors={errors} />
                {code ? <CodeForm key={code.key} g={current} c={code} set={setCode} errors={errors} /> : <PickCode />}
              </div>
            )
          }
        />
      </div>
    </>
  );
}
