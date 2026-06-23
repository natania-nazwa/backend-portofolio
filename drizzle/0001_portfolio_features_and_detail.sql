-- Migration 0001

-- Tambah kolom detail pengerjaan ke portfolios
ALTER TABLE "portfolios"
ADD COLUMN IF NOT EXISTS "tanggal_mulai" date,
ADD COLUMN IF NOT EXISTS "tanggal_selesai" date,
ADD COLUMN IF NOT EXISTS "work_type" varchar(50),
ADD COLUMN IF NOT EXISTS "roles" text[];

-- Buat tabel fitur project
CREATE TABLE IF NOT EXISTS "portfolio_features" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "portfolio_id" uuid NOT NULL,
  "fitur" varchar(255) NOT NULL,
  "urutan" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "portfolio_features_portfolio_id_fk" FOREIGN KEY ("portfolio_id")
    REFERENCES "public"."portfolios"("id")
    ON DELETE cascade
);

