ALTER TABLE "games" ADD COLUMN "portrait_url" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "title_en_norm" text GENERATED ALWAYS AS (lower(regexp_replace(title_en, '[^[:alnum:]]+', '', 'g'))) STORED;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "title_ko_norm" text GENERATED ALWAYS AS (lower(regexp_replace(coalesce(title_ko, ''), '[^[:alnum:]]+', '', 'g'))) STORED;--> statement-breakpoint
-- 정규화 제목 trigram 인덱스 — /search 와 /games 가 둘 다 이 컬럼만 본다
CREATE INDEX IF NOT EXISTS "games_title_en_norm_trgm_idx" ON "games" USING gin ("title_en_norm" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "games_title_ko_norm_trgm_idx" ON "games" USING gin ("title_ko_norm" gin_trgm_ops);
