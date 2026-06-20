import { createMiddleware } from "hono/factory";
import sql from "../db/db";

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Token tidak ditemukan. Silakan login." }, 401);
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const result = await sql`
      SELECT s.id, s.admin_id, s.expires_at, a.email, a.name
      FROM sessions s
      JOIN admins a ON a.id = s.admin_id
      WHERE s.token = ${token} AND s.expires_at > NOW()
    `;

    if (result.length === 0) {
      return c.json({ success: false, message: "Session tidak valid atau sudah expired." }, 401);
    }

    c.set("admin", result[0]);
    await next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return c.json({ success: false, message: "Server error." }, 500);
  }
});