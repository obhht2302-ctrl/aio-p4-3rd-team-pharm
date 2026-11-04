"use client";

// 해든: 세 화면의 공통 탐색 메뉴, 이동 효과와 연습용 알림을 구성했습니다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { ClipboardList, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { Toaster } from "sonner";
import { TabletFrame } from "@/components/tablet-frame";
import { BRAND } from "@/lib/brand";
import { loadWho } from "@/lib/session";

const links = [
  { href: "/", label: "질문하기", icon: MessageCircleQuestion },
  { href: "/my/", label: "내 문의", icon: ClipboardList },
  { href: "/admin/", label: "약사 화면", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const sync = () => setSignedIn(!!loadWho());
    sync();
    window.addEventListener("team3-session-change", sync);
    return () => window.removeEventListener("team3-session-change", sync);
  }, []);
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.24 }}>
      <TabletFrame><div className="site-shell">
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand" aria-label={`${BRAND.pharmacy}, 질문하기`}>
              <span className="brand-mark">+</span>
              <span><strong>{BRAND.pharmacy}</strong><small>{BRAND.service}</small></span>
            </Link>
            {signedIn ? <nav aria-label="주 메뉴" className="main-nav">
              {links.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                return <Link key={href} href={href} className={active ? "nav-link active" : "nav-link"} aria-current={active ? "page" : undefined}>
                  <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                  {active && <motion.span className="nav-underline" layoutId="active-nav" />}
                </Link>;
              })}
            </nav> : <span className="login-header-note">로그인해 주세요</span>}
          </div>
        </header>
        <motion.main key={pathname} className="page-container" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          {children}
        </motion.main>
        <footer className="site-footer">{BRAND.pharmacy} · 연습 모드 · 사람과 제품, 연락처는 가상 데이터이며 실제 문자는 발송되지 않습니다</footer>
        <Toaster position="bottom-center" richColors closeButton />
      </div></TabletFrame>
    </MotionConfig>
  );
}
