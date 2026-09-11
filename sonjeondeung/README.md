# 손전등 (sonjeondeung)

게임 가격·플레이타임·평점·뉴스를 한 곳에서 보여주고 플랫폼별 할인 웹푸시를 보내는 서비스.
설계 근거: `../손전등_개발설계서.md` (MVP 범위만 구현).

## 스택

Next.js 16 App Router · TypeScript · Drizzle ORM · Neon Postgres · Clerk · Upstash Redis · web-push · GitHub Actions 크롤러 · Vercel

## 로컬 실행

```bash
pnpm install
cp .env.example .env.local   # 값 채우기
pnpm db:migrate              # Neon에 마이그레이션 적용 (pg_trgm 포함)
pnpm seed                    # Steam 상위 N개 시드 (scripts/seed.ts)
pnpm dev
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | 검증 |
| `pnpm db:generate` | 스키마 변경 → 마이그레이션 SQL 생성 |
| `pnpm db:migrate` | 마이그레이션 적용 |
| `pnpm crawl -- --source=steam [--limit=N] [--seed-top=N]` | 소스별 수집 (GitHub Actions와 동일 진입점) |

## 구조 (설계서 §2)

- `src/app` 라우트: `(public)` 홈/검색/상세/가격그래프, `(user)` 위시리스트/알림/설정, `(admin)` 동기화 대시보드/검수/정정, `api/*` 라우트 핸들러
- `src/server/db` 스키마·클라이언트·마이그레이션
- `src/server/services` 비즈니스 로직 (route → service → adapter/db 3계층)
- `src/server/adapters` 소스별 수집기 (가져오기만), `src/server/sync` DB 반영·매칭·알림 발송
- `scripts/crawl.ts` GitHub Actions 진입점, `.github/workflows/*.yml` 스케줄
- `src/proxy.ts` Clerk + role 가드 (Next 16에서 middleware → proxy)

## 배포 체크리스트

1. Neon 프로젝트 생성 → `DATABASE_URL`
2. Clerk 앱 생성 → 키 3종, Webhook(`/api/webhooks/clerk`, user.created/updated/deleted) 등록
3. Upstash Redis → REST URL/TOKEN
4. `pnpm dlx web-push generate-vapid-keys` → VAPID 3종
5. `CRAWL_SECRET`, `CRON_SECRET` 임의 문자열
6. Vercel 프로젝트 env 등록, `vercel.json` cron 자동 반영
7. GitHub repo Secrets에 DATABASE_URL, UPSTASH_*, CRAWL_SECRET, NEXT_PUBLIC_APP_URL, VAPID_* 등록
8. 관리자 role: Clerk 대시보드에서 사용자 `publicMetadata.role = "admin"` 수동 부여

## 미결정 사항에 대한 현재 가정 (설계서 §11)

| 항목 | 현재 가정 |
|---|---|
| 초기 카탈로그 범위 | Steam 인기/할인 상위 N개 시드 (`--seed-top`) |
| 가격 기준 | 한국 스토어 KRW만 |
| 한글 제목 | Steam 한국어 페이지, 없으면 영문 그대로 |
| 뉴스 RSS | 어댑터 상단 상수 목록 (교체 필요) |
| 평점 우선순위 | OpenCritic 1순위, Metacritic은 스텁 |
| 플랫폼 세분화 | PS4/PS5, Switch/Switch2 분리 |
| 멀티플레이 출처 | Steam 카테고리 태그 + 관리자 정정 |
| 정정 잠금 | 관리자가 해제할 때까지 영구 잠금 |
