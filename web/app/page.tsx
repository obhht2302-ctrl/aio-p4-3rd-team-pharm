"use client";
// 화면 1 · 질문하기 (직원 · 환자 공용). 상세 = specs/06-screen.md 1절
import { useEffect, useState } from "react";
import { api, apiMode } from "@/lib/api";
import { loadWho, saveWho, type Who } from "@/lib/session";
type User = { name: string; role: string };
type Ans = { route: string; answer: string; sources: { doc: string; section: string }[]; ticket: { ticket_id: string } | null };
export default function Ask() {
  const [who, setWho] = useState<Who | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [examples, setExamples] = useState<string[]>([]);
  const [pick, setPick] = useState(""); const [code, setCode] = useState("");
  const [q, setQ] = useState(""); const [more, setMore] = useState(""); const [attempt, setAttempt] = useState(1);
  const [ans, setAns] = useState<Ans | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    setWho(loadWho());
    api<{ items: User[] }>("GET", "/api/users", null).then(r => setUsers(r.items)).catch(e => setErr(e.message));
    api<{ items: { type: string; examples: string[] }[] }>("GET", "/api/types", null)
      .then(r => setExamples(r.items.find(t => t.type === "senior")?.examples || [])).catch(() => {});
  }, []);
  const enter = () => { const u = users.find(x => x.name === pick); if (!u || !code) return setErr("사용자와 입장 코드를 넣어 주세요"); const w = { ...u, code }; saveWho(w); setWho(w); setErr(""); };
  const send = async (question: string, context = "", n = 1) => {
    setErr(""); setAns(null);
    try { setAns(await api<Ans>("POST", "/api/ask", who, { user: who?.name, question, context, attempt: n })); setAttempt(n); }
    catch (e: any) { setErr(e.message); }
  };
  if (!who) return (
    <div className="card"><h2>누구세요?</h2>
      <div className="row"><select value={pick} onChange={e => setPick(e.target.value)}><option value="">사용자 고르기</option>
        {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}</select>
        <input placeholder="입장 코드" value={code} onChange={e => setCode(e.target.value)} /></div>
      <p><button onClick={enter}>들어가기</button></p>{err && <p className="err">{err}</p>}
      <p className="sub">연습용 가상 약국이에요. 이름 · 번호는 전부 가짜예요. (API: {apiMode})</p></div>);
  const senior = who.role === "patient";
  return (
    <div className={senior ? "senior" : ""}>
      <p className="sub">{who.name}님 <button style={{ width: "auto" }} onClick={() => { saveWho(null); setWho(null); }}>바꾸기</button></p>
      {senior && <div className="row">{examples.map(x => <button key={x} onClick={() => { setQ(x); send(x); }}>{x}</button>)}</div>}
      <div className="card"><textarea rows={3} maxLength={500} placeholder="무엇이 궁금하세요?" value={q} onChange={e => setQ(e.target.value)} />
        <p><button onClick={() => send(q)} disabled={!q.trim()}>보내기</button></p></div>
      {err && <p className="err">{err}</p>}
      {ans && <div className="card">
        <span className={`badge r-${ans.route.split(" ")[0]}`}>{ans.route}</span>{ans.ticket && <span className="sub"> 티켓 {ans.ticket.ticket_id}</span>}
        <p style={{ whiteSpace: "pre-wrap" }}>{ans.answer}</p>
        {ans.sources.length > 0 && <p className="sub">근거: {ans.sources.map(s => `${s.doc} · ${s.section}`).join(" / ")}</p>}
        {ans.route === "보완 질문" && <div className="row"><input placeholder="더 알려 주세요" value={more} onChange={e => setMore(e.target.value)} />
          <button onClick={() => send(q, more, attempt + 1)}>이어서 답하기</button></div>}
      </div>}
    </div>);
}
