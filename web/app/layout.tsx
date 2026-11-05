import type { Metadata } from "next";
// 해든: Pretendard는 패키지에서, 제목용 고운돋움은 빌드할 때 받아 앱 안에 넣습니다 (실행 중 외부 요청 없음).
import localFont from "next/font/local";
import { Gowun_Dodum } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});
const gowun = Gowun_Dodum({ weight: "400", subsets: ["latin"], variable: "--font-gowun", preload: false });

export const metadata: Metadata = {
  title: "다정약국 · 다정 상담창구",
  description: "3팀 가상 창고형 약국 업무 지원 (연습용)",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={`${pretendard.variable} ${gowun.variable}`}><AppShell>{children}</AppShell></body></html>;
}
