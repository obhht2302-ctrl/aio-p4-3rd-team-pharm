"use client";

// 해든: 사용자 입장, 질문 쓰기 → 답 보기 단계, 근거와 처리 경로, 보완 질문, 어르신 모드를 구현했습니다.
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, BookOpenText, Check, CircleHelp, Home, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { loadWho, saveWho, type Who } from "@/lib/session";
import { CallButton } from "@/components/call";
import { Pager } from "@/components/pager";
import { RouteBadge } from "@/components/route-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type User = { name: string; role: string };
type Answer = {
  request_id?: string;
  route: string;
  answer: string;
  sources: { doc: string; section: string }[];
  ticket: { ticket_id: string; priority?: string } | null;
  agents?: string[];
};
const roleNames: Record<string, string> = { staff: "직원", pharmacist: "약사", owner: "약국장", patient: "환자" };
const rolePhrases: Record<string, string> = { staff: "직원으로", pharmacist: "약사로", owner: "약국장으로", patient: "환자로" };
const agentNames: Record<string, string> = { triage: "질문 분류", retriever: "자료 찾기", writer: "답변 작성", verifier: "내용 확인" };
const greeting = () => {
  const hour = new Date().getHours();
  return hour < 11 ? "좋은 아침이에요" : hour < 18 ? "안녕하세요" : "오늘도 수고 많으셨어요";
};

export default function AskPage() {
  const [who, setWho] = useState<Who | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [examples, setExamples] = useState<string[]>([]);
  const [pick, setPick] = useState("");
  const [code, setCode] = useState("");
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWho(loadWho());
    setReady(true);
    api<{ items: User[] }>("GET", "/api/users", null).then(r => setUsers(r.items)).catch(e => setError(e.message));
    api<{ items: { type: string; examples: string[] }[] }>("GET", "/api/types", null)
      .then(r => setExamples(r.items.find(item => item.type === "senior")?.examples ?? [])).catch(() => {});
  }, []);

  const enter = async () => {
    const user = users.find(item => item.name === pick);
    if (!user || !code.trim()) { setError("사용자와 입장 코드를 넣어 주세요."); return; }
    const selected = { ...user, code: code.trim() };
    setEntering(true);
    try {
      // 입장 코드를 바로 확인합니다. 내 문의 조회는 기록을 남기지 않고 코드만 검사합니다.
      await api("GET", `/api/my-requests?user=${encodeURIComponent(selected.name)}`, selected);
      saveWho(selected);
      setWho(selected);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "입장하지 못했어요."); }
    finally { setEntering(false); }
  };

  const send = async (text: string, nextContext = "", nextAttempt = 1) => {
    if (!who || !text.trim() || loading) return;
    setQuestion(text);
    setError("");
    if (nextAttempt === 1) setAnswer(null); // 이어서 답하기가 실패해도 입력 칸이 남도록 첫 질문일 때만 비웁니다.
    setLoading(true);
    setPage(1);
    try {
      const result = await api<Answer>("POST", "/api/ask", who, { user: who.name, question: text.trim(), context: nextContext, attempt: nextAttempt });
      if (!result.route) throw new Error("질문을 처리하지 못했어요. 내용을 줄여 다시 보내 주세요.");
      setAnswer(result);
      setAttempt(nextAttempt);
      setContext("");
    } catch (e) { setError(e instanceof Error ? e.message : "요청을 처리하지 못했어요."); }
    finally { setLoading(false); }
  };

  const askAgain = () => {
    setQuestion("");
    setContext("");
    setAttempt(1);
    setAnswer(null);
    setError("");
    setPage(0);
  };

  if (!ready) return <div className="stack"><Skeleton className="h-24 w-full" /><Skeleton className="h-80 w-full" /></div>;
  const senior = who?.role === "patient";
  const handedOff = answer?.route === "담당자 이관";
  const urgent = answer?.ticket?.priority === "high";

  const helpCard = <div className="hint-card"><h3 className="flex items-center gap-2"><Sparkles size={17} /> 이렇게 도와드려요</h3><p>자료에 근거해 답하고, 약사의 확인이 필요한 일은 따로 접수해요.</p><ul className="hint-list"><li><BookOpenText size={16} /> 근거 자료를 함께 보여 드려요</li><li><ShieldCheck size={16} /> 민감한 내용은 안전하게 다뤄요</li><li><MessageCircle size={16} /> 접수된 내용은 내 문의에서 확인해요</li></ul></div>;

  return <div className={senior ? "senior" : ""}>
    <div className="page-intro">
      <p className="eyebrow">{BRAND.service}</p>
      <h1 className="page-title">{who ? `${who.name}님, ${greeting()}` : `${BRAND.pharmacy}에 궁금한 일을 물어보세요`}</h1>
      <p className="page-description">{senior ? "어서 오세요. 천천히 물어보셔도 괜찮아요." : "질문을 남기면 자료를 찾아 답하고, 확인이 필요한 일은 담당자에게 전달해요."}</p>
    </div>
    {!who ? <div className="content-grid">
      <Card className="soft-card gap-0">
        <CardHeader className="px-7 pt-7 pb-4"><CardTitle className="section-heading">먼저 사용자로 들어가 주세요</CardTitle><p className="section-sub">이름을 고르고 입장 코드를 입력하면 시작할 수 있어요.</p></CardHeader>
        <CardContent className="px-7 pb-7 field-stack">
          <div><label className="field-label" htmlFor="user">사용자</label>
            <select id="user" className="field-control w-full rounded-md border border-input px-3" value={pick} onChange={e => setPick(e.target.value)}>
              <option value="">이름을 선택해 주세요</option>
              {users.map(user => <option key={user.name} value={user.name}>{user.name} · {roleNames[user.role] ?? user.role}</option>)}
            </select>
          </div>
          <div><label className="field-label" htmlFor="code">입장 코드</label><Input id="code" type="password" autoComplete="off" className="field-control" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void enter(); }} placeholder="입장 코드를 입력해 주세요" /></div>
          {error && <p className="error-box" role="alert">{error}</p>}
          <Button className="primary-action w-full" disabled={entering} onClick={enter}>{entering ? "확인하고 있어요" : "들어가기"} <ArrowRight size={17} /></Button>
          <p className="field-help">연습용 가상 약국의 사용자로 이용해요.</p>
        </CardContent>
      </Card>
      <aside className="stack">{helpCard}</aside>
    </div> : <>
      <div className="role-line">
        <div><strong>{who.name}님</strong><span> · {rolePhrases[who.role] ?? who.role} 이용 중</span></div>
        <Button variant="ghost" size="sm" onClick={() => { saveWho(null); setWho(null); askAgain(); setCode(""); }}>사용자 바꾸기</Button>
      </div>
      <Pager steps={["질문 쓰기", "답 보기"]} index={page} onIndex={setPage}>
        <div className="content-grid">
          <div className="stack">
            <Card className="soft-card gap-0">
              <CardHeader className="px-7 pt-7 pb-4"><CardTitle className="section-heading">질문 남기기</CardTitle><p className="section-sub">상황을 자세히 알려 주시면 답을 찾는 데 도움이 돼요.</p></CardHeader>
              <CardContent className="px-7 pb-7">
                <label className="field-label" htmlFor="question">질문 내용</label>
                <Textarea id="question" className="min-h-36 resize-y bg-white" maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} placeholder="궁금한 내용을 적어 주세요." />
                <div className="mt-3 flex items-center justify-between gap-3"><span className="field-help">{question.length}/500자</span><Button className="primary-action" disabled={!question.trim() || loading} onClick={() => send(question)}><Send size={16} /> 질문 보내기</Button></div>
                {who.role === "staff" && <p className="field-help mt-3">작은 것도 괜찮아요. 처음엔 다들 물어보면서 배워요.</p>}
              </CardContent>
            </Card>
            {senior && <div className="hint-card"><h3>이런 질문을 해 보세요</h3><div className="example-list mt-4">{examples.map(example => <Button key={example} variant="outline" className="example-button" onClick={() => send(example)}>{example}</Button>)}</div></div>}
          </div>
          <aside className="stack">
            {helpCard}
            <div className="soft-card panel-pad"><CircleHelp size={21} color="var(--primary)" /><h3 className="mt-3 font-bold">알아두세요</h3><p className="mt-2 text-sm text-muted-foreground">급한 건강 문제는 가까운 의료진에게 바로 문의해 주세요.</p></div>
          </aside>
        </div>
        <div className="stack">
          {question.trim() && <p className="question-echo">“{question}”</p>}
          {error && <p className="error-box" role="alert">{error}</p>}
          {loading && <Card className="soft-card panel-pad gap-4" aria-live="polite"><strong>약국 안내 문서에서 찾고 있어요. 잠시만 기다려 주세요.</strong><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" /></Card>}
          {!answer && !loading && !error && <div className="soft-card empty-state"><MessageCircle size={35} /><strong>아직 보낸 질문이 없어요</strong><p>질문을 보내면 여기에 답이 나와요.</p></div>}
          {!answer && !loading && error && <Button variant="outline" className="secondary-action justify-self-start" onClick={() => setPage(0)}>질문 고치러 가기</Button>}
          {answer && <motion.div key={answer.request_id ?? answer.answer} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className={`soft-card gap-0 ${urgent ? "urgent" : ""}`}><CardHeader className="px-7 pt-7 pb-0"><div className="meta-line"><RouteBadge route={answer.route} />{answer.request_id && <span className="request-id">요청 {answer.request_id}</span>}</div><CardTitle className="section-heading mt-4">찾은 답변</CardTitle></CardHeader>
              <CardContent className="px-7 pb-7"><p className="answer-text">{answer.answer}</p>
                {!!answer.agents?.length && <div className="mb-5 flex flex-wrap gap-2" aria-label="처리 과정">{answer.agents.map((agent, index) => <motion.span key={index} className="status-pill inline-flex items-center gap-1" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.08 }}><Check size={12} />{agentNames[agent] ?? agent}</motion.span>)}</div>}
                {answer.ticket && <div className="ticket-number"><p>담당자 접수 번호 <strong>{answer.ticket.ticket_id}</strong></p><span>카운터에서 이 번호를 말씀해 주세요.</span></div>}
                {!!answer.sources?.length && <div className="source-box"><strong className="inline-flex items-center gap-1"><BookOpenText size={15} /> 참고 자료</strong><ul className="mt-2 space-y-1">{answer.sources.map((source, index) => <li key={index}>{source.doc} · {source.section}</li>)}</ul></div>}
                {answer.route === "보완 질문" && <div className="mt-5 border-t border-border pt-5"><label className="field-label" htmlFor="context">조금 더 알려 주세요</label><Input id="context" className="field-control" value={context} onChange={e => setContext(e.target.value)} placeholder="상황이나 약 이름 등을 이어서 적어 주세요" /><Button className="primary-action mt-3" disabled={!context.trim() || loading} onClick={() => send(question, context.trim(), attempt + 1)}>이어서 답하기 <ArrowRight size={16} /></Button></div>}
                <div className="answer-actions">
                  {senior && urgent && <CallButton who="119" className="primary-action danger-action">119 전화하기</CallButton>}
                  {(handedOff || senior) && <CallButton who="pharmacist" variant="outline" className="primary-action">약사에게 전화</CallButton>}
                  <Button variant="outline" className="primary-action" onClick={askAgain}><Home size={16} /> 다시 질문하기</Button>
                </div>
              </CardContent></Card>
          </motion.div>}
        </div>
      </Pager>
    </>}
  </div>;
}
