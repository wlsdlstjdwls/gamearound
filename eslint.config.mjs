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
    // 설계 산출물 — 앱 소스가 아니라 참고용 스펙(리디자인 HTML, 스크립트)이라 린트 대상이 아니다.
    // design/ 은 리디자인 시안 HTML 묶음이다(브라우저에서 직접 여는 파일이라 React UMD, ReactDOM.render 를 쓴다)
    "docs/**",
    "design/**",
    // 실측용 임시 산출물, 프로브 스크립트. .gitignore 가 이미 추적에서 뺀 것들이라(커밋 b333021)
    // 린트에서도 같이 뺀다 — 한 번 쓰고 버리는 코드에 규칙을 들이대면 검증이 늘 빨갛다
    "artifacts/**",
    "scripts/_tmp-*",
  ]),
]);

export default eslintConfig;
