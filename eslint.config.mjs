import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 설계 산출물 — 앱 소스가 아니라 참고용 스펙(리디자인 HTML, 스크립트)이라 린트 대상이 아니다
    "docs/**",
  ]),
]);

export default eslintConfig;
