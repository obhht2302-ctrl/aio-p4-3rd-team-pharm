"use client";

// 해든: 3004 다정약국의 머리 메뉴(알약 메뉴 · 사용자 · 로그아웃)와 이동 효과를 구성했습니다.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion, MotionConfig } from "motion/react";
import { Cross } from "lucide-react";
import { Toaster } from "sonner";
import { PersonAvatar } from "@/components/avatar";
import { TabletFrame } from "@/components/tablet-frame";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { isAdmin, saveWho, useWho } from "@/lib/session";

const links = [
  { href: "/", label: "질문하기" },
  { href: "/my/", label: "내 문의" },
  { href: "/admin/", label: "약사 화면" },
];
const roleNames: Record<string, string> = { staff: "직원", pharmacist: "책임 약사", owner: "약국장", patient: "고객" };
// 하단 '연습 모드' 표시는 연습(mock) 빌드에서만 (실제 모드 VM에서는 빼기)
const PRACTICE = (process.env.NEXT_PUBLIC_API_MODE || "mock") === "mock";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const who = useWho();
  const senior = who?.role === "patient";
  const nav = links.filter(link => link.href !== "/admin/" || isAdmin(who));
  const logout = () => { saveWho(null); router.push("/"); };

  // 메뉴를 옮기면 새 화면의 맨 위부터 보여 줍니다.
  useEffect(() => {
    document.querySelector(".tablet-screen")?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.24 }}>
      <TabletFrame><div className={senior ? "site-shell senior" : "site-shell"}>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand" aria-label={`${BRAND.pharmacy}, 질문하기`}>
              <span className="brand-mark"><Cross size={senior ? 24 : 20} fill="currentColor" /></span>
              <span><strong>{BRAND.pharmacy}</strong><small>{senior ? "고객 안내 · 큰 글씨" : BRAND.service}</small></span>
            </Link>
            {who && <nav aria-label="주 메뉴" className="main-nav">
              {nav.map(({ href, label }) => {
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                return <Link key={href} href={href} className={active ? "nav-link active" : "nav-link"} aria-current={active ? "page" : undefined}>
                  {active && <motion.span className="nav-pill" layoutId="active-nav" />}
                  <span className="nav-label">{label}</span>
                </Link>;
              })}
            </nav>}
            {who ? <div className="who-box">
              <PersonAvatar name={who.name} className="size-9 text-sm" />
              <span className="who-name"><b>{who.name}</b><small>{roleNames[who.role] ?? who.role}</small></span>
              <Button variant="outline" size="sm" onClick={logout}>{senior ? "나가기" : "로그아웃"}</Button>
            </div> : who === null && <span className="login-header-note">로그인해 주세요</span>}
          </div>
        </header>
        <motion.main key={pathname} className="page-container" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          {children}
        </motion.main>
        <footer className="site-footer">{BRAND.pharmacy}{PRACTICE ? " · 연습 모드" : ""} · 사람과 제품, 연락처는 가상 데이터이며 실제 문자는 발송되지 않습니다</footer>
        <Toaster position="bottom-center" richColors closeButton />
      </div></TabletFrame>
    </MotionConfig>
  );
}
