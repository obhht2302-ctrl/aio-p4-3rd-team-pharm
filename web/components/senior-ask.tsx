"use client";

// 해든: 3004의 고객(어르신) 화면입니다. 글씨 크기 단계가 rem으로 화면 전체를 키우고, 예시는 /api/types 값을 씁니다.
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Home, PhoneCall, Volume2 } from "lucide-react";
import { useAsk, useTypes } from "@/lib/use-ask";
import type { Who } from "@/lib/session";
import { CallButton } from "@/components/call";
import { RouteBadge, routeTone, seniorLine } from "@/components/route-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const SIZES = [{ label: "크게", px: 18 }, { label: "더 크게", px: 20 }, { label: "아주 크게", px: 22 }];

function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const toggle = () => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const voice = new SpeechSynthesisUtterance(text);
    voice.lang = "ko-KR";
    voice.rate = 0.9;
    voice.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(voice);
    setSpeaking(true);
  };
  return <Button className="senior-button" onClick={toggle} aria-pressed={speaking}><Volume2 /> {speaking ? "그만 듣기" : "소리로 듣기"}</Button>;
}

export function SeniorAsk({ who }: { who: Who }) {
  const ask = useAsk(who);
  const types = useTypes();
  const [size, setSize] = useState(20);
  const { question, answer, error, loading } = ask;
  const examples = types.find(item => item.type === "senior")?.examples ?? [];
  const urgent = answer?.ticket?.priority === "high";
  const [input, setInput] = useState("");

  useEffect(() => {
    document.documentElement.style.fontSize = `${size}px`;
    return () => { document.documentElement.style.fontSize = ""; };
  }, [size]);

  const again = () => { setInput(""); ask.askAgain(); };

  return <div>
    <div className="senior-bar">
      <div className="senior-sizes" role="group" aria-label="글씨 크기"><b>글씨 크기</b>{SIZES.map(item => <Button key={item.px} variant={size === item.px ? "default" : "outline"} className="senior-button" aria-pressed={size === item.px} onClick={() => setSize(item.px)}>{item.label}</Button>)}</div>
      <ol className="senior-steps">{["질문하기", "답 보기"].map((label, index) => <li key={label} className={ask.page === index ? "on" : ""}>{index + 1}. {label}{ask.page === index && <motion.span layoutId="senior-step" className="senior-step-bar" />}</li>)}</ol>
      <CallButton who="pharmacist" variant="outline" className="senior-button senior-outline">약사에게 전화</CallButton>
    </div>
    <div className="senior-body">
      {ask.page === 0 ? <motion.div key="ask" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="senior-title">무엇을 도와드릴까요?</h1>
        <p className="page-description senior-sub">아래에서 고르시거나 직접 적어 주세요.</p>
        <div className="senior-examples">{examples.map((example, index) => <button key={example} type="button" className="example-button" onClick={() => void ask.send(example)}><span>{index + 1}</span>{example}</button>)}</div>
        <form className="senior-form" onSubmit={e => { e.preventDefault(); void ask.send(input); }}>
          <label htmlFor="senior-q" className="sr-only">질문 내용</label>
          <Textarea id="senior-q" rows={1} maxLength={500} value={input} onChange={e => setInput(e.target.value)} placeholder="궁금하신 내용을 적어 주세요" className="senior-input" />
          <Button type="submit" className="senior-button senior-submit" disabled={!input.trim() || loading}>물어보기</Button>
        </form>
        <p className="senior-note">AI가 공공 의약품 정보로 안내해 드려요. 복용 판단은 약사가 직접 상담해 드릴게요.</p>
      </motion.div> : <div>
        {question.trim() && <p className="senior-question">“{question}”</p>}
        {error && <p className="error-box" role="alert">{error}</p>}
        {loading && <div className="loading-card" aria-live="polite"><p>답을 찾고 있어요</p><Skeleton className="h-7 w-2/5" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-4/5" /></div>}
        {answer && urgent && <motion.section className="senior-danger" role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="senior-danger-head"><span><PhoneCall /></span><div><b>지금 바로 연락해 주세요</b><p>걱정되는 내용이에요. 혼자 참지 마시고 도움을 받으세요.</p></div></div>
          <div className="senior-danger-actions"><CallButton who="119" className="senior-button senior-danger-call">119 전화하기</CallButton><CallButton who="pharmacist" variant="outline" className="senior-button senior-outline">약사에게 전화</CallButton></div>
        </motion.section>}
        {answer && <motion.section key={answer.request_id ?? answer.answer} className="senior-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className={`senior-band band-${routeTone(answer.route)}`}><RouteBadge route={answer.route} /><b>{seniorLine[answer.route] ?? answer.route}</b></div>
          <p className="senior-answer">{answer.answer}</p>
          {answer.ticket && <div className="ticket-number senior-ticket"><p>담당자 접수 번호 <strong>{answer.ticket.ticket_id}</strong></p></div>}
          {!!answer.sources?.length && <p className="senior-source">출처: {answer.sources.map(source => source.doc).join(", ")}</p>}
          {answer.route === "보완 질문" && <div className="senior-followup"><label className="field-label" htmlFor="context">조금 더 알려 주세요</label><Input id="context" value={ask.context} onChange={e => ask.setContext(e.target.value)} placeholder="약 이름이나 상황을 적어 주세요" className="senior-input" /><Button className="senior-button" disabled={!ask.context.trim() || loading} onClick={() => void ask.followUp()}>이어서 답하기 <ArrowRight /></Button></div>}
          <div className="senior-actions"><ListenButton text={answer.answer} /><Button variant="outline" className="senior-button" onClick={again}><Home /> 다시 질문하기</Button></div>
        </motion.section>}
        {!answer && !loading && <Button variant="outline" className="senior-button mt-4" onClick={again}><Home /> 다시 질문하기</Button>}
      </div>}
    </div>
  </div>;
}
