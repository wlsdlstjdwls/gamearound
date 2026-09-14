import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 파서 단위 테스트 전용 (네트워크/DB 없음). `pnpm test`
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
