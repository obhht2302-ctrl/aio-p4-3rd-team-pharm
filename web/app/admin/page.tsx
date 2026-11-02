"use client";
// 화면 3 · 약사 · 약국장 (이관 티켓 · 회수 공표 알림 · 손님 안내 연습 기록). API도 403으로 한 번 더 막음
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { isAdmin, loadWho, type Who } from "@/lib/session";
type Ticket = { ticket_id: string; title: string; requester: string; category: string; priority: string; status: string };
type Alert = { reason: string; severity: string; message: string; ticket_id?: string };
export default function Admin() {
  const [who, setWho] = useState<Who | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]); const [alerts, setAlerts] = useState<Alert[]>([]);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const load = (w: Who) => {
    api<{ items: Alert[] }>("GET", "/api/admin/alerts", w).then(r => setAlerts(r.items)).catch(e => setErr(e.message));
    api<{ items: Ticket[] }>("GET", "/api/admin/tickets", w).then(r => setTickets(r.items)).catch(e => setErr(e.message));
  };
  useEffect(() => { const w = loadWho(); setWho(w); if (isAdmin(w)) load(w!); }, []);
  if (!isAdmin(who)) return <div className="card"><h2>약사 화면</h2><p>이 화면은 약사 · 약국장만 볼 수 있어요.</p></div>;
  const setStatus = async (t: Ticket, status: string) => { try { await api("PATCH", `/api/admin/tickets/${t.ticket_id}`, who, { status }); load(who!); } catch (e: any) { setErr(e.message); } };
  const notice = async (t: Ticket) => {
    try { const r = await api<{ count: number; notices: { phone: string }[] }>("POST", `/api/admin/tickets/${t.ticket_id}/recall-notice`, who);
      setMsg(`연습 기록 ${r.count}건 (실제 발송 없음): ${r.notices.map(n => n.phone).join(", ")}`); } catch (e: any) { setErr(e.message); }
  };
  return (<div><h2>약사 화면 · {who!.name}</h2>{err && <p className="err">{err}</p>}{msg && <p className="card">{msg}</p>}
    {alerts.map((a, i) => <div className="card urgent" key={i}><b>{a.reason === "urgent" ? "긴급" : a.reason}</b> {a.message}</div>)}
    {tickets.map(t => <div className={`card ${t.priority === "high" ? "urgent" : ""}`} key={t.ticket_id}>
      <b>{t.ticket_id}</b> {t.title} <span className="sub">· {t.requester} · {t.category} · {t.status}</span>
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={() => setStatus(t, "처리 중")}>처리 중</button><button onClick={() => setStatus(t, "처리 완료")}>처리 완료</button>
        {t.category === "recall" && who!.role === "pharmacist" && <button onClick={() => notice(t)}>손님 안내 보내기 (연습)</button>}
      </div></div>)}</div>);
}
