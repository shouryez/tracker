CREATE TABLE "video_watches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sheet_id" uuid,
	"item_key" text,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"watched_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_watches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "video_watches" ADD CONSTRAINT "video_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_watches" ADD CONSTRAINT "video_watches_sheet_id_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."sheets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_watches_user_idx" ON "video_watches" USING btree ("user_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "owner can read" ON "video_watches" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("video_watches"."user_id" = (select auth.uid()));