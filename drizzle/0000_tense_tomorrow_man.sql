CREATE TYPE "public"."reimbursement_status" AS ENUM('PENDENTE', 'VERIFICADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'RECUSADO');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_id" integer NOT NULL,
	"blob_url" text NOT NULL,
	"pathname" text NOT NULL,
	"content_type" varchar(120),
	"size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"reimbursement_id" integer NOT NULL,
	"supplier_name" varchar(255) NOT NULL,
	"fiscal_doc_number" varchar(120) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimbursements" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_name" varchar(255) NOT NULL,
	"expense_date" date NOT NULL,
	"department_id" integer NOT NULL,
	"expense_type_id" integer NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payee_name" varchar(255) NOT NULL,
	"payment_details" text NOT NULL,
	"status" "reimbursement_status" DEFAULT 'PENDENTE' NOT NULL,
	"status_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"reimbursement_id" integer NOT NULL,
	"from_status" "reimbursement_status",
	"to_status" "reimbursement_status" NOT NULL,
	"note" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "note_attachments" ADD CONSTRAINT "note_attachments_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_reimbursement_id_reimbursements_id_fk" FOREIGN KEY ("reimbursement_id") REFERENCES "public"."reimbursements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_expense_type_id_expense_types_id_fk" FOREIGN KEY ("expense_type_id") REFERENCES "public"."expense_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_reimbursement_id_reimbursements_id_fk" FOREIGN KEY ("reimbursement_id") REFERENCES "public"."reimbursements"("id") ON DELETE cascade ON UPDATE no action;