"use client";
// 프로그램 노출, 사용 여부를 메뉴와 화면에 나르는 자리(2026-11-19). 판정은 lib/admin/programs, 값은 레이아웃이 DB 에서 읽어 준다.
//
// 메뉴(기둥, 바닥 띠, 더보기 시트, 메뉴 검색)는 useMenuGroups() 하나로 칸을 받는다 — 셋이 groupsFor 를 따로 부르면
// 한 곳만 거르는 일이 생긴다. 진입 막기는 ProgramGate 가 본문 자리에서 한다(MobileGate 와 같은 자리, 같은 꼴).
//
// 저장 직후 바로 바뀌어야 한다(AGENTS §6 누른 순간 바뀐다). 서버 새로 그리기를 기다리지 않고 publishProgramSettings 로 알린다:
// 같은 문서는 window 사건으로, 탭 안 문서(iframe)에서 저장했으면 바깥 기둥에 postMessage 로 보낸다.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { EmptyNote } from "@/components/empty-state";
import { groupsFor, ITEMS } from "@/components/admin/admin-nav-items";
import { useMobilePolicy } from "@/components/admin/mobile-policy";
import { inFrame, isFrameMessage, postToTop } from "@/components/admin/program-shell/frame";
import { PROGRAMS_MESSAGES as M } from "@/lib/admin/messages";
import { blockedProgramOf, isProgramShown, type ProgramSettings } from "@/lib/admin/programs";
import { ROUTES } from "@/lib/routes";
import { ProgramLink } from "@/components/admin/screen/program-link";

/** 같은 문서 안에서 저장 소식을 나르는 사건 이름 */
const LOCAL_EVENT = "admin-programs-local";
const ProgramsContext = createContext<ProgramSettings>({});

export function AdminProgramsProvider({ settings, children }: { settings: ProgramSettings; children: React.ReactNode }) {
  const [value, setValue] = useState(settings);
  // 서버가 새 값을 주면(저장 뒤 새로 그리기) 그 값으로 선다
  const [source, setSource] = useState(settings);
  if (source !== settings) {
    setSource(settings);
    setValue(settings);
  }
  useEffect(() => {
    const onLocal = (e: Event) => setValue((e as CustomEvent<ProgramSettings>).detail);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || !isFrameMessage(e.data) || e.data.type !== "admin-programs") return;
      setValue(e.data.settings);
    };
    window.addEventListener(LOCAL_EVENT, onLocal);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener(LOCAL_EVENT, onLocal);
      window.removeEventListener("message", onMessage);
    };
  }, []);
  return <ProgramsContext.Provider value={value}>{children}</ProgramsContext.Provider>;
}

/** 저장한 값을 메뉴에 바로 알린다(이 문서와, 탭 안이면 바깥 기둥) */
export function publishProgramSettings(settings: ProgramSettings) {
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: settings }));
  if (inFrame()) postToTop({ type: "admin-programs", settings });
}

export function useProgramSettings(): ProgramSettings {
  return useContext(ProgramsContext);
}

/**
 * 메뉴에 세울 상위메뉴. 휴대폰 허용 표(groupsFor)를 거친 뒤 노출, 사용을 끈 칸을 빼고, 다 빠진 상위메뉴는 제목째 걷는다.
 * 칸이 하나만 남으면 제목도 뗀다 — 상위메뉴 제목은 칸이 둘 이상일 때만 단다(admin-console-layout 규칙). 매출현황을 숨긴 통계관리처럼
 * 제목 아래 칸 하나만 서면 같은 일을 두 줄로 말하고, 펼치려고 한 번 더 눌러야 한다
 */
export function useMenuGroups(): ReturnType<typeof groupsFor> {
  const { mobile } = useMobilePolicy();
  const settings = useProgramSettings();
  return useMemo(
    () => groupsFor(mobile).map((g) => ({ ...g, items: g.items.filter((i) => isProgramShown(settings, i.href)) }))
        .filter((g) => g.items.length > 0)
        .map((g) => (g.items.length === 1 && g.title ? { ...g, title: undefined } : g)),
    [mobile, settings],
  );
}

const MENU_HREFS = ITEMS.map((i) => i.href);

/** 사용 안 함인 프로그램이면 본문 대신 안내를 세운다 */
export function ProgramGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const settings = useProgramSettings();
  if (!blockedProgramOf(pathname, MENU_HREFS, settings)) return children;
  return (
    <section className="flex flex-col gap-3 py-2">
      <EmptyNote title={M.blockedTitle}>{M.blockedBody}</EmptyNote>
      <div className="flex flex-wrap items-center gap-2">
        <ProgramLink href={ROUTES.admin} />
        <ProgramLink href={ROUTES.adminPrograms} />
      </div>
    </section>
  );
}
