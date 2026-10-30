CREATE TABLE "sheet_stars" (
	"user_id" uuid NOT NULL,
	"sheet_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sheet_stars_user_id_sheet_id_item_key_pk" PRIMARY KEY("user_id","sheet_id","item_key")
);
--> statement-breakpoint
ALTER TABLE "sheet_stars" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sheet_items" ADD COLUMN "minutes" integer;--> statement-breakpoint
ALTER TABLE "sheet_stars" ADD CONSTRAINT "sheet_stars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_stars" ADD CONSTRAINT "sheet_stars_sheet_id_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "owner can read" ON "sheet_stars" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("sheet_stars"."user_id" = (select auth.uid()));

-- DsaKaro
