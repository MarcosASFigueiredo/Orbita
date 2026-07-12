CREATE TABLE "npcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"papel" text DEFAULT '' NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"faccao" text DEFAULT '' NOT NULL,
	"local" text DEFAULT '' NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
-- Keep npcs.updated_at fresh on UPDATE, matching the other mutable tables
-- (set_updated_at() is defined in 0001_updated_at_triggers.sql).
CREATE TRIGGER npcs_set_updated_at
  BEFORE UPDATE ON npcs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();