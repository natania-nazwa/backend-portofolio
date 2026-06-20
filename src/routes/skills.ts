import { Hono } from "hono";
import { z } from "zod";
import sql from "../db/db";
import { requireAuth } from "../middleware/auth";

const skills = new Hono();

const skillSchema = z.object({
  judul: z.string().min(1).max(100),
  deskripsi: z.string().min(1),
  tag: z.string().min(1).max(255),
  urutan: z.number().int().optional(),
});

// GET /api/skills - publik
skills.get("/", async (c) => {
  try {
    const result = await sql`
      SELECT id, judul, deskripsi, tag, urutan 
      FROM skills ORDER BY urutan ASC, created_at ASC
    `;
    return c.json({ success: true, data: result });
  } catch (err) {
    return c.json({ success: false, message: "Gagal mengambil data." }, 500);
  }
});

// POST /api/skills - admin
skills.post("/", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ success: false, message: "Body tidak valid." }, 400);

  const parsed = skillSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, message: parsed.error.issues[0].message }, 400);

  const { judul, deskripsi, tag, urutan = 0 } = parsed.data;

  try {
    const result = await sql`
      INSERT INTO skills (judul, deskripsi, tag, urutan)
      VALUES (${judul}, ${deskripsi}, ${tag}, ${urutan})
      RETURNING id, judul, deskripsi, tag, urutan
    `;
    return c.json({ success: true, message: "Keahlian berhasil ditambahkan!", data: result[0] }, 201);
  } catch (err) {
    return c.json({ success: false, message: "Gagal menyimpan." }, 500);
  }
});

// PUT /api/skills/:id - admin
skills.put("/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ success: false, message: "Body tidak valid." }, 400);

  const parsed = skillSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, message: parsed.error.issues[0].message }, 400);

  const { judul, deskripsi, tag, urutan = 0 } = parsed.data;

  try {
    const result = await sql`
      UPDATE skills SET judul = ${judul}, deskripsi = ${deskripsi}, tag = ${tag}, urutan = ${urutan}
      WHERE id = ${id}
      RETURNING id, judul, deskripsi, tag, urutan
    `;
    if (result.length === 0) return c.json({ success: false, message: "Data tidak ditemukan." }, 404);
    return c.json({ success: true, message: "Keahlian berhasil diperbarui!", data: result[0] });
  } catch (err) {
    return c.json({ success: false, message: "Gagal memperbarui." }, 500);
  }
});

// DELETE /api/skills/:id - admin
skills.delete("/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  try {
    const result = await sql`DELETE FROM skills WHERE id = ${id} RETURNING id, judul`;
    if (result.length === 0) return c.json({ success: false, message: "Data tidak ditemukan." }, 404);
    return c.json({ success: true, message: `"${result[0].judul}" berhasil dihapus.` });
  } catch (err) {
    return c.json({ success: false, message: "Gagal menghapus." }, 500);
  }
});

export default skills;