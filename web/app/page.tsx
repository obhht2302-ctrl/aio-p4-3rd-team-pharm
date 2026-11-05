"use client";

// 해든: 3004의 질문 쓰기 → 답 보기 화면을 FastAPI 응답(/api/ask · /api/types · /api/my-requests)으로 연결했습니다.
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BookOpenText, Check, ChevronRight, ClipboardList, History, MessageCircle, Pill, ReceiptText, Send, TriangleAlert } from "lucide-react";
import { useAsk, useTypes, type Answer } from "@/lib/use-ask";
import { useWho, type Who } from "@/lib/session";
import { CallButton } from "@/components/call";
import { LoginPanel } from "@/components/login";
import { Pager, ScrollBox } from "@/components/pager";
import { HELD_LINE, RETRY_NOTE, RouteBadge, UNSENT_LINE, handoffState, routeLine, routeTone } from "@/components/route-badge";
import { SeniorAsk } from "@/components/senior-ask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const agentNames: Record<string, string> = { triage: "질문 분류", retriever: "자료 찾기", writer: "답변 작성", verifier: "내용 확인" };
const typeIcons: Record<string, typeof Pill> = { record_status: ClipboardList, recall: TriangleAlert, closing: ReceiptText, senior: Pill };

export default function AskPage() {
  const who = useWho();
  if (who === undefined) return <div className="stack"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-32 w-full" /></div>;
  if (!who) return <LoginPanel />;
  return who.role === "patient" ? <SeniorAsk who={who} /> : <StaffAsk who={who} />;
}

function Agents({ list }: { list: string[] }) {
  if (!list.length) return null;
  return <div className="agents" aria-label="처리 과정">
    <span>처리 과정</span>
    {list.map((agent, index) => <motion.span key={index} className="agent" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.08 }}>
      <Check size={12} />{agentNames[agent] ?? agent}{index < list.length - 1 && <ChevronRight size={12} className="agent-next" />}
    </motion.span>)}
  </div>;
}

function ResultCard({ answer, foot, onRetry }: { answer: Answer; foot?: React.ReactNode; onRetry?: () => void }) {
  const state = handoffState(answer);
  return <motion.section key={answer.request_id ?? answer.answer} className={`result-card ${answer.ticket?.priority === "high" ? "urgent" : ""}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
    <div className={`result-band band-${routeTone(answer.route)}`}>
      <RouteBadge route={answer.route} /><b>{state === "unsent" ? UNSENT_LINE : state === "held" ? HELD_LINE : routeLine[answer.route] ?? answer.route}</b>
      {answer.request_id && <span className="request-id">요청 번호 {answer.request_id}</span>}
    </div>
    <ScrollBox className="result-body">
      <p className="answer-text">{answer.answer}</p>
      {state === "unsent" && <div className="retry-note" role="status"><p>{RETRY_NOTE}</p>{onRetry && <Button variant="outline" className="primary-action" onClick={onRetry}>다시 묻기</Button>}</div>}
      {answer.ticket && <div className="ticket-number"><p>담당자 접수 번호 <strong>{answer.ticket.ticket_id}</strong></p></div>}
      {!!answer.sources?.length && <div className="source-box"><strong className="inline-flex items-center gap-1"><BookOpenText size={15} /> 참고 자료</strong><ul className="mt-2 space-y-1">{answer.sources.map((source, index) => <li key={index}>{source.doc} · {source.section}</li>)}</ul></div>}
      <Agents list={answer.agents ?? []} />
    </ScrollBox>
    {foot && <div className="result-foot">{foot}</div>}
  </motion.section>;
}

function StaffAsk({ who }: { who: Who }) {
  const ask = useAsk(who);
  const types = useTypes();
  const { question, answer, error, loading } = ask;
  const foot = answer?.route === "보완 질문" ? <div className="followup"><label className="field-label" htmlFor="context">조금 더 알려 주세요</label><div className="followup-row"><Input id="context" className="field-control" value={ask.context} onChange={e => ask.setContext(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing && ask.context.trim()) void ask.followUp(); }} placeholder="상황이나 약 이름 등을 이어서 적어 주세요" /><Button className="primary-action" disabled={!ask.context.trim() || loading} onClick={() => void ask.followUp()}>이어서 답하기 <ArrowRight size={16} /></Button></div></div>
    : answer?.route === "담당자 이관" ? <CallButton who="pharmacist" variant="outline" className="primary-action self-start">약사에게 전화</CallButton> : null;

  return <Pager steps={["질문 쓰기", "답 보기"]} index={ask.page} onIndex={ask.setPage}>
    <div className="ask-write fit">
      <div className="ask-main">
        <div className="ask-head"><h1>질문하기</h1><p>응대 중 확인이 필요한 내용을 입력하세요.</p></div>
        <form className="ask-form" onSubmit={e => { e.preventDefault(); void ask.send(question); }}>
          <label htmlFor="question" className="field-label">질문</label>
          <Textarea id="question" aria-label="질문 내용" rows={2} maxLength={500} className="bg-white" value={question} onChange={e => ask.setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask.send(question); } }} />
          <p className="ask-reassure">작은 것도 괜찮아요. 처음엔 다들 물어보면서 배워요.</p>
          <div className="ask-form-foot"><span className="field-help">{question.length} / 500자 · Enter로 보내기</span><Button type="submit" className="primary-action" disabled={!question.trim() || loading}><Send size={16} /> {loading ? "보내는 중" : "보내기"}</Button></div>
        </form>
        <p className="rail-note">AI가 매장 문서를 기준으로 안내합니다. 복약 판단은 약사에게 연결됩니다.</p>
      </div>
      {!!types.length && <aside className="ask-rail">
        <h3 className="rail-title">자주 찾는 문의 <small>누르면 바로 조회해요</small></h3>
        <ScrollBox className="type-scroll"><div className="type-grid">{types.map(type => { const Icon = typeIcons[type.type] ?? MessageCircle; return <div key={type.type} className="type-card">
          <b><Icon size={16} /> {type.label}</b>
          {type.examples.map(example => <button key={example} type="button" onClick={() => void ask.send(example)}>{example}</button>)}
        </div>; })}</div></ScrollBox>
      </aside>}
    </div>
    <div className="ask-answer fit">
      <div className="answer-main">
        {question.trim() && <p className="question-echo">“{question}”</p>}
        {error && <p className="error-box" role="alert">{error}</p>}
        {loading && <div className="loading-card" aria-live="polite"><p>약국 안내 문서에서 찾고 있어요. 잠시만 기다려 주세요.</p><Skeleton className="h-5 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></div>}
        {!answer && !loading && !error && <div className="soft-card empty-state"><MessageCircle size={35} /><strong>아직 보낸 질문이 없어요</strong><p>질문을 보내면 여기에 답이 나와요.</p></div>}
        {answer && <ResultCard answer={answer} foot={foot} onRetry={() => void ask.send(question)} />}
        {(answer || error) && <div className="answer-actions"><Button variant="outline" className="primary-action" onClick={ask.askAgain}>새 문의</Button></div>}
      </div>
      <aside className="answer-side">
        {ask.recent.length === 0 ? <div className="recent-empty"><History size={20} /> 최근 문의가 없습니다.</div> :
          <ScrollBox className="recent-list"><span>최근 문의</span>{ask.recent.map(item => <div key={item.request_id} className="recent-row"><RouteBadge route={item.route} /><span className="recent-q">{item.question}</span>{item.ticket && <b>{item.ticket.ticket_id}</b>}</div>)}</ScrollBox>}
        <p className="recent-link"><ReceiptText size={14} /> 이전 문의는 <Link href="/my/">내 문의</Link>에서 확인할 수 있습니다.</p>
      </aside>
    </div>
  </Pager>;
}
