import type { NextConfig } from "next";
// 정적 내보내기: npm run build → out/ (VM에서는 nginx가 이 폴더를 보여 줌, 빌드는 VM 밖에서)
const config: NextConfig = { output: "export", trailingSlash: true, poweredByHeader: false };
export default config;
