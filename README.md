# gamearound

게임 가격·플레이타임·평점·뉴스를 한 곳에서 보여주고 플랫폼별 할인 웹푸시를 보내는 서비스.
설계 근거: `docs/손전등_개발설계서.md` (MVP 범위만 구현).

## 스택

Next.js 16 App Router · TypeScript · Drizzle ORM · Neon Postgres · 자체 세션 인증(scrypt + DB 세션) · Upstash Redis · web-push · GitHub Actions 크롤러 · Vercel

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
| `pnpm e2e:auth` | 인증 E2E (dev 서버 필요, 가입→로그인→보호경로→로그아웃, e2e 계정 자동 삭제) |
| `pnpm db:generate` | 스키마 변경 → 마이그레이션 SQL 생성 |
| `pnpm db:migrate` | 마이그레이션 적용 |
| `pnpm crawl -- --source=steam [--limit=N] [--seed-top=N]` | 소스별 수집 (GitHub Actions와 동일 진입점) |

## 구조 (설계서 §2)

- `src/app` 라우트: `(public)` 홈/검색/상세/가격그래프, `(auth)` 로그인/회원가입 + Server Action, `(user)` 위시리스트/알림/설정, `(admin)` 동기화 대시보드/검수/정정, `api/*` 라우트 핸들러
- `src/server/db` 스키마·클라이언트·마이그레이션
- `src/server/services` 비즈니스 로직 (route → service → adapter/db 3계층)
- `src/server/adapters` 소스별 수집기 (가져오기만), `src/server/sync` DB 반영·매칭·알림 발송
- `scripts/crawl.ts` GitHub Actions 진입점, `.github/workflows/*.yml` 스케줄
- `src/proxy.ts` 세션 쿠키 유무로 보호 경로 리다이렉트 (Next 16에서 middleware → proxy). role은 각 layout/action에서 재검증
- `src/lib/auth` 인증 상수·문구·zod 스키마(서버/클라이언트 공유), `src/server/auth` scrypt 해시·세션·레이트리밋, `src/components/auth` 폼/헤더 메뉴/SessionProvider
- `src/lib/routes.ts` 경로 상수 + `safeNextPath`(오픈 리다이렉트 방지), `src/lib/motion.ts` 등장 스태거, `src/components/ui` 공용 버튼/입력/체크박스

## 인증 (자체 구현, SNS 로그인은 후속)

- 이메일/비밀번호 가입·로그인·로그아웃. 비밀번호는 Node 내장 `scrypt`(N=16384) 해시, 형식 `scrypt$N$r$p$salt$hash`로 알고리즘 교체 가능
- 세션: 쿠키(`sjd_session`, httpOnly/secure/lax)에 랜덤 토큰, DB `sessions`엔 sha256 해시. 30일 슬라이딩, 만료분은 daily cron이 정리
- 레이트리밋: 로그인 IP당 15분 20회·이메일당 10회, 가입 IP당 시간 5회 (Redis 없으면 경고 후 통과)
- 헤더 로그인 상태는 클라이언트 `SessionProvider`가 `/api/auth/me`로 가져온다 — 루트 레이아웃에서 `cookies()`를 읽으면 홈 풀 라우트 캐시가 깨지기 때문
- 확장 지점: `users.passwordHash`는 nullable(OAuth 전용 계정), provider 연결은 `auth_accounts` 테이블 추가로 대응

## 배포 체크리스트

1. Neon 프로젝트 생성 → `DATABASE_URL`
2. `ADMIN_EMAILS`에 관리자 이메일 등록 (가입/로그인 시 admin 승격)
3. Upstash Redis → REST URL/TOKEN
4. `pnpm dlx web-push generate-vapid-keys` → VAPID 3종
5. `CRAWL_SECRET`, `CRON_SECRET` 임의 문자열
6. Vercel 프로젝트 env 등록, `vercel.json` cron 자동 반영
7. GitHub repo Secrets에 DATABASE_URL, UPSTASH_*, CRAWL_SECRET, NEXT_PUBLIC_APP_URL, VAPID_* 등록
8. 관리자 role: `ADMIN_EMAILS` 환경변수 또는 DB `users.role` 직접 수정

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
| 크롤 주기 (설계서 §4.3 이탈) | prices 하루 3회(KST 02:10/10:10/18:10)·news 6h·meta 격일 ≈ 월 1,470분. 설계서는 prices 4h·news 1h(≈3,900분)이나 private 레포 Actions 무료 2,000분을 초과한다. 뉴스·가격 모두 시간 단위 변동이 거의 없어 주기를 늘리는 대신, prices 실행 시각을 **Steam 할인 전환 시각(KST 02:00) 직후**로 고정해 할인 감지 지연을 8시간 → 10분으로 줄였다. public 전환(Actions 무제한)은 현재 불필요 |
| 미매칭(`matched_by="none"`) 재시도 | `game_source_refs.checked_at` 기준 `NONE_RETRY_DAYS`(14일) 경과 행만 재검색 |
| HLTB 검색 UA (설계서 §10 이탈) | HLTB `/api/search/site/init` 이 봇 UA 에 403 을 주므로 **검색 경로에서만** 브라우저 UA(`HLTB_SEARCH_USER_AGENT`)를 쓴다. 게임 페이지 조회는 `CRAWLER_USER_AGENT` 유지. init 토큰에 UA 가 포함돼 init/search UA 가 같아야 함 |
| 할인 기간·행사명 | 스토어가 주는 만큼만 저장한다. Steam=`IStoreBrowseService/GetItems` 의 `active_discounts`(종료 시각 + `#discount_desc_*` 토큰 → 한국어 라벨, 모르는 토큰은 표시 안 함), Xbox=`Availability.Conditions` 시작·종료(상시 판매 센티널 9998년은 버림). PS Store·Nintendo 는 미지원 |
| HLTB 플레이타임 0 | `comp_main/plus/100` 이 전부 0 이면 "제보 없음"으로 보고 전부 null 을 정상 반환한다(에러 아님). 에러로 처리하면 해당 게임이 매 배치마다 재시도돼 sync_logs 가 계속 partial 이 된다 |
| 가격 그래프 표시 | 가격은 변동 시점만 기록되므로 차트는 마지막 기록 → 지금까지 수평으로 잇고, 진행 중 할인은 음영 + 종료선으로 표시한다. 미래 가격은 그리지 않는다 |
