"use client";
// 광고 카드 성과 세기(2026-10-27, 기획서 4.4) — 감싼 카드가 화면에 절반 넘게 보이면 "봤다", 누르면 "눌렀다" 를 보낸다(api/promo/track).
//
// 같은 사람의 같은 날 같은 광고는 한 번만 보낸다. 거르기를 브라우저에 두는 이유: 로그인하지 않은 사람이 대부분이라 서버가 사람을 알아볼 길이 없다.
// 날짜는 한국 날짜다(서버 하루 칸과 같은 경계). 저장소를 못 쓰는 창(사생활 보호 창 등)에서는 거르지 못하고 그대로 보낸다 — 숫자가 조금 늘 뿐 화면은 멀쩡하다.
// 보이는 신호는 잠깐 모았다가 한 번에 보낸다: 주목할 게임 세 장이 한꺼번에 보이면 요청도 한 번이다.
// 누름은 바로 보낸다 — 카드를 누르면 곧 화면이 바뀌고, sendBeacon 은 화면이 바뀌어도 끝까지 간다.
import { useEffect, useRef, type ReactNode } from "react";
import { ROUTES } from "@/lib/routes";

/** 카드가 이만큼 보여야 "봤다" 로 친다. 한쪽 귀퉁이만 스친 것은 본 것이 아니다 */
const SEEN_RATIO = 0.5;
/** 보인 신호를 모으는 시간. 한 화면의 카드들이 같은 틀에서 보이기 시작한다 */
const FLUSH_DELAY_MS = 300;
const STORE_KEY = "ad-track";

type Sent = { day: string; seen: string[]; clicked: string[] };

function kstDay(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function readSent(day: string): Sent {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as Sent | null;
    if (raw && raw.day === day && Array.isArray(raw.seen) && Array.isArray(raw.clicked)) return raw;
  } catch {
    // 저장소를 못 쓰면 거르지 않는다(머리 주석)
  }
  return { day, seen: [], clicked: [] };
}

/** 오늘 처음이면 적고 true. 이미 보냈으면 false */
function markOnce(kind: "seen" | "clicked", id: string): boolean {
  const sent = readSent(kstDay());
  if (sent[kind].includes(id)) return false;
  sent[kind].push(id);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(sent));
  } catch {
    // 저장소를 못 쓰면 거르지 않는다(머리 주석)
  }
  return true;
}

function send(body: { seen: string[]; clicked: string[] }) {
  const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
  try {
    if (!navigator.sendBeacon?.(ROUTES.apiAdTrack, blob)) void fetch(ROUTES.apiAdTrack, { method: "POST", body: blob, keepalive: true }).catch(() => {});
  } catch {
    // 세기 실패는 화면과 무관하다
  }
}

let pending: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function queueSeen(id: string) {
  if (!markOnce("seen", id)) return;
  pending.push(id);
  timer ??= setTimeout(() => {
    send({ seen: pending, clicked: [] });
    pending = [];
    timer = null;
  }, FLUSH_DELAY_MS);
}

export function AdTrack({ boostId, className, children }: { boostId: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        queueSeen(boostId);
        io.disconnect();
      },
      { threshold: SEEN_RATIO },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [boostId]);

  return (
    <div
      ref={ref}
      className={className}
      onClickCapture={() => {
        if (markOnce("clicked", boostId)) send({ seen: [], clicked: [boostId] });
      }}
    >
      {children}
    </div>
  );
}
