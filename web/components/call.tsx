"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Mic, MicOff, Phone, PhoneOff, Siren, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { PersonAvatar } from "@/components/avatar";

type Who = "pharmacist" | "119";
type Phase = "dialing" | "talking" | "ended";

// 연습용 전화창이에요. 실제로 전화를 걸지 않고, 연결 → 통화 → 종료 화면만 보여 줘요.
const CALLEE = {
  pharmacist: { name: "이서준 약사", sub: `${BRAND.pharmacy} 상담대`, hello: `네, ${BRAND.pharmacy} 약사 이서준입니다. 무엇을 도와드릴까요?` },
  "119": { name: "119", sub: "긴급 신고", hello: "네, 119입니다. 어디가 불편하신가요?" },
};

function CallWindow({ who, onClose }: { who: Who; onClose: () => void }) {
  const [phase, setPhase] = React.useState<Phase>("dialing");
  const [sec, setSec] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [speaker, setSpeaker] = React.useState(false);
  const c = CALLEE[who];

  React.useEffect(() => {
    if (phase === "dialing") {
      const t = setTimeout(() => setPhase("talking"), 2200);
      return () => clearTimeout(t);
    }
    if (phase === "talking") {
      const t = setInterval(() => setSec((s) => s + 1), 1000);
      return () => clearInterval(t);
    }
    const t = setTimeout(onClose, 1600);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const time = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const state = phase === "dialing" ? "연결하고 있어요" : phase === "talking" ? `통화 중 ${time}` : "통화가 끝났어요";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={`${c.name} 전화`}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex w-full max-w-[24rem] flex-col items-center gap-4 rounded-3xl bg-[#1d2421] p-6 text-center text-white"
      >
        {who === "pharmacist" ? (
          <PersonAvatar name="이서준" className="size-24" />
        ) : (
          <span className="grid size-24 place-items-center rounded-full bg-[#c0392b]">
            <Siren className="size-12" />
          </span>
        )}
        <div>
          <b className="block text-2xl">{c.name}</b>
          <span className="block text-base text-white/70">{c.sub}</span>
        </div>
        <p className="text-lg font-semibold tabular-nums" role="status">
          {state}
        </p>
        {phase === "talking" && <p className="rounded-xl bg-white/10 px-4 py-3 text-base">“{c.hello}”</p>}

        {phase !== "ended" && (
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              aria-pressed={muted}
              disabled={phase !== "talking"}
              onClick={() => setMuted((v) => !v)}
              className={cn("flex min-h-12 min-w-20 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-base disabled:opacity-40", muted ? "bg-white text-black" : "bg-white/10")}
            >
              {muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
              음소거
            </button>
            <button
              type="button"
              aria-label="전화 끊기"
              onClick={() => setPhase("ended")}
              className="grid size-16 place-items-center rounded-full bg-[#c0392b] text-white transition-transform active:scale-95"
            >
              <PhoneOff className="size-7" />
            </button>
            <button
              type="button"
              aria-pressed={speaker}
              disabled={phase !== "talking"}
              onClick={() => setSpeaker((v) => !v)}
              className={cn("flex min-h-12 min-w-20 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-base disabled:opacity-40", speaker ? "bg-white text-black" : "bg-white/10")}
            >
              <Volume2 className="size-6" />
              스피커
            </button>
          </div>
        )}
        <p className="text-base text-white/60">연습 화면이라 실제로 전화가 걸리지는 않아요</p>
      </motion.div>
    </div>
  );
}

export function CallButton({ who, children, ...props }: { who: Who; children: React.ReactNode } & Omit<React.ComponentProps<typeof Button>, "onClick">) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <>
      <Button {...props} onClick={() => setOpen(true)}>
        <Phone /> {children}
      </Button>
      {open && <CallWindow who={who} onClose={close} />}
    </>
  );
}
