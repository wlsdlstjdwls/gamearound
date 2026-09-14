-- 검색용 pg_trgm 확장 + trigram GIN 인덱스 (설계서 §5.1 /search: ILIKE + pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "games_title_en_trgm_idx" ON "games" USING gin ("title_en" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "games_title_ko_trgm_idx" ON "games" USING gin ("title_ko" gin_trgm_ops);
