import { Hono } from "hono";
import { z } from "zod";
import sql from "../db/db";
import { requireAuth } from "../middleware/auth";

const portfolios = new Hono();

const portfolioSchema = z.object({
  judul: z.string().min(1).max(150),
  deskripsi: z.string().min(1),
  tag: z.string().min(1).max(255),
  gambar: z.string().optional().nullable(),
  github: z.string().optional().nullable(),
  urutan: z.number().int().optional(),
});

// GET /api/portfolios - publik
portfolios.get("/", async (c) => {
  try {
    const result = await sql`
      SELECT id, judul, deskripsi, tag, gambar, github, urutan
      FROM portfolios ORDER BY urutan ASC, created_at DESC
    `;
    return c.json({ success: true, data: result });
  } catch (err) {
    return c.json({ success: false, message: "Gagal mengambil data." }, 500);
  }
});

// POST /api/portfolios - admin
portfolios.post("/", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ success: false, message: "Body tidak valid." }, 400);

  const parsed = portfolioSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, message: parsed.error.issues[0].message }, 400);

  const { judul, deskripsi, tag, gambar = null, github = null, urutan = 0 } = parsed.data;

  try {
    const result = await sql`
      INSERT INTO portfolios (judul, deskripsi, tag, gambar, github, urutan)
      VALUES (${judul}, ${deskripsi}, ${tag}, ${gambar}, ${github}, ${urutan})
      RETURNING id, judul, deskripsi, tag, gambar, github, urutan
    `;
    return c.json({ success: true, message: "Karya berhasil ditambahkan!", data: result[0] }, 201);
  } catch (err) {
    return c.json({ success: false, message: "Gagal menyimpan." }, 500);
  }
});

// PUT /api/portfolios/:id - admin
portfolios.put("/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ success: false, message: "Body tidak valid." }, 400);

  const parsed = portfolioSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, message: parsed.error.issues[0].message }, 400);

  const { judul, deskripsi, tag, gambar = null, github = null, urutan = 0 } = parsed.data;

  try {
    const result = await sql`
      UPDATE portfolios 
      SET judul = ${judul}, deskripsi = ${deskripsi}, tag = ${tag}, 
          gambar = ${gambar}, github = ${github}, urutan = ${urutan}
      WHERE id = ${id}
      RETURNING id, judul, deskripsi, tag, gambar, github, urutan
    `;
    if (result.length === 0) return c.json({ success: false, message: "Data tidak ditemukan." }, 404);
    return c.json({ success: true, message: "Karya berhasil diperbarui!", data: result[0] });
  } catch (err) {
    return c.json({ success: false, message: "Gagal memperbarui." }, 500);
  }
});

// DELETE /api/portfolios/:id - admin
portfolios.delete("/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  try {
    const result = await sql`DELETE FROM portfolios WHERE id = ${id} RETURNING id, judul`;
    if (result.length === 0) return c.json({ success: false, message: "Data tidak ditemukan." }, 404);
    return c.json({ success: true, message: `"${result[0].judul}" berhasil dihapus.` });
  } catch (err) {
    return c.json({ success: false, message: "Gagal menghapus." }, 500);
  }
});

export default portfolios;