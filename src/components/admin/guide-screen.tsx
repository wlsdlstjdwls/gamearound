"use client";
// 서비스안내서조회 화면 본문(2026-10-30). 기획 운영팀용 안내서를 관리자 판 안 iframe 으로 연다 — 문서는 제 탭, 목차, 그림 크게 보기를 가진
// 완성된 HTML 이라 화면 부품으로 다시 짜지 않고 그대로 끼운다. 판 높이는 그리드와 같은 자(useFitHeight)로 화면 바닥까지 맞춘다.
// 툴바 조회(F8)는 문서를 다시 받는다(새로 올린 판을 보려고). 고칠 것이 없는 화면이라 나머지 단추는 흐리다.
import { useRef, useState } from "react";
import { useFitHeight } from "@/components/admin/screen/data-grid/fit";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { useAdminStatus } from "@/components/admin/screen/status";
import { EmptyNote } from "@/components/empty-state";
import { buttonClass } from "@/components/ui/button";
import { ADMIN_NAV, GUIDE_MESSAGES as M } from "@/lib/admin/messages";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { useMobilePolicy } from "@/components/admin/mobile-policy";

export function GuideScreen({ uploadedAt }: { uploadedAt: string | null }) {
  const { say } = useAdminStatus();
  const frameRef = useRef<HTMLIFrameElement>(null);
  // 휴대폰은 판 바닥에 맞추지 않고 화면 높이의 대부분을 준다. 바닥 탭 띠와 상태줄을 빼고 나면 맞춘 높이가 문서 첫 문단도 못 담았다(2026-10-30 실측 390x844).
  // 문서 안에서 굴리고, 바깥 화면은 조금만 굴린다
  const { mobile } = useMobilePolicy();
  const fit = useFitHeight(frameRef, uploadedAt !== null && !mobile);
  // 조회를 누를 때마다 바꿔 iframe 을 새로 받게 한다
  const [version, setVersion] = useState(0);

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.guide}
        note={uploadedAt ? M.uploadedAt(formatDateTime(uploadedAt)) : undefined}
        actions={
          uploadedAt ? (
            <a href={ROUTES.apiAdminGuide} target="_blank" rel="noopener" className={buttonClass({ variant: "secondary", size: "sm" })}>
              {M.openNew}
              <span className="sr-only"> {M.newWindow}</span>
            </a>
          ) : undefined
        }
        tools={{
          retrieve: () => {
            setVersion((v) => v + 1);
            say(M.reloaded, "info");
          },
        }}
      />
      {uploadedAt ? (
        <iframe
          key={version}
          ref={frameRef}
          src={ROUTES.apiAdminGuide}
          title={M.frameTitle}
          className="block w-full rounded-xl border border-line bg-surface"
          style={mobile ? { height: "calc(100svh - var(--header-h) - 140px)" } : fit ? { height: fit.px } : undefined}
        />
      ) : (
        <EmptyNote title={M.empty}>{M.emptyHint}</EmptyNote>
      )}
    </>
  );
}
