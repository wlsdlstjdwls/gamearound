"use client";
// 플레이테스트 모집 열기 폼과 마감 단추(/indie/mine/[id]/playtest, 2026-10-27).
// 열기는 칸이 넷이라 보내는 동안 단추만 돈다. 열리면 서버가 그린 화면으로 다시 그린다(router.refresh) — 열린 모집 판과 신청자 목록이 서버 몫이다.
// 마감은 누른 순간 "모집을 마감했어요" 로 바꾸고 실패하면 되돌린다(AGENTS 6장).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closePlaytestAction, createPlaytestAction } from "@/app/(user)/indie/mine/[id]/playtest/actions";
import { Button } from "@/components/ui/button";
import { FIELD_HINT_CLASS, FIELD_LABEL_CLASS } from "@/components/ui/field-classes";
import { FormSelect } from "@/components/ui/select";
import { TEXTAREA_CLASS, TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { PLAYTEST_BODY_MAX, PLAYTEST_DAY_OPTIONS, PLAYTEST_SLOTS_MAX, PLAYTEST_TITLE_MAX } from "@/lib/indie/playtest";
import { PLAYTEST_MESSAGES as M } from "@/lib/indie/playtest-messages";
import { cn } from "@/lib/cn";

/** 인원 칸의 처음 값 — 인디 첫 플레이테스트로 흔한 크기 */
const DEFAULT_SLOTS = 20;

export function PlaytestCreateForm({ postId }: { postId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [slots, setSlots] = useState(String(DEFAULT_SLOTS));
  const [days, setDays] = useState(String(PLAYTEST_DAY_OPTIONS[1]));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createPlaytestAction({ postId, title, body, slots: Number(slots), days: Number(days) }).catch(() => ({ ok: false as const, error: M.failed }));
          if (!r.ok) return setError(r.error);
          toast(M.created);
          router.refresh();
        });
      }}
    >
      <TextField label={M.title} placeholder={M.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={PLAYTEST_TITLE_MAX} required />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="playtest-body" className={FIELD_LABEL_CLASS}>
          {M.body}
        </label>
        <textarea id="playtest-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={PLAYTEST_BODY_MAX} rows={6} required placeholder={M.bodyPlaceholder} className={TEXTAREA_CLASS} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label={M.slots} type="number" inputMode="numeric" min={1} max={PLAYTEST_SLOTS_MAX} value={slots} onChange={(e) => setSlots(e.target.value)} required />
        <FormSelect name="days" label={M.days} size="md" value={days} onChange={setDays} options={PLAYTEST_DAY_OPTIONS.map((d) => ({ value: String(d), label: M.daysOption(d) }))} />
      </div>
      {error && (
        <p role="alert" className={cn(FIELD_HINT_CLASS, "text-danger")}>
          {error}
        </p>
      )}
      <Button type="submit" variant="accent" loading={pending} className="self-start">
        {M.create}
      </Button>
    </form>
  );
}

export function PlaytestCloseButton({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [done, setDone] = useState(false);
  const [, start] = useTransition();
  if (done) return <span className="text-[12.5px] text-dim">{M.closed}</span>;
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        if (!confirm(M.closeConfirm)) return;
        setDone(true);
        start(async () => {
          const r = await closePlaytestAction(id).catch(() => ({ ok: false as const, error: M.failed }));
          if (!r.ok) {
            setDone(false);
            return toast(r.error);
          }
          router.refresh();
        });
      }}
    >
      {M.close}
    </Button>
  );
}
