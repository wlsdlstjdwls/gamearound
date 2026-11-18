-- 라운지 새 갈래 둘(2026-11-18 사용자 시안 C 확정): 인원 모집(recruit), 개발 팁(tip). 기획서 v2 "인디 개발자 커뮤니티: 개발 팁, 인원 모집, 출시 홍보".
-- 값만 더한다 — 기존 행, 인덱스는 그대로다. 적용 전에도 화면은 깨지지 않는다(services/community/columns 의 categoryIn 이 글자로 견준다).
ALTER TYPE "public"."post_category" ADD VALUE IF NOT EXISTS 'recruit';--> statement-breakpoint
ALTER TYPE "public"."post_category" ADD VALUE IF NOT EXISTS 'tip';
