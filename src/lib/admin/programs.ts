// 관리자 프로그램(메뉴 칸) 노출, 사용 여부 판정(2026-11-19). 메뉴(admin-nav-items), 진입 막기(program-policy), 프로그램관리 화면이 같이 쓴다.
// 순수 함수만 둔다 — 메뉴 목록은 "use client" 파일(admin-nav-items)에 있어서 여기서 가져오지 않고 주소 목록을 받는다.
//
// 끌 수 없는 프로그램(LOCKED_PROGRAMS): 대시보드는 막힌 화면의 안내가 돌아갈 자리이고, 프로그램관리는 끈 것을 다시 켜는 자리다.
// 둘 중 하나라도 꺼지면 관리자가 화면 안에서 되살릴 길이 없어진다. 저장 액션도 같은 목록으로 거른다.
import { z } from "zod";
import { ROUTES } from "@/lib/routes";

export type ProgramSetting = { visible: boolean; active: boolean };
/** 주소 -> 덮어쓴 값. 줄이 없는 주소는 둘 다 켜짐이다 */
export type ProgramSettings = Readonly<Record<string, ProgramSetting>>;

export const DEFAULT_PROGRAM_SETTING: ProgramSetting = { visible: true, active: true };

export const LOCKED_PROGRAMS: readonly string[] = [ROUTES.admin, ROUTES.adminPrograms];

export const isLockedProgram = (href: string) => LOCKED_PROGRAMS.includes(href);

export function settingOf(settings: ProgramSettings, href: string): ProgramSetting {
  if (isLockedProgram(href)) return DEFAULT_PROGRAM_SETTING;
  return settings[href] ?? DEFAULT_PROGRAM_SETTING;
}

/** 메뉴에 세우나. 사용 안 함이면 노출 값과 상관없이 뺀다 — 눌러서 막힌 안내를 보게 하느니 처음부터 안 보이는 편이 낫다 */
export function isProgramShown(settings: ProgramSettings, href: string): boolean {
  const s = settingOf(settings, href);
  return s.visible && s.active;
}

/** 주소가 이 메뉴 주소(또는 그 아래)인가. 대시보드만 정확히 일치로 본다(admin-nav-items 의 isActive 와 같은 규칙) */
function under(pathname: string, href: string): boolean {
  return href === ROUTES.admin ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** 이 주소를 막는 프로그램 주소. 가장 긴 메뉴 주소가 이긴다. 막지 않으면 null */
export function blockedProgramOf(pathname: string, hrefs: readonly string[], settings: ProgramSettings): string | null {
  let best: string | null = null;
  for (const href of hrefs) if (under(pathname, href) && (best === null || href.length > best.length)) best = href;
  return best !== null && !settingOf(settings, best).active ? best : null;
}

/** 저장 입력. 화면과 액션이 같은 스키마를 쓴다(AGENTS §2) */
export const programSettingsInputSchema = z
  .array(
    z.object({
      href: z.string().startsWith("/").max(200),
      visible: z.boolean(),
      active: z.boolean(),
    }),
  )
  .max(200)
  .refine((rows) => rows.every((r) => !isLockedProgram(r.href)), { message: "locked" })
  .refine((rows) => new Set(rows.map((r) => r.href)).size === rows.length, { message: "duplicate" });

export type ProgramSettingInput = z.infer<typeof programSettingsInputSchema>[number];
