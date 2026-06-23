import { Hono } from "hono";
import { z } from "zod";
import sql from "../db/db";
import { requireAuth } from "../middleware/auth";

const portfolios = new Hono();

const workTypeEnum = z.enum(["Individu", "Tim"])

const roleEnum = z.enum([
  "Frontend Developer",
  "Backend Developer",
  "Fullstack Developer",
  "UI/UX Designer",
  "Mobile Developer",
  "Game Developer",
  "DevOps Engineer",
])

const portfolioSchema = z.object({
  judul: z.string().min(1).max(150),
  deskripsi: z.string().min(1),
  tag: z.string().min(1).max(255),
  gambar: z.string().optional().nullable(),
  github: z.string().optional().nullable(),
  urutan: z.number().int().optional(),

  features: z.array(z.string().min(1).max(255)).min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  roles: z.array(roleEnum).min(1),
  workType: workTypeEnum,
});

// GET /api/portofolio - publik
portfolios.get("/", async (c) => {
  console.log("[GET /api/portofolio] start");
  try {
    console.log("[GET /api/portofolio] STEP 1");

    const rows = await sql`
      SELECT
        p.id,
        p.judul,
        p.deskripsi,
        p.tag,
        p.gambar,
        p.github,
        p.urutan,
        p.tanggal_mulai,
        p.tanggal_selesai,
        p.work_type,

        COALESCE(p.roles, '{}'::text[]) AS roles
      FROM portfolios p
      ORDER BY p.urutan ASC, p.created_at DESC
    `;

    console.log("[GET /api/portofolio] STEP 2 rows", (rows as any[]).length);



    // Ambil features per portfolio (order by urutan)
    console.log("[GET /api/portofolio] STEP 3");

    const featuresRows = await sql`
      SELECT pf.portfolio_id, pf.fitur, pf.urutan
      FROM portfolio_features pf
      ORDER BY pf.urutan ASC
    `;

    console.log("[GET /api/portofolio] STEP 3 featuresRows", (featuresRows as any[]).length);



    console.log("[GET /api/portofolio] STEP 4 build feature map");

    const featureMap = new Map<string, string[]>();
    for (const fr of featuresRows as any[]) {
      const arr = featureMap.get(fr.portfolio_id) ?? [];
      arr.push(fr.fitur);
      featureMap.set(fr.portfolio_id, arr);
    }


    const toDurasi = (start: string | null, end: string | null) => {
      if (!start || !end) return null;
      const s = new Date(start);
      const e = new Date(end);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
      const ms = e.getTime() - s.getTime();
      if (ms < 0) return null;
      const days = Math.round(ms / (1000 * 60 * 60 * 24));
      return { days };
    };

    const data = (rows as any[]).map((p) => {
      const roles = Array.isArray(p.roles) ? p.roles : [];
      return {
        id: p.id,
        judul: p.judul,
        deskripsi: p.deskripsi,
        tag: p.tag,
        gambar: p.gambar,
        github: p.github,
        urutan: p.urutan,
        features: featureMap.get(p.id) ?? [],
        startDate: p.tanggal_mulai,
        endDate: p.tanggal_selesai,
        roles,
        workType: p.work_type,
        durasi: toDurasi(p.tanggal_mulai, p.tanggal_selesai),


      };
    });

    return c.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/portofolio] error:", err);
    return c.json(
      {
        success: false,
        error: String(err),
        stack: err instanceof Error ? err.stack : null,
      },
      500
    );
  }
});

// GET /api/portofolio/:id - publik
portfolios.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();

// UUID v4 basic validation (DB column is uuid)
    const isUuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    // Kalau masih dapat value seperti "$portfolioId" (literaly), jangan sampai masuk query DB.
    if (!isUuidV4) {
      console.error('[GET /api/portofolio/:id] invalid id param:', id);
      return c.json({ success: false, message: 'ID portofolio tidak valid.' }, 400);
    }


    const p = await sql`
      SELECT
        p.id,
        p.judul,
        p.deskripsi,
        p.tag,
        p.gambar,
        p.github,
        p.urutan,
        p.tanggal_mulai,
        p.tanggal_selesai,
        p.work_type,
        COALESCE(p.roles, '{}'::text[]) AS roles
      FROM portfolios p
      WHERE p.id = ${id}
      LIMIT 1
    `;

    if (!p[0]) return c.json({ success: false, message: "Data tidak ditemukan." }, 404);


    const featuresRows = await sql`
      SELECT pf.fitur, pf.urutan
      FROM portfolio_features pf
      WHERE pf.portfolio_id = ${id}
      ORDER BY pf.urutan ASC
    `;

    const startDate = p[0].tanggal_mulai;
    const endDate = p[0].tanggal_selesai;
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    let durasi: any = null;
    if (s && e && !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
      const ms = e.getTime() - s.getTime();
      if (ms >= 0) durasi = { days: Math.round(ms / (1000 * 60 * 60 * 24)) };
    }

    return c.json({
      success: true,
      data: {
        id: p[0].id,
        judul: p[0].judul,
        deskripsi: p[0].deskripsi,
        tag: p[0].tag,
        gambar: p[0].gambar,
        github: p[0].github,
        urutan: p[0].urutan,
        features: featuresRows.map((x: any) => x.fitur),
        startDate,
        endDate,
        roles: Array.isArray(p[0].roles) ? p[0].roles : [],
        workType: p[0].work_type,
        durasi,
      },
    });
  } catch (err) {
    console.error("[GET /api/portofolio/:id] error:", err);
    return c.json({ success: false, message: "Gagal mengambil detail." }, 500);
  }
});

// POST /api/portofolio - admin
portfolios.post("/", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ success: false, message: "Body tidak valid." }, 400);

  const parsed = portfolioSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, message: parsed.error.issues[0]?.message ?? "Validasi gagal." }, 400);
  }

  const {
    judul,
    deskripsi,
    tag,
    gambar = null,
    github = null,
    urutan = 0,
    features,
    startDate,
    endDate,
    roles,
    workType,
  } = parsed.data;

  try {
    const result = await sql`
      INSERT INTO portfolios (judul, deskripsi, tag, gambar, github, urutan, tanggal_mulai, tanggal_selesai, work_type, roles)
      VALUES (${judul}, ${deskripsi}, ${tag}, ${gambar}, ${github}, ${urutan}, ${startDate}, ${endDate}, ${workType}, ${roles})
      RETURNING id, judul, deskripsi, tag, gambar, github, urutan, tanggal_mulai, tanggal_selesai, work_type, roles
    `;

    const portfolioId = result[0].id as string;

    // Insert fitur
    for (let i = 0; i < features.length; i++) {
      await sql`
        INSERT INTO portfolio_features (portfolio_id, fitur, urutan)
        VALUES (${portfolioId}, ${features[i]}, ${i})
      `;
    }

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

  const {
    judul,
    deskripsi,
    tag,
    gambar = null,
    github = null,
    urutan = 0,
    features,
    startDate,
    endDate,
    roles,
    workType,
  } = parsed.data;

  try {
    // update data utama
    const result = await sql`
      UPDATE portfolios 
      SET judul = ${judul},
          deskripsi = ${deskripsi},
          tag = ${tag},
          gambar = ${gambar},
          github = ${github},
          urutan = ${urutan},
          tanggal_mulai = ${startDate},
          tanggal_selesai = ${endDate},
          work_type = ${workType},
          roles = ${roles}
      WHERE id = ${id}
      RETURNING id, judul, deskripsi, tag, gambar, github, urutan, tanggal_mulai, tanggal_selesai, work_type, roles
    `;

    if (result.length === 0) return c.json({ success: false, message: "Data tidak ditemukan." }, 404);

    const portfolioId = id as string;

    // replace fitur
    await sql`DELETE FROM portfolio_features WHERE portfolio_id = ${portfolioId}`;
    for (let i = 0; i < features.length; i++) {
      await sql`
        INSERT INTO portfolio_features (portfolio_id, fitur, urutan)
        VALUES (${portfolioId}, ${features[i]}, ${i})
      `;
    }

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