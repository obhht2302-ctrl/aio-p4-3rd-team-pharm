"use client";

// 해든: 3004의 역할 카드 로그인을 명세의 사용자 선택 + 입장 코드로 연결했습니다. 코드는 들어갈 때 API로 바로 확인합니다.
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, ClipboardList, IdCard, MapPin, Stethoscope, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { saveWho } from "@/lib/session";
import { PersonAvatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type User = { name: string; role: string };
const ROLES = [
  { role: "staff", title: "직원", desc: "계산대 · 진열 · 입고 담당" },
  { role: "pharmacist", title: "책임 약사", desc: "이서준 · 상담대" },
  { role: "owner", title: "약국장", desc: "정민재 · 약사" },
  { role: "patient", title: "고객", desc: "약 질문 · 약사 상담 받기" },
];

export function LoginPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ items: User[] }>("GET", "/api/users", null).then(r => setUsers(r.items)).catch(e => setError(e.message));
  }, []);

  const people = users.filter(user => user.role === role);
  const pickRole = (next: string | null) => {
    setRole(next);
    setName(users.find(user => user.role === next)?.name ?? "");
    setCode("");
    setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role || !name) { setError("사용자를 골라 주세요."); return; }
    if (!code.trim()) { setError("입장 코드를 넣어 주세요."); return; }
    const selected = { name, role, code: code.trim() };
    setBusy(true);
    try {
      // 입장 코드를 바로 확인합니다. 내 문의 조회는 기록을 남기지 않고 코드만 검사합니다.
      await api("GET", `/api/my-requests?user=${encodeURIComponent(name)}`, selected);
      saveWho(selected);
      if (pathname === "/" && (role === "pharmacist" || role === "owner")) router.push("/admin/");
    } catch (e) { setError(e instanceof Error ? e.message : "입장하지 못했어요."); }
    finally { setBusy(false); }
  };

  return <div className="login-grid">
    <section className="login-intro">
      <span className="login-kicker">{BRAND.pharmacy} · {BRAND.service}</span>
      <h1>{BRAND.pharmacy}<br />매장 업무 태블릿</h1>
      <p>매장 문의 확인, 약사 상담 연결, 회수 · 접수 처리를 한곳에서 합니다.</p>
      <ul>
        <li><MapPin size={16} /> 마감 · 접수 건 · 매장 문의 확인</li>
        <li><Stethoscope size={16} /> 복약 판단은 약사 상담으로 연결</li>
        <li><ClipboardList size={16} /> 회수 · 접수 건 처리 현황 확인</li>
      </ul>
    </section>
    <div className="login-card">
      {!role ? <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h2 className="login-title">사용자 선택</h2>
        {error && <p className="error-box mt-3" role="alert">{error}</p>}
        <div className="role-grid">
          {ROLES.map(item => <button key={item.role} type="button" className="role-card" onClick={() => pickRole(item.role)}>
            {item.role === "pharmacist" ? <PersonAvatar name="이서준" className="size-10" /> :
              item.role === "owner" ? <PersonAvatar name="정민재" className="size-10" /> :
              <span className="role-icon">{item.role === "staff" ? <IdCard size={20} /> : <UserRound size={20} />}</span>}
            <b>{item.title}</b>
            <small>{item.desc}</small>
          </button>)}
        </div>
      </motion.div> : <motion.form key={role} className="login-form" onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <button type="button" className="back-link" onClick={() => pickRole(null)}><ArrowLeft size={16} /> 다른 역할 고르기</button>
        <h2 className="login-title">{role === "patient" ? "어서 오세요" : `${ROLES.find(item => item.role === role)?.title} 로그인`}</h2>
        <div className="person-grid" role="group" aria-label="사용자">
          {people.map(user => <button key={user.name} type="button" aria-pressed={name === user.name} className={name === user.name ? "person-card on" : "person-card"} onClick={() => setName(user.name)}>
            <PersonAvatar name={user.name} className="size-9 text-sm" /><b>{user.name}</b>
          </button>)}
        </div>
        <div><label className="field-label" htmlFor="code">입장 코드</label><Input id="code" type="password" autoComplete="off" className="field-control" value={code} onChange={e => setCode(e.target.value)} placeholder="입장 코드를 입력해 주세요" /></div>
        {error && <p className="error-box" role="alert">{error}</p>}
        <Button type="submit" className="primary-action w-full" disabled={busy}>{busy ? "확인하고 있어요" : `${name} 님으로 들어가기`}</Button>
      </motion.form>}
    </div>
  </div>;
}
