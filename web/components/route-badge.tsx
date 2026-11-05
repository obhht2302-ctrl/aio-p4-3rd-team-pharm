"use client";

// 해든: 다섯 가지 응답 경로의 색상과 등장 효과를 한곳에서 관리합니다.
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";

const tones: Record<string, string> = {
  "자동 답변": "auto",
  "보완 질문": "ask",
  "담당자 이관": "handoff",
  "권한 없음": "denied",
  "차단": "blocked",
};
export const routeTone = (route: string) => tones[route] ?? "denied";
export const routeLine: Record<string, string> = {
  "자동 답변": "매장 규정 기준 안내",
  "보완 질문": "추가 정보가 필요합니다",
  "담당자 이관": "담당자에게 전달했습니다",
  "권한 없음": "열람 권한이 없습니다",
  "차단": "처리할 수 없는 요청입니다",
};
export const seniorLine: Record<string, string> = {
  "자동 답변": "찾아 드렸어요",
  "보완 질문": "조금만 더 알려 주세요",
  "담당자 이관": "약사에게 전해 드렸어요",
  "권한 없음": "이 내용은 약사에게 여쭤봐 주세요",
  "차단": "이 요청은 도와드리기 어려워요",
};

// 티켓 없는 '담당자 이관' (응답 오류 · 두뇌 멈춤 등)은 '전달했어요'로 보이지 않게. route 값은 그대로(계약), 문구만 바꿉니다.
// tickets_down = 접수 시스템 장애로 DLQ에 보관된 경우 (워크플로우 After handoff 문구와 같게).
export type HandoffState = "sent" | "unsent" | "held";
export const handoffState = (answer: { route: string; ticket: unknown; reason?: string }): HandoffState =>
  answer.route !== "담당자 이관" || answer.ticket ? "sent" : answer.reason === "tickets_down" ? "held" : "unsent";
export const UNSENT_LINE = "아직 접수되지 않았어요";
export const HELD_LINE = "요청은 보관됐어요 · 확인되는 대로 연락드려요";
export const RETRY_NOTE = "잠시 후 다시 시도해 주세요.";

export function RouteBadge({ route }: { route: string }) {
  return <motion.span className="inline-flex" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}>
    <Badge className={`route-badge tone-${routeTone(route)}`}><i className="route-dot" />{route}</Badge>
  </motion.span>;
}
