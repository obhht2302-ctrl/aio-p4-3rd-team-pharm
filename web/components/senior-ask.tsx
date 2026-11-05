"use client";

// 해든: 3004의 고객(어르신) 화면입니다. 글씨 크기 단계가 rem으로 화면 전체를 키우고, 예시는 /api/types 값을 씁니다.
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Home, Mic, PhoneCall, Square, Volume2 } from "lucide-react";
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

// 말로 묻기: 브라우저 내장 음성 인식 (크롬 · 사파리, 키 · 서버 없음). 말소리는 브라우저의 음성 인식 서비스로 가서 글자로만 돌아옵니다.
// 지원하지 않는 브라우저(파이어폭스 등)에서는 마이크 버튼을 숨깁니다.
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionClass = new () => Recognition;

function recognitionClass(): RecognitionClass | null {
  if (typeof window === "undefined") return null;
  const speech = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition ?? null;
}

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "마이크를 쓸 수 있게 허락해 주세요. 주소창 옆 마이크 표시를 눌러 '허용'을 고르시면 돼요.",
  "service-not-allowed": "이 브라우저에서는 말로 묻기를 쓸 수 없어요. 아래에 글로 적어 주세요.",
  "no-speech": "말씀이 들리지 않았어요. 버튼을 다시 누르고 말씀해 주세요.",
  "audio-capture": "마이크를 찾지 못했어요. 마이크가 연결돼 있는지 봐 주세요.",
  "network": "인터넷이 불안정해서 알아듣지 못했어요. 버튼을 다시 눌러 주세요.",
};

function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState("");
  const current = useRef<Recognition | null>(null);
  useEffect(() => {
    setSupported(!!recognitionClass());
    return () => current.current?.abort();
  }, []);

  const start = () => {
    const Speech = recognitionClass();
    if (!Speech) return;
    try { window.speechSynthesis?.cancel(); } catch { /* 읽어 주기가 없는 브라우저 */ }
    current.current?.abort();
    const recognition = new Speech();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = false; // 말이 멈추면 저절로 끝남
    recognition.maxAlternatives = 1;
    let done = "";
    let latest = "";
    recognition.onresult = event => {
      let partial = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (result.isFinal) done += result[0].transcript; else partial += result[0].transcript;
      }
      latest = (done + partial).trim();
      onText(latest);
    };
    recognition.onerror = event => { if (event.error !== "aborted") setError(MIC_ERRORS[event.error] ?? "알아듣지 못했어요. 버튼을 다시 눌러 주세요."); };
    recognition.onend = () => {
      setListening(false);
      current.current = null;
      const text = done.trim() || latest;
      if (text) { onText(text); setHeard(text); }
    };
    setHeard("");
    setError("");
    current.current = recognition;
    setListening(true);
    try { recognition.start(); } catch { setListening(false); current.current = null; setError("말로 묻기를 시작하지 못했어요. 버튼을 다시 눌러 주세요."); }
  };
  const stop = () => current.current?.stop();
  const clear = () => { current.current?.abort(); setHeard(""); setError(""); };
  return { supported, listening, heard, error, start, stop, clear };
}

export function SeniorAsk({ who }: { who: Who }) {
  const ask = useAsk(who);
  const types = useTypes();
  const [size, setSize] = useState(20);
  const { question, answer, error, loading } = ask;
  const examples = types.find(item => item.type === "senior")?.examples ?? [];
  const urgent = answer?.ticket?.priority === "high";
  const [input, setInput] = useState("");
  const [spoken, setSpoken] = useState(""); // 말로 받은 문장은 입력칸과 따로 둠 (입력칸에 남지 않게)
  const voice = useSpeech(setSpoken);
  const followVoice = useSpeech(ask.setContext);

  // 고른 글씨 크기는 이 탭에서 다시 들어와도 유지합니다.
  useEffect(() => {
    try { const saved = Number(sessionStorage.getItem("team3-senior-size")); if (saved) setSize(saved); } catch { /* 사생활 모드 */ }
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = `${size}px`;
    try { sessionStorage.setItem("team3-senior-size", String(size)); } catch { /* 사생활 모드 */ }
    return () => { document.documentElement.style.fontSize = ""; };
  }, [size]);

  const again = () => { setInput(""); setSpoken(""); voice.clear(); followVoice.clear(); ask.askAgain(); };
  const sendVoice = () => { const text = spoken.trim(); voice.clear(); setSpoken(""); void ask.send(text); };

  return <div>
    <div className="senior-bar">
      <div className="senior-sizes" role="group" aria-label="글씨 크기"><b>글씨 크기</b>{SIZES.map(item => <Button key={item.px} variant={size === item.px ? "default" : "outline"} className="senior-button" aria-pressed={size === item.px} onClick={() => setSize(item.px)}>{item.label}</Button>)}</div>
      <ol className="senior-steps">{["질문하기", "답 보기"].map((label, index) => <li key={label} className={ask.page === index ? "on" : ""}>{index + 1}. {label}{ask.page === index && <motion.span layoutId="senior-step" className="senior-step-bar" />}</li>)}</ol>
      <CallButton who="pharmacist" variant="outline" className="senior-button senior-outline">약사에게 전화</CallButton>
    </div>
    <div className="senior-body">
      {ask.page === 0 ? <motion.div key="ask" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="senior-title">무엇을 도와드릴까요?</h1>
        <p className="page-description senior-sub">{voice.supported ? "말로 물어보시거나, 아래에서 고르시거나, 직접 적어 주세요." : "아래에서 고르시거나 직접 적어 주세요."}</p>
        {voice.supported && <section className="senior-voice" aria-label="말로 물어보기">
          <button type="button" className={voice.listening ? "senior-mic on" : "senior-mic"} onClick={voice.listening ? voice.stop : voice.start} aria-pressed={voice.listening} disabled={loading}>
            <span className="senior-mic-icon">{voice.listening ? <Square /> : <Mic />}</span>
            <span className="senior-mic-text"><b>{voice.listening ? "듣고 있어요" : voice.heard ? "다시 말하기" : "말로 물어보기"}</b><small>{voice.listening ? "말씀이 끝나면 저절로 멈춰요" : voice.heard ? "다르게 알아들었으면 다시 눌러 주세요" : "누르고 궁금한 것을 말씀하세요"}</small></span>
          </button>
          {voice.listening && <p className="senior-heard" aria-live="polite">{spoken || "말씀해 주세요…"}</p>}
          {voice.error && <p className="error-box" role="alert">{voice.error}</p>}
          {!voice.listening && voice.heard && <div className="senior-heard-box">
            <p className="senior-heard" aria-live="polite">“{spoken}”</p>
            <div className="senior-voice-actions">
              <Button className="senior-button senior-submit" onClick={sendVoice} disabled={!spoken.trim() || loading}>이대로 물어보기 <ArrowRight /></Button>
            </div>
          </div>}
        </section>}
        <div className="senior-examples">{examples.map((example, index) => <button key={example} type="button" className="example-button" onClick={() => void ask.send(example)}><span>{index + 1}</span>{example}</button>)}</div>
        <form className="senior-form" onSubmit={e => { e.preventDefault(); void ask.send(input); }}>
          <label htmlFor="senior-q" className="sr-only">질문 내용</label>
          <Textarea id="senior-q" rows={1} maxLength={500} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask.send(input); } }} placeholder="궁금하신 내용을 적어 주세요" className="senior-input" />
          <Button type="submit" className="senior-button senior-submit" disabled={!input.trim() || loading}>물어보기</Button>
        </form>
        <p className="senior-note">AI가 공공 의약품 정보로 안내해 드려요. 복용 판단은 약사가 직접 상담해 드릴게요.</p>
      </motion.div> : <div>
        {question.trim() && <p className="senior-question">“{question}”</p>}
        {error && <p className="error-box" role="alert">{error}</p>}
        {loading && <div className="loading-card" aria-live="polite"><p>약국 안내 문서에서 찾고 있어요. 잠시만 기다려 주세요.</p><Skeleton className="h-7 w-2/5" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-4/5" /></div>}
        {answer && urgent && <motion.section className="senior-danger" role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="senior-danger-head"><span><PhoneCall /></span><div><b>지금 바로 연락해 주세요</b><p>걱정되는 내용이에요. 혼자 참지 마시고 도움을 받으세요.</p></div></div>
          <div className="senior-danger-actions"><CallButton who="119" className="senior-button senior-danger-call">119 전화하기</CallButton><CallButton who="pharmacist" variant="outline" className="senior-button senior-outline">약사에게 전화</CallButton></div>
        </motion.section>}
        {answer && <motion.section key={answer.request_id ?? answer.answer} className="senior-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className={`senior-band band-${routeTone(answer.route)}`}><RouteBadge route={answer.route} /><b>{seniorLine[answer.route] ?? answer.route}</b></div>
          <p className="senior-answer">{answer.answer}</p>
          {answer.ticket && <div className="ticket-number senior-ticket"><p>담당자 접수 번호 <strong>{answer.ticket.ticket_id}</strong></p><p className="ticket-say">카운터에서 이 번호를 말씀해 주세요</p></div>}
          {!!answer.sources?.length && <p className="senior-source">출처: {answer.sources.map(source => source.doc).join(", ")}</p>}
          {answer.route === "보완 질문" && <div className="senior-followup"><label className="field-label" htmlFor="context">조금 더 알려 주세요</label><Input id="context" value={ask.context} onChange={e => ask.setContext(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing && ask.context.trim()) void ask.followUp(); }} placeholder="약 이름이나 상황을 적어 주세요" className="senior-input" />{followVoice.supported && <Button variant="outline" className="senior-button senior-outline" onClick={followVoice.listening ? followVoice.stop : followVoice.start} aria-pressed={followVoice.listening}>{followVoice.listening ? <><Square /> 듣고 있어요</> : <><Mic /> 말로 하기</>}</Button>}{followVoice.error && <p className="error-box" role="alert">{followVoice.error}</p>}<Button className="senior-button" disabled={!ask.context.trim() || loading} onClick={() => void ask.followUp()}>이어서 답하기 <ArrowRight /></Button></div>}
          <div className="senior-actions"><ListenButton text={answer.answer} /><Button variant="outline" className="senior-button" onClick={again}><Home /> 다시 질문하기</Button></div>
        </motion.section>}
        {!answer && !loading && <Button variant="outline" className="senior-button mt-4" onClick={again}><Home /> 다시 질문하기</Button>}
      </div>}
    </div>
  </div>;
}
