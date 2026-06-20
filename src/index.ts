import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import authRoutes from "./routes/auth";
import skillsRoutes from "./routes/skills";
import portfoliosRoutes from "./routes/portofolio";
import contactRoutes from "./routes/contact";

const app = new Hono();

app.use("*", logger());

app.use(
  "/api/*",
  cors({
    origin: [ "*"
      
    ],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 600,
  })
);

app.get("/", (c) => c.json({ status: "ROWRRR API berjalan!" }));

app.route("/api/auth", authRoutes);
app.route("/api/skills", skillsRoutes);
app.route("/api/portofolio", portfoliosRoutes);
app.route("/api/contact", contactRoutes);

export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
};