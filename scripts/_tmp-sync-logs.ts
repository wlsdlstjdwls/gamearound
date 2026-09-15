import { config } from "dotenv";
config({ path: ".env.local" });
import { desc } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { syncLogs } from "@/server/db/schema";

async function main(): Promise<void> {
  const rows = await getDb().select().from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(12);
  for (const r of rows) {
    const started = r.startedAt ? new Date(r.startedAt) : null;
    const ended = r.finishedAt ? new Date(r.finishedAt) : null;
    const sec = started && ended ? Math.round((ended.getTime() - started.getTime()) / 1000) : null;
    console.log(
      `${started?.toISOString() ?? "?"} ${String(r.source).padEnd(12)} ${String(r.status).padEnd(8)} ` +
        `${sec === null ? "도는 중" : sec + "초"} proc=${r.processed} fail=${r.failed} ` +
        `disc=${r.discovery ? JSON.stringify(r.discovery) : "-"}`,
    );
  }
}
void main();
