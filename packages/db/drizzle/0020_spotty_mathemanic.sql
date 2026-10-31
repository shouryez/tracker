CREATE TABLE "tuf_push_queue" (
	"user_id" uuid NOT NULL,
	"sheet_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"done" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tuf_push_queue_user_id_sheet_id_item_key_pk" PRIMARY KEY("user_id","sheet_id","item_key")
);
--> statement-breakpoint
ALTER TABLE "tuf_push_queue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tuf_push_queue" ADD CONSTRAINT "tuf_push_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuf_push_queue" ADD CONSTRAINT "tuf_push_queue_sheet_id_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "owner can read" ON "tuf_push_queue" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tuf_push_queue"."user_id" = (select auth.uid()));