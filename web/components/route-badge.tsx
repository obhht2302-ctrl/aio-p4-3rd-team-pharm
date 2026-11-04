"use client";

// 해든: 다섯 가지 응답 경로의 색상과 등장 효과를 한곳에서 관리합니다.
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";

const classes: Record<string, string> = {
  "자동 답변": "route-auto",
  "보완 질문": "route-ask",
  "담당자 이관": "route-handoff",
  "권한 없음": "route-denied",
  "차단": "route-blocked",
};

export function RouteBadge({ route }: { route: string }) {
  return <motion.span initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
    <Badge className={`route-badge ${classes[route] ?? "route-denied"}`}>{route}</Badge>
  </motion.span>;
}
