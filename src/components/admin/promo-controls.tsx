"use client";
// 유료 노출 걸기 폼과 회수 단추(/admin/promotions).
// 자리를 고르면 대상 목록이 그 자리의 공개 글로 바뀐다(인디 글 또는 홍보 글). 걸면 서버가 목록을 다시 그린다.
// 회수는 누른 순간 표시가 먼저 바뀌고 실패하면 되돌린다(AGENTS §6, components/admin/content-moderation 과 같은 틀).
import { useState, useTransition } from "react";
import { grantBoostAction, revokeBoostAction } from "@/app/(admin)/admin/promotions/actions";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { BOOST_DAY_OPTIONS, PROMO_SLOTS } from "@/lib/promo/boost";
import { PROMO_MESSAGES as M, PROMO_SLOT_LABEL } from "@/lib/promo/messages";
import { BOOST_NOTE_MAX } from "@/lib/promo/schemas";
import type { PromoSlot } from "@/server/db/schema";

type Candidate = { id: string; title: string };

export function PromoGrantForm({ candidates }: { candidates: Record<PromoSlot, Candidate[]> }) {
  const toast = useToast();
  const [slot, setSlot] = useState<PromoSlot>(PROMO_SLOTS[0]);
  const [targetId, setTargetId] = useState("");
  const [days, setDays] = useState(String(BOOST_DAY_OPTIONS[0]));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const list = candidates[slot];

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await grantBoostAction({ slot, targetId, days: Number(days), note }).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) return setError(r.error);
      setTargetId("");
      setNote("");
      toast(M.granted);
    });

  return (
    <form
      className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_110px] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <FormSelect
        name="slot"
        label={M.slot}
        size="md"
        value={slot}
        onChange={(v) => {
          setSlot(v as PromoSlot);
          setTargetId("");
        }}
        options={PROMO_SLOTS.map((s) => ({ value: s, label: PROMO_SLOT_LABEL[s] }))}
      />
      <FormSelect
        name="targetId"
        label={M.target}
        size="md"
        value={targetId}
        onChange={setTargetId}
        disabled={list.length === 0}
        options={[{ value: "", label: list.length ? M.targetPlaceholder : M.noCandidates }, ...list.map((c) => ({ value: c.id, label: c.title }))]}
      />
      <FormSelect name="days" label={M.days} size="md" value={days} onChange={setDays} options={BOOST_DAY_OPTIONS.map((d) => ({ value: String(d), label: M.daysOption(d) }))} />
      <TextField label={M.note} placeholder={M.notePlaceholder} value={note} maxLength={BOOST_NOTE_MAX} onChange={(e) => setNote(e.target.value)} wrapperClassName="sm:col-span-2" error={error ?? undefined} />
      <Button type="submit" size="md" loading={pending} disabled={!targetId}>
        {M.grant}
      </Button>
    </form>
  );
}

export function PromoRevokeButton({ id }: { id: string }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  const [, start] = useTransition();
  if (done) return <span className="text-[12.5px] text-dim">{M.revoked}</span>;
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() =>
        start(async () => {
          setDone(true);
          const r = await revokeBoostAction(id).catch(() => ({ ok: false as const, error: M.failed }));
          if (!r.ok) {
            setDone(false);
            toast(r.error);
          }
        })
      }
    >
      {M.revoke}
    </Button>
  );
}
