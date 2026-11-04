import type { Metadata } from "next";
// 해든: 외부 CDN 없이 Pretendard를 적용하고 공통 화면 틀을 연결합니다.
import localFont from "next/font/local";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "다정약국 · 다정 상담창구",
  description: "3팀 가상 창고형 약국 업무 지원 (연습용)",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={pretendard.variable}><AppShell>{children}</AppShell></body></html>;
}
