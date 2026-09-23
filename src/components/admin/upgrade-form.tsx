"use client";
// 세대 업그레이드 수동 입력 — 기획서 F6.
// 닌텐도 스토어 수집이 막혀 있는 동안 사람이 넣는 경로다. 어댑터가 붙어도 이 화면은 남는다
// (크롤러가 못 읽는 조건, 예외를 사람이 적는 자리).
import { useActionState, useState, useTransition } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { deleteUpgradeAction, upsertUpgradeAction } from "@/app/(admin)/admin/actions";
import { ActionStatus, SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import type { AdminActionState } from "@/app/(admin)/admin/actions";
import { panelClass } from "@/components/ui/page";
import { ADMIN_FIELD } from "@/components/admin/field";
import { FormSelect } from "@/components/ui/select";
import { PLATFORM_LABEL } from "@/lib/format";
import type { Platform, UpgradeKind } from "@/server/db/schema";


const KIND_LABEL: Record<UpgradeKind, string> = {
  free: "무료",
  paid: "유료",
  subscription_included: "구독 포함",
};

export type UpgradeItem = {
  id: number;
  fromPlatform: Platform;
  toPlatform: Platform;
  kind: UpgradeKind;
  price: number | null;
  storeUrl: string | null;
  note: string | null;
};

/** 삭제는 폼이 아니라 버튼이다 — form action 은 void 만 받고, 여기서는 실패 사유를 화면에 남겨야 한다 */
function DeleteButton({ gameId, id }: { gameId: string; id: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<AdminActionState>(null);
  return (
    <span className="ml-auto flex items-center gap-2">
      {state && !state.ok && <span className="text-[11.5px] text-danger">{state.error}</span>}
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (!confirm("이 업그레이드 정보를 지울까요?")) return;
          start(async () => setState(await deleteUpgradeAction(gameId, id)));
        }}
        className="hover:border-danger hover:text-danger"
      >
        삭제
      </Button>
    </span>
  );
}

export function UpgradeForm({
  gameId,
  platforms,
  kinds,
  items,
}: {
  gameId: string;
  platforms: readonly Platform[];
  kinds: readonly UpgradeKind[];
  items: UpgradeItem[];
}) {
  const [state, formAction, submitting] = useActionState(upsertUpgradeAction, null);
  // 유료일 때만 가격 칸을 연다 — 무료인데 금액이 남아 있으면 무엇이 맞는지 화면에서 알 수 없다
  const [kind, setKind] = useState<UpgradeKind>("paid");

  return (
    <section className="flex flex-col gap-2.5">
      <p className="text-[13px] font-bold text-ink">세대 업그레이드</p>

      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((u) => (
            <li key={u.id} className={panelClass("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[12.5px]")}>
              <span className="text-ink">
                {PLATFORM_LABEL[u.fromPlatform] ?? u.fromPlatform} 에서 {PLATFORM_LABEL[u.toPlatform] ?? u.toPlatform}
              </span>
              <span className="text-mut">{KIND_LABEL[u.kind]}</span>
              {u.price !== null && <span className="text-mut">{u.price.toLocaleString("ko-KR")}원</span>}
              {u.note && <span className="text-dim">{u.note}</span>}
              <DeleteButton gameId={gameId} id={u.id} />
            </li>
          ))}
        </ul>
      )}

      <ActionForm action={formAction} state={state} pending={submitting} className={panelClass("flex flex-col gap-2.5 p-4")}>
        <input type="hidden" name="gameId" value={gameId} />
        <div className="grid gap-2 sm:grid-cols-4">
          <FormSelect
            name="fromPlatform"
            label="원본 플랫폼"
            defaultValue="switch"
            options={platforms.map((p) => ({ value: p, label: PLATFORM_LABEL[p] ?? p }))}
          />
          <FormSelect
            name="toPlatform"
            label="업그레이드 대상"
            defaultValue="switch2"
            options={platforms.map((p) => ({ value: p, label: PLATFORM_LABEL[p] ?? p }))}
          />
          <FormSelect
            name="kind"
            label="방식"
            value={kind}
            onChange={(v) => setKind(v as UpgradeKind)}
            options={kinds.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
          />
          <label className="flex flex-col gap-1 text-[11.5px] text-dim">
            가격 (KRW)
            <input
              name="price"
              type="number"
              min={0}
              step={100}
              disabled={kind !== "paid"}
              placeholder={kind === "paid" ? "12000" : "유료일 때만"}
              className={`${ADMIN_FIELD} disabled:opacity-50`}
            />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input name="storeUrl" type="url" placeholder="스토어 URL (선택)" className={ADMIN_FIELD} />
          <input name="note" placeholder="조건 메모 (선택, 예: 원본 소유 필요)" className={ADMIN_FIELD} />
          <SubmitButton label="저장" />
        </div>
        <input type="hidden" name="storeExternalId" value="" />
        <ActionStatus state={state} />
      </ActionForm>
    </section>
  );
}
