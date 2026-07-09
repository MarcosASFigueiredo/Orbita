-- Custom SQL migration file, put your code below! --

-- Keep updated_at fresh on every UPDATE, at the DB layer. The SSE live-sync
-- feed (step d) detects changes by polling max(updated_at) across the shared
-- tracks, so this must fire regardless of whether app code remembers to set it.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER characters_set_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER legacy_entries_set_updated_at
  BEFORE UPDATE ON legacy_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER six_suns_set_updated_at
  BEFORE UPDATE ON six_suns_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
