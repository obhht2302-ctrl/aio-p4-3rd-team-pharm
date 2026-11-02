import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "약국 업무 도우미", description: "3팀 가상 창고형 약국 업무 지원 (연습용)" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <nav><b>약국 업무 도우미</b><a href="/">질문하기</a><a href="/my/">내 문의</a><a href="/admin/">약사 화면</a></nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
