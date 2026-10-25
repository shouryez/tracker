CREATE TYPE "public"."sheet_item_kind" AS ENUM('practice', 'learning');--> statement-breakpoint
CREATE TABLE "sheet_marks" (
	"user_id" uuid NOT NULL,
	"sheet_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sheet_marks_user_id_sheet_id_item_key_pk" PRIMARY KEY("user_id","sheet_id","item_key")
);
--> statement-breakpoint
ALTER TABLE "sheet_marks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_sheets" (
	"user_id" uuid NOT NULL,
	"sheet_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sheets_user_id_sheet_id_pk" PRIMARY KEY("user_id","sheet_id")
);
--> statement-breakpoint
ALTER TABLE "user_sheets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sheet_items" DROP CONSTRAINT "sheet_items_sheet_id_position_pk";--> statement-breakpoint
ALTER TABLE "sheets" ALTER COLUMN "version" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sheets" ALTER COLUMN "version" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sheets" ALTER COLUMN "version" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sheet_items" ADD COLUMN "item_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sheet_items" ADD COLUMN "step" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sheet_items" ADD COLUMN "kind" "sheet_item_kind" DEFAULT 'practice' NOT NULL;--> statement-breakpoint
ALTER TABLE "sheet_items" ADD COLUMN "tier" text;--> statement-breakpoint
ALTER TABLE "sheet_items" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "sheet_items" ADD CONSTRAINT "sheet_items_sheet_id_item_key_pk" PRIMARY KEY("sheet_id","item_key");--> statement-breakpoint
ALTER TABLE "sheets" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sheet_marks" ADD CONSTRAINT "sheet_marks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_marks" ADD CONSTRAINT "sheet_marks_sheet_id_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sheets" ADD CONSTRAINT "user_sheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sheets" ADD CONSTRAINT "user_sheets_sheet_id_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sheet_items_sheet_position_idx" ON "sheet_items" USING btree ("sheet_id","position");--> statement-breakpoint
CREATE POLICY "owner can read" ON "sheet_marks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("sheet_marks"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "user_sheets" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_sheets"."user_id" = (select auth.uid()));