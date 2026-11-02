// 웹 알림(알림함 한 줄) 쌓기(2026-11-02, 사용자 "웹 알림도 추가"). 알림템플릿관리의 웹 알림 템플릿으로 문구를 짓고 notifications 에 넣는다.
//
// "server-only" 를 걸지 않는다 — 가격, 찜, 출시 알림은 수집 실행(Actions 의 tsx)이 쌓는다(server/notify/mail 과 같은 사정).
// 발송 이력을 notify_sends 에 따로 쓰지 않는다: 가격, 찜 알림은 수집 회차마다 수십, 수백 줄이라 같은 내용을 두 표에 쓰면 Neon 쓰기가 갑절이 된다.
// notifications 가 곧 기록이고(template_code 칸), 알림발송관리가 그 표를 같이 읽는다(services/notify-admin).
//
// 템플릿은 1분 동안 프로세스에 들고 있는다. 출시, 찜 알림은 한 회차에 수백 통을 짓는데 통마다 템플릿을 물으면 Neon 왕복이 그만큼 줄을 선다.
// 관리자가 문구를 고치면 늦어도 1분 뒤부터 새 문구로 쌓인다.
import { eq } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";
import { renderWebNotice } from "@/lib/notify/web";
import { getDb } from "@/server/db/client";
import { notifyTemplates } from "@/server/db/schema";

/** 템플릿을 들고 있는 시간(ms). 관리자 저장이 반영되는 늦음의 상한이다 */
const CACHE_MS = 60_000;

type WebTemplate = { body: string; active: boolean };
let cache: { at: number; map: Map<string, WebTemplate> } | null = null;

async function webTemplates(): Promise<Map<string, WebTemplate>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.map;
  try {
    const rows = await getDb().select({ code: notifyTemplates.code, body: notifyTemplates.body, active: notifyTemplates.active }).from(notifyTemplates).where(eq(notifyTemplates.medium, "web"));
    cache = { at: Date.now(), map: new Map(rows.map((r) => [r.code, { body: r.body, active: r.active }])) };
  } catch (e) {
    // 템플릿 표를 못 읽어도 알림은 쌓인다(기본 문구). 다음 부름에 다시 읽게 캐시를 비워 둔다
    console.error(`[notify] 웹 알림 템플릿 읽기 실패: ${errorMessage(e)}`);
    return cache?.map ?? new Map();
  }
  return cache.map;
}

export type WebNotice = { body: string; templateCode: string | null };

/**
 * 템플릿으로 한 줄을 짓는다. 템플릿이 없으면 코드의 기본 문구(fallback, templateCode 없음),
 * 미사용이면 null — 알림을 쌓지 않는다(알림템플릿관리에서 끄는 것이 곧 그 알림을 끄는 길이다, 텔레그램 사건 알림과 같다)
 */
export async function webNotice(code: string, vars: Readonly<Record<string, string>>, fallback: string): Promise<WebNotice | null> {
  const tpl = (await webTemplates()).get(code);
  if (!tpl) return { body: fallback, templateCode: null };
  if (!tpl.active) return null;
  const body = renderWebNotice(tpl.body, vars);
  return { body: body || fallback, templateCode: code };
}

/** 관리자가 템플릿을 저장한 프로세스는 바로 새 문구를 쓴다(다른 인스턴스는 CACHE_MS 안에) */
export function forgetWebTemplates(): void {
  cache = null;
}
