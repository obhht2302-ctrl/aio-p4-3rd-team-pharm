"use client";
// 화면 2 · 내 문의 (내 질문 · 이관 건 상태만)
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { loadWho } from "@/lib/session";
type Item = { request_id: string; question: string; route: string; created_at: string; ticket: { ticket_id: string; status?: string } | null };
export default function My() {
  const [items, setItems] = useState<Item[]>([]); const [err, setErr] = useState(""); const [name, setName] = useState("");
  useEffect(() => {
    const who = loadWho(); if (!who) { setErr("질문하기 화면에서 먼저 들어와 주세요"); return; }
    setName(who.name);
    api<{ items: Item[] }>("GET", `/api/my-requests?user=${encodeURIComponent(who.name)}`, who).then(r => setItems(r.items)).catch(e => setErr(e.message));
  }, []);
  return (<div><h2>{name ? `${name}님의 문의` : "내 문의"}</h2>{err && <p className="err">{err}</p>}
    {items.map(i => <div className="card" key={i.request_id}>
      <span className={`badge r-${i.route.split(" ")[0]}`}>{i.route}</span> <span className="sub">{i.created_at}</span>
      <p>{i.question}</p>{i.ticket && <p className="sub">티켓 {i.ticket.ticket_id} · {i.ticket.status || "접수됨"}</p>}</div>)}
    {!err && items.length === 0 && <p className="sub">아직 문의가 없어요.</p>}</div>);
}
