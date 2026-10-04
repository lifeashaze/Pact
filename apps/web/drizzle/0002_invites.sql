CREATE TABLE "invites" (
	"email" text PRIMARY KEY NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"emailed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_profiles_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;