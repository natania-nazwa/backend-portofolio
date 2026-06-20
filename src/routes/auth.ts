import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sql from "../db/db"; // ← ini postgres library
import { requireAuth } from "../middleware/auth";

const auth = new Hono();

// POST /api/auth/login
auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(
      {
        success: false,
        message: "Body tidak valid.",
      },
      400
    );
  }

  const schema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(1, "Password wajib diisi"),
  });

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0].message,
      },
      400
    );
  }

  const { email, password } = parsed.data;

  try {
    console.log("=================================");
    console.log("LOGIN ATTEMPT:", email);

    const semuaAdmin = await sql`
      SELECT id, email
      FROM admins
    `;

    console.log("SEMUA ADMIN:", semuaAdmin);

    const admins = await sql`
      SELECT id, email, password, name
      FROM admins
      WHERE email = ${email}
    `;

    console.log("ADMIN FOUND:", admins.length > 0 ? "YES" : "NO");

    if (admins.length === 0) {
      return c.json(
        {
          success: false,
          message: "Email atau password salah.",
        },
        401
      );
    }

    const admin = admins[0];

    console.log("ADMIN DATA:", {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    });

    const isValid = await bcrypt.compare(
      password,
      admin.password
    );

    console.log("PASSWORD VALID:", isValid);

    if (!isValid) {
      return c.json(
        {
          success: false,
          message: "Email atau password salah.",
        },
        401
      );
    }

    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await sql`
      DELETE FROM sessions
      WHERE admin_id = ${admin.id}
    `;

    await sql`
      INSERT INTO sessions (
        admin_id,
        token,
        expires_at
      )
      VALUES (
        ${admin.id},
        ${token},
        ${expiresAt}
      )
    `;

    console.log("LOGIN SUCCESS");
    console.log("=================================");

    return c.json({
      success: true,
      message: "Login berhasil!",
      data: {
        token,
        expires_at: expiresAt,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return c.json(
      {
        success: false,
        message: "Server error.",
      },
      500
    );
  }
});

// Setup endpoint - SEMENTARA, HAPUS SETELAH BERHASIL
auth.post("/setup", async (c) => {
  try {
    // Hapus semua tabel kalau ada
    await sql`DROP TABLE IF EXISTS contact_messages, sessions, portfolios, skills, admins CASCADE`;
    
    // Buat tabel admins
    await sql`
      CREATE TABLE admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name VARCHAR(100) NOT NULL DEFAULT 'Admin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    
    // Buat tabel sessions
    await sql`
      CREATE TABLE sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    
    // Buat tabel skills
    await sql`
      CREATE TABLE skills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        judul VARCHAR(100) NOT NULL,
        deskripsi TEXT NOT NULL,
        tag VARCHAR(255) NOT NULL,
        urutan INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    
    // Buat tabel portfolios
    await sql`
      CREATE TABLE portfolios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        judul VARCHAR(150) NOT NULL,
        deskripsi TEXT NOT NULL,
        tag VARCHAR(255) NOT NULL,
        gambar TEXT,
        github VARCHAR(500),
        urutan INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    
    // Buat tabel contact_messages
    await sql`
      CREATE TABLE contact_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nama VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        pesan TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    
    // Insert admin dengan email nazwanasyahrani@gmail.com
    const hashedPassword = await bcrypt.hash("300529", 10);
    
    await sql`
      INSERT INTO admins (email, password, name)
      VALUES ('nazwanasyahrani@gmail.com', ${hashedPassword}, 'Natania Admin')
    `;
    
    
    return c.json({ 
      success: true, 
      message: "Database setup complete!",
      email: "nazwanasyahrani@gmail.com",
      password: "300529"
    });
  } catch (err) {
    console.error("Setup error:", err);
    return c.json({ success: false, message: "Setup failed: " + err }, 500);
  }
});

// POST /api/auth/register
auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(
      {
        success: false,
        message: "Body tidak valid.",
      },
      400
    );
  }

  const schema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    name: z.string().min(1, "Nama wajib diisi").optional(),
  });

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0].message,
      },
      400
    );
  }

  const { email, password, name } = parsed.data;

  try {
    const existing = await sql`
      SELECT id
      FROM admins
      WHERE email = ${email}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return c.json(
        {
          success: false,
          message: "Email sudah terdaftar.",
        },
        409
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminName = name ?? "Admin";

    const inserted = await sql`
      INSERT INTO admins (email, password, name)
      VALUES (${email}, ${hashedPassword}, ${adminName})
      RETURNING id, email, name
    `;

    return c.json({
      success: true,
      message: "Register berhasil!",
      data: {
        admin: inserted[0],
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return c.json(
      {
        success: false,
        message: "Server error.",
      },
      500
    );
  }
});

// POST /api/auth/logout
auth.post("/logout", requireAuth, async (c) => {
  const token = c.req.header("Authorization")!.replace("Bearer ", "").trim();
  await sql`DELETE FROM sessions WHERE token = ${token}`;
  return c.json({ success: true, message: "Logout berhasil." });
});

// GET /api/auth/me
auth.get("/me", requireAuth, (c) => {
  const admin = (c as any).get("admin") as { id: string; email: string; name: string };
  return c.json({ success: true, data: admin });
});

export default auth;