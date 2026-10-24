DROP INDEX "colleges_name_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "colleges_name_lower_uq" ON "colleges" USING btree (lower("name"));