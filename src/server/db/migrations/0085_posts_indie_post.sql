ALTER TABLE "posts" ADD COLUMN "indie_post_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_indie_post_id_indie_posts_id_fk" FOREIGN KEY ("indie_post_id") REFERENCES "public"."indie_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_indie_post_idx" ON "posts" USING btree ("indie_post_id");