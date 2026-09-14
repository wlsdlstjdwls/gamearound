"use client";
// 검색 별칭 입력 — 제목에 없는 말로 게임을 찾게 하는 자리(server/services/admin-aliases).
// 스토어가 주지 않는 값(시리즈명, 원작명, 약칭)이라 사람이 넣는다.
import { useActionState, useState, useTransition } from "react";
import { addAliasAction, deleteAliasAction } from "@/app/(admin)/admin/actions";
import type { AdminActionState } from "@/app/(admin)/admin/actions";
import { ActionStatus, SubmitButton } from "@/components/admin/submit-button";
import { cardClass } from "@/components/ui/page";
import { ALIAS_MAX_LEN } from "@/lib/aliases";

const inputCls =
  "h-8 w-full rounded-[9px] border border-line-strong bg-bg px-3 text-[12.5px] text-ink outline-none transition-colors focus:border-ink focus:bg-surface";

export type AliasItem = { id: number; alias: string };

/** 삭제는 폼이 아니라 버튼이다 — form action 은 void 만 받고, 여기서는 실패 사유를 화면에 남겨야 한다 */
function DeleteButton({ gameId, id, alias }: { gameId: string; id: number; alias: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<AdminActionState>(null);
  return (
    <>
      {state && !state.ok && <span className="text-[11.5px] text-danger">{state.error}</span>}
      <button
        type="button"
        disabled={pending}
        aria-label={`별칭 ${alias} 삭제`}
        onClick={() => {
          if (!confirm(`별칭 "${alias}" 을(를) 지울까요?`)) return;
          start(async () => setState(await deleteAliasAction(gameId, id)));
        }}
        className="press rounded-[7px] border border-line-strong px-[9px] py-[3px] text-[11.5px] text-mut transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
      >
        삭제
      </button>
    </>
  );
}

export function AliasForm({ gameId, items }: { gameId: string; items: AliasItem[] }) {
  const [state, formAction] = useActionState(addAliasAction, null);

  return (
    <section className="flex flex-col gap-2.5">
      <p className="text-[13px] font-bold text-ink">검색 별칭</p>
      <p className="text-[11.5px] text-dim">
        제목에 없는 말로도 찾게 해요. 시리즈명, 원작명, 약칭, 흔한 오표기를 넣어요
        (예: 호그와트 레거시에 &quot;해리포터&quot;).
      </p>

      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((a) => (
            <li key={a.id} className={cardClass("flex items-center gap-2 px-3 py-1.5 text-[12.5px]")}>
              <span className="text-ink">{a.alias}</span>
              <DeleteButton gameId={gameId} id={a.id} alias={a.alias} />
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className={cardClass("flex flex-col gap-2.5 p-4")}>
        <input type="hidden" name="gameId" value={gameId} />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1 text-[11.5px] text-dim">
            추가할 별칭
            <input name="alias" maxLength={ALIAS_MAX_LEN} placeholder="해리포터" className={inputCls} required />
          </label>
          <span className="flex items-end">
            <SubmitButton label="추가" />
          </span>
        </div>
        <ActionStatus state={state} />
      </form>
    </section>
  );
}
