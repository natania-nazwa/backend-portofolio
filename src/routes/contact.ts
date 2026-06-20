import { Hono } from "hono";
import { z } from "zod";
import sql from "../db/db";
import { requireAuth } from "../middleware/auth";

const contact = new Hono();

// POST /api/contact - publik
contact.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ success: false, message: "Body tidak valid." }, 400);

  const schema = z.object({
    nama: z.string().min(2).max(100),
    email: z.string().email("Email tidak valid"),
    pesan: z.string().min(5).max(2000),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, message: parsed.error.issues[0].message }, 400);

  const { nama, email, pesan } = parsed.data;

  try {
    const result = await sql`
      INSERT INTO contact_messages (nama, email, pesan)
      VALUES (${nama}, ${email}, ${pesan})
      RETURNING id, created_at
    `;
    return c.json({ success: true, message: "Pesan berhasil dikirim!", data: result[0] }, 201);
  } catch (err) {
    return c.json({ success: false, message: "Gagal mengirim pesan." }, 500);
  }
});

// GET /api/contact - admin
contact.get("/", requireAuth, async (c) => {
  try {
    const result = await sql`
      SELECT id, nama, email, pesan, is_read, created_at
      FROM contact_messages ORDER BY created_at DESC
    `;
    return c.json({ success: true, data: result });
  } catch (err) {
    return c.json({ success: false, message: "Gagal mengambil pesan." }, 500);
  }
});

// DELETE /api/contact/:id - admin
contact.delete("/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  try {
    const result = await sql`DELETE FROM contact_messages WHERE id = ${id} RETURNING id, nama`;
    if (result.length === 0) return c.json({ success: false, message: "Pesan tidak ditemukan." }, 404);
    return c.json({ success: true, message: `Pesan dari "${result[0].nama}" dihapus.` });
  } catch (err) {
    return c.json({ success: false, message: "Gagal menghapus." }, 500);
  }
});

export default contact;