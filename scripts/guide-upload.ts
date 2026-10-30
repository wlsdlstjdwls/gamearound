// 서비스 변경 안내서를 Vercel Blob 에 올린다. 관리자 화면(/admin/guide)은 가장 늦게 올린 본문을 보여 준다(lib/admin/guide).
//   pnpm guide:upload <폴더>    폴더 안에 index.html 과 img/ 그림 파일이 있어야 한다(본문은 그림을 "img/이름" 으로 부른다)
//
// 순서: 그림을 먼저 올리고 본문의 그림 주소를 Blob 주소로 바꾼 뒤 본문을 올린다. 다 올라가면 앞 판 파일을 지운다 —
// 도중에 끊겨도 화면은 앞 판을 그대로 보여 준다(본문이 마지막에 올라가므로). 주소는 추측할 수 없게 무작위 꼬리를 붙인다.
// 배포와 상관없이 돈다. BLOB_READ_WRITE_TOKEN 은 .env.local 에서 읽는다.
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { del, list, put } from "@vercel/blob";
import { GUIDE_BLOB_PREFIX, GUIDE_HTML_PREFIX, GUIDE_IMAGE_PREFIX } from "@/lib/admin/guide";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** 한 번에 올리는 그림 수. 그림이 백 장 남짓이라 하나씩 올리면 몇 분이 걸린다 */
const UPLOAD_CONCURRENCY = 6;
const IMAGE_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function listAll(prefix: string): Promise<string[]> {
  const urls: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor });
    urls.push(...page.blobs.map((b) => b.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return urls;
}

async function main(): Promise<void> {
  const dir = process.argv[2];
  if (!dir) throw new Error("사용법: pnpm guide:upload <폴더>");
  const htmlPath = path.join(dir, "index.html");
  const imgDir = path.join(dir, "img");
  if (!fs.existsSync(htmlPath)) throw new Error(`${htmlPath} 가 없어요`);

  const before = await listAll(GUIDE_BLOB_PREFIX);
  const names = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter((n) => IMAGE_TYPES[path.extname(n).toLowerCase()]) : [];
  const urlOf = new Map<string, string>();
  for (let i = 0; i < names.length; i += UPLOAD_CONCURRENCY) {
    await Promise.all(
      names.slice(i, i + UPLOAD_CONCURRENCY).map(async (name) => {
        const blob = await put(`${GUIDE_IMAGE_PREFIX}${name}`, fs.readFileSync(path.join(imgDir, name)), {
          access: "public",
          addRandomSuffix: true,
          contentType: IMAGE_TYPES[path.extname(name).toLowerCase()],
        });
        urlOf.set(name, blob.url);
      }),
    );
    console.log(`그림 ${Math.min(i + UPLOAD_CONCURRENCY, names.length)}/${names.length}`);
  }

  let html = fs.readFileSync(htmlPath, "utf8");
  html = html.replace(/(["'(])img\/([^"')]+)/g, (whole, q: string, name: string) => (urlOf.has(name) ? `${q}${urlOf.get(name)}` : whole));
  const page = await put(`${GUIDE_HTML_PREFIX}index.html`, html, { access: "public", addRandomSuffix: true, contentType: "text/html; charset=utf-8" });
  console.log(`본문 ${(Buffer.byteLength(html) / 1024).toFixed(0)}KB 올림`);

  if (before.length > 0) await del(before);
  console.log(`앞 판 ${before.length}개 지움. 새 본문: ${page.pathname}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
