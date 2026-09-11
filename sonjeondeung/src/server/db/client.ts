// neon-http + drizzle. 서버 전용. 크롤러(scripts/crawl.ts)도 같은 클라이언트 사용.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 환경변수가 없습니다 (.env.example 참고)");
  return url;
}

function createDb() {
  const sql = neon(requireDatabaseUrl());
  return drizzle(sql, { schema });
}

// 빌드 시점엔 접속하지 않도록 지연 초기화
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

export type Db = ReturnType<typeof getDb>;
export { schema };
