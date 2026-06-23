import { pgTable, uuid, varchar, text, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: varchar("name", { length: 100 }).notNull().default('Admin'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  judul: varchar("judul", { length: 100 }).notNull(),
  deskripsi: text("deskripsi").notNull(),
  tag: varchar("tag", { length: 255 }).notNull(),
  urutan: integer("urutan").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const portfolios = pgTable("portfolios", {
  id: uuid("id").defaultRandom().primaryKey(),
  judul: varchar("judul", { length: 150 }).notNull(),
  deskripsi: text("deskripsi").notNull(),
  tag: varchar("tag", { length: 255 }).notNull(),
  gambar: text("gambar"),
  github: varchar("github", { length: 500 }),

  // Detail pengerjaan
  tanggalMulai: date("tanggal_mulai"),
  tanggalSelesai: date("tanggal_selesai"),
  workType: varchar("work_type", { length: 50 }), // Individu | Tim
  roles: text("roles").array(), // text[]: multi-select roles

  urutan: integer("urutan").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const portfolioFeatures = pgTable("portfolio_features", {
  id: uuid("id").defaultRandom().primaryKey(),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: 'cascade' }),
  fitur: varchar("fitur", { length: 255 }).notNull(),
  urutan: integer("urutan").default(0).notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: varchar("nama", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  pesan: text("pesan").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
