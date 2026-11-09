"use client";

// 해든: 직원 · 어르신 질문 화면이 함께 쓰는 질문 보내기, 보완 질문, 최근 문의 상태입니다.
import { useEffect, useState } from "react";
import { api } from "./api";
import type { Who } from "./session";

export type Answer = {
  request_id?: string;
  route: string;
  answer: string;
  sources: { doc: string; section: string }[];
  ticket: { ticket_id: string; priority?: string } | null;
  agents?: string[];
  reason?: string;
};
export type RequestItem = { request_id: string; question: string; route: string; created_at: string; ticket: { ticket_id: string; status?: string } | null };
export type TypeItem = { type: string; label: string; examples: string[] };

export function useTypes() {
  const [types, setTypes] = useState<TypeItem[]>([]);
  useEffect(() => { api<{ items: TypeItem[] }>("GET", "/api/types", null).then(r => setTypes(r.items)).catch(() => {}); }, []);
  return types;
}

export function useAsk(who: Who) {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RequestItem[]>([]);

  useEffect(() => {
    api<{ items: RequestItem[] }>("GET", `/api/my-requests?user=${encodeURIComponent(who.name)}`, who)
      .then(r => setRecent(r.items.slice(0, 3))).catch(() => {});
  }, [who, answer]);

  const send = async (text: string, nextContext = "", nextAttempt = 1) => {
    if (!text.trim() || loading) return;
    setQuestion(text);
    setError("");
    if (nextAttempt === 1) setAnswer(null); // 이어서 답하기가 실패해도 입력 칸이 남도록 첫 질문일 때만 비웁니다.
    setLoading(true);
    setPage(1);
    try {
      const result = await api<Answer>("POST", "/api/ask", who, { user: who.name, question: text.trim(), context: nextContext, attempt: nextAttempt });
      if (!result.route) throw new Error("죄송해요, 질문을 처리하지 못했어요. 조금 짧게 줄여서 다시 보내 주세요.");
      setAnswer(result);
      setAttempt(nextAttempt);
      setContext("");
    } catch (e) { setError(e instanceof Error ? e.message : "죄송해요, 요청을 처리하지 못했어요. 잠시 뒤에 다시 시도해 주세요."); }
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

  const followUp = () => send(question, context.trim(), attempt + 1);
  return { question, setQuestion, context, setContext, answer, page, setPage, loading, error, recent, send, askAgain, followUp };
}
