CREATE TABLE "game_aliases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_aliases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"alias_norm" text GENERATED ALWAYS AS (lower(regexp_replace(alias, '[^[:alnum:]]+', '', 'g'))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_aliases" ADD CONSTRAINT "game_aliases_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_aliases_game_norm_uq" ON "game_aliases" USING btree ("game_id","alias_norm");--> statement-breakpoint
-- 오타 허용 검색(similarity)용. drizzle-kit 이 gin_trgm_ops 를 못 내서 손으로 붙인다(0005 와 같은 방식)
CREATE INDEX IF NOT EXISTS "game_aliases_norm_trgm_idx" ON "game_aliases" USING gin ("alias_norm" gin_trgm_ops);
