// 내 게임 등록 폼(indie/post-form)의 한 단계 — 번호 동그라미, 제목, 한 줄 도움말, 그 아래 칸들.
//
// 2026-10-27(사용자: "칸들은 다 좋은데 입력하기 불편할 것 같다"). 칸 열네 개가 한 기둥에 같은 간격으로 이어져
// 어디까지 왔는지, 무엇이 한 묶음인지 안 보였다. 넷으로 묶고(기본 정보, 분류, 소개와 그림, 링크) 번호를 단다 —
// 번호가 있으면 "이제 반쯤 왔다" 가 보이고, 묶음이 있으면 한 번에 읽을 칸이 서넛으로 준다.
// 서버, 클라이언트 양쪽에서 부르므로 "use client" 를 붙이지 않는다.
export function FormStep({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`form-step-${n}`} className="flex flex-col gap-4 border-t border-line-soft pt-6 first-of-type:border-t-0 first-of-type:pt-0">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-acc text-[14px] font-extrabold text-on-ink shadow-[0_4px_10px_-4px_var(--acc)]">
          {n}
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id={`form-step-${n}`} className="text-[17px] font-extrabold tracking-[-0.03em] text-ink">
            {title}
          </h2>
          {hint && <p className="mt-0.5 text-[12.5px] text-dim">{hint}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-5 sm:pl-11">{children}</div>
    </section>
  );
}
