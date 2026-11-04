"use client";
// 관리자 화면 안의 없는 주소(404), 오류 안내(2026-11-04, 사용자 "관리자 페이지 404, 오류가 회원 화면과 같게 뜬다, 다르게").
//
// 회원 안내(ui/status-panel)와 다른 점:
//  - 큰 손전등 그림 대신 백오피스 시스템 메시지 꼴(아이콘 칸 + 코드 딱지 + 제목, 본문) — 관리자 판 안에 서고 왼쪽 메뉴는 그대로다.
//  - 다음 행동이 "검색, 홈" 이 아니라 "다시 조회, 이전 화면, 대시보드" 다. 대시보드로 가는 길은 관리 화면 이동 단추(ProgramLink) 하나로.
//  - 개발 담당에게 넘길 단서(요청 주소, 오류 번호, 발생 일시)를 표로 보이고 한 번에 복사한다.
// 쓰는 곳: app/(admin)/admin/not-found.tsx, app/(admin)/error.tsx.
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircleIcon, SearchIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/button";
import { ProgramLink } from "@/components/admin/screen/program-link";
import { useAdminStatus } from "@/components/admin/screen/status";
import { ADMIN_FAULT_MESSAGES as M } from "@/lib/admin/messages";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/cn";

type Props = { kind: "not-found" } | { kind: "error"; digest?: string; onRetry: () => void };

export function AdminFault(props: Props) {
  const pathname = usePathname();
  const { say } = useAdminStatus();
  // 오류는 클라이언트에서만 그려진다(error 바운더리) — 시각을 첫 렌더에 박아도 서버와 어긋날 일이 없다
  const [at] = useState(() => new Date());
  const error = props.kind === "error";
  const Icon = error ? AlertCircleIcon : SearchIcon;
  const rows: Array<[string, string]> = [[M.pathLabel, pathname]];
  if (error) {
    if (props.digest) rows.push([M.digestLabel, props.digest]);
    rows.push([M.timeLabel, formatDateTime(at)]);
  }
  const copy = () => {
    const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    void navigator.clipboard?.writeText(text).then(() => say(M.copied, "ok"), () => undefined);
  };

  return (
    <section role={error ? "alert" : "status"} className="enter-item mx-auto flex w-full max-w-[560px] flex-col gap-4 py-10 sm:py-16">
      <div className="flex items-start gap-4">
        <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", error ? "bg-danger-soft text-danger" : "bg-surface-2 text-mut")}>
          <Icon size={24} />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-dim">
            {M.kind}
            <span className={cn("rounded-[6px] px-1.5 py-0.5 font-mono text-[11.5px] font-bold", error ? "bg-danger-soft text-danger" : "bg-surface-3 text-mut")}>
              {error ? M.errorCode : M.notFoundCode}
            </span>
          </p>
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-ink">{error ? M.errorTitle : M.notFoundTitle}</h2>
          <p className="text-[13.5px] leading-[1.7] text-mut">{error ? M.errorBody : M.notFoundBody}</p>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-lg border border-line bg-surface-2 px-4 py-3 text-[12.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-dim">{k}</dt>
            <dd className="break-all font-mono text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        {error && (
          <button type="button" onClick={props.onRetry} className={buttonClass({ size: "sm" })}>
            {M.retry}
          </button>
        )}
        <button type="button" onClick={() => history.back()} className={buttonClass({ variant: "secondary", size: "sm" })}>
          {M.back}
        </button>
        {error && (
          <button type="button" onClick={copy} className={buttonClass({ variant: "ghost", size: "sm" })}>
            {M.copy}
          </button>
        )}
        <ProgramLink href={ROUTES.admin} tip={M.dashboardTip} className="ml-auto" />
      </div>
    </section>
  );
}
