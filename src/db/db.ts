import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Setup koneksi postgres
const queryClient = postgres("postgresql://postgres.nwpdejnumggqmgpyhdpt:d%8vvzR!9Mauwr5@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres");

// Export instance Drizzle
export const db = drizzle(queryClient, { schema });
const sql = postgres({
  host: "localhost",
  port: 5432,
  database: "db_portofolio",
  username: "postgres",
  password: "300529",
});

export default sql;