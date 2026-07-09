CREATE TYPE "public"."app_role" AS ENUM('gm', 'player');--> statement-breakpoint
CREATE TYPE "public"."legacy_status" AS ENUM('secured', 'threatened', 'lost');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "character_gm_notes" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"atrito" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"owner_user_id" text,
	"nome" text DEFAULT '' NOT NULL,
	"ocupacao" text DEFAULT '' NOT NULL,
	"epigrafe" text DEFAULT '' NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"vinculo" text DEFAULT '' NOT NULL,
	"gancho" text DEFAULT '' NOT NULL,
	"medo" text DEFAULT '' NOT NULL,
	"quer_do_grupo" text DEFAULT '' NOT NULL,
	"teme_perder" text DEFAULT '' NOT NULL,
	"insight" smallint DEFAULT 0 NOT NULL,
	"insight_locked_at" timestamp with time zone,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_slug_unique" UNIQUE("slug"),
	CONSTRAINT "characters_insight_range" CHECK ("characters"."insight" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "invited_users" (
	"email" text PRIMARY KEY NOT NULL,
	"role" "app_role" DEFAULT 'player' NOT NULL,
	"character_slug" text,
	"display_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"texto" text DEFAULT '' NOT NULL,
	"status" "legacy_status" DEFAULT 'secured' NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "six_suns_state" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"suns" boolean[] DEFAULT ARRAY[true, true, true, true, true, true] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "six_suns_singleton" CHECK ("six_suns_state"."id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"role" "app_role" DEFAULT 'player' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_gm_notes" ADD CONSTRAINT "character_gm_notes_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;