"use client";
// 수집 현황 소스 칸의 "가져온 게임 N건" 시트 — 마지막 기록 실행이 만진 게임과 바뀐 값.
//
// 칸 안에 펼치지 않고 시트로 띄운 이유(2026-09-30 사용자 요청): 소스가 열 칸 넘게 서는 화면이라
// 목록을 칸마다 펼치면 한 칸이 수백 줄이 되고, 정작 한눈에 볼 상태 배지와 실패 수가 밀려난다.
//
// **줄은 시트를 열 때 받는다**(2026-10-08). 앞에는 서버에서 줄을 다 그려 children 으로 넘겼다 — 열 때 기다림은
// 없었지만, 닫힌 시트 열다섯 개 몫 1,808줄을 화면을 열 때마다 그려 응답이 19.5초 걸렸다(admin-activity 머리 주석).
// 이제 셈(머리 두 줄)은 화면이 싣고, 줄만 처음 열 때 한 번 받아 둔다. 다시 열면 받은 것을 그대로 쓴다.
import Link from "next/link";
import { useState, useTransition } from "react";
import { loadSyncRunItemsAction } from "@/app/(admin)/admin/actions";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { SHEET_ROW, SHEET_ROWS } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { SYNC_MESSAGES } from "@/lib/admin/messages";
import { syncFieldLabels } from "@/lib/admin/sync-fields";
import { cn } from "@/lib/cn";
import { formatAgo } from "@/lib/format";
import { gamePath } from "@/lib/routes";
import type { RunItem, RunSummary } from "@/server/services/admin-activity";

const TAG = "rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold";

function ItemRow({ item, traced }: { item: RunItem; traced: boolean }) {
  const labels = syncFieldLabels(item.fields);
  return (
    <li className={cn(SHEET_ROW, "flex flex-col gap-1.5 py-2.5")}>
      <Link href={gamePath(item.slug)} className="min-w-0 text-[13.5px] font-semibold text-ink hover:underline">
        <Clamp>{item.title ?? item.slug}</Clamp>
      </Link>
      <div className="flex flex-wrap gap-1">
        {item.created && <span className={cn(TAG, "bg-acc-soft text-acc")}>{SYNC_MESSAGES.runItemsCreated}</span>}
        {labels.map((l) => (
          <span key={l} className={cn(TAG, "bg-surface text-ink")}>
            {l}
          </span>
        ))}
        {/* 되짚은 목록에서 칸이 비었다는 건 "모른다" 이지 "그대로" 가 아니다 — 그 말은 머리 한 줄이 한다 */}
        {!item.created && labels.length === 0 && !traced && <span className="text-[11.5px] text-dim">{SYNC_MESSAGES.runItemsNoChange}</span>}
      </div>
    </li>
  );
}

/** 아직 안 받음, 받음, 못 받음. 못 받았으면 다음에 열 때 다시 묻는다 */
type Load = { state: "idle" } | { state: "done"; items: RunItem[] } | { state: "failed" };

export function SyncRunSheet({ source, sourceName, run, now }: { source: string; sourceName: string; run: RunSummary; now: number }) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<Load>({ state: "idle" });
  const [pending, startTransition] = useTransition();

  const same = run.total - run.created - run.changed;
  const counts = [
    { label: SYNC_MESSAGES.runItemsCreated, n: run.created },
    { label: run.traced ? SYNC_MESSAGES.runItemsPriceChanged : SYNC_MESSAGES.runItemsChanged, n: run.changed },
    { label: run.traced ? SYNC_MESSAGES.runItemsPriceSame : SYNC_MESSAGES.runItemsSame, n: same },
  ];

  const openSheet = () => {
    setOpen(true);
    if (load.state === "done" || pending) return;
    startTransition(async () => {
      try {
        const res = await loadSyncRunItemsAction(source);
        setLoad(res ? { state: "done", items: res.items } : { state: "failed" });
      } catch {
        setLoad({ state: "failed" });
      }
    });
  };

  return (
    <>
      <button type="button" className={buttonClass({ variant: "secondary", size: "sm", className: "w-fit" })} onClick={openSheet}>
        {SYNC_MESSAGES.runItemsOpen(run.total)}
      </button>
      <Sheet title={SYNC_MESSAGES.runItemsTitle(sourceName)} size="wide" open={open} onOpenChange={setOpen}>
        <p className="pt-2 text-[12.5px] leading-[1.6] text-mut">
          {SYNC_MESSAGES.runItemsLead(formatAgo(run.startedAt, now), run.processed, run.total)}
        </p>
        {run.traced && <p className="mt-1.5 text-[12px] leading-[1.6] text-dim">{SYNC_MESSAGES.runItemsTraced}</p>}
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-mut">
          {counts.map((c) => (
            <span key={c.label}>
              {c.label} <b className="font-bold tabular-nums text-ink">{c.n.toLocaleString("ko-KR")}</b>
            </span>
          ))}
        </p>
        {load.state === "done" ? (
          <ul className={cn(SHEET_ROWS, "mt-3")}>
            {load.items.map((item) => (
              <ItemRow key={item.slug} item={item} traced={run.traced === true} />
            ))}
          </ul>
        ) : (
          <p role="status" className="mt-4 rounded-xl bg-surface-2 px-4 py-5 text-[13px] text-mut">
            {load.state === "failed" && !pending ? SYNC_MESSAGES.runItemsLoadFailed : SYNC_MESSAGES.runItemsLoading}
          </p>
        )}
      </Sheet>
    </>
  );
}
