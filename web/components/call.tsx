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
  "119": { name: "119", sub: "긴급 신고", hello: "" },
};
const DIAL_MS: Record<Who, number> = { pharmacist: 2200, "119": 6000 }; // 119는 어르신이 안내 문구를 다 읽을 시간을 둠

function CallWindow({ who, onClose, note }: { who: Who; onClose: () => void; note?: string }) {
  const [phase, setPhase] = React.useState<Phase>("dialing");
  const [sec, setSec] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [speaker, setSpeaker] = React.useState(false);
  const c = CALLEE[who];

  React.useEffect(() => {
    if (phase === "dialing") {
      const t = setTimeout(() => setPhase("talking"), DIAL_MS[who]);
      return () => clearTimeout(t);
    }
    if (phase === "talking") {
      const t = setInterval(() => setSec((s) => s + 1), 1000);
      return () => clearInterval(t);
    }
    if (who === "119") return; // 119는 [닫기]로 직접 닫음
    const t = setTimeout(onClose, 1600);
    return () => clearTimeout(t);
  }, [phase, onClose, who]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const time = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const state = phase === "dialing" ? (who === "119" ? "119에 연결하고 있어요." : "연결하고 있어요") : phase === "talking" ? `통화 중 ${time}` : "통화가 끝났어요";

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
        {phase === "talking" && c.hello && <p className="rounded-xl bg-white/10 px-4 py-3 text-base">“{c.hello}”</p>}
        {phase === "dialing" && who === "119" && <p className="rounded-xl bg-white/10 px-4 py-3 text-base">전화가 연결되면 드신 약 이름과 지금 증상을 천천히 말씀해 주세요. 약 봉투나 상자가 있으면 손에 들고 계세요.</p>}
        {who === "119" && note && <p className="text-base text-white/80">{note}</p>}

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
        {phase === "ended" && who === "119" && <Button variant="outline" className="senior-button text-black" onClick={onClose}>닫기</Button>}
        {who === "pharmacist" && <p className="text-base text-white/60">연습 화면이라 실제로 전화가 걸리지는 않아요</p>}
      </motion.div>
    </div>
  );
}

// 고객 화면의 긴급 버튼: 시스템이 위험 신호로 판정한 답에서만 보여요 (약사에게 전화하는 버튼은 두지 않음).
// 확인창 → 가상 통화창. 실제로 걸지 않아요 (tel: 링크 없음). 그 답이 이미 약사 화면에 긴급 접수로 올라가 있으면 번호를 알려 줘요.
export function EmergencyCall({ ticketId }: { ticketId?: string }) {
  const note = ticketId ? `약사님 화면에도 긴급 접수 ${ticketId}로 이미 올라가 있어요.` : undefined;
  const [step, setStep] = React.useState<"idle" | "confirm" | "call">("idle");
  const opener = React.useRef<HTMLButtonElement>(null);
  const close = React.useCallback(() => {
    setStep("idle");
    opener.current?.focus();
  }, []);

  React.useEffect(() => {
    if (step !== "confirm") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, close]);

  return (
    <div className="senior-emergency">
      <Button ref={opener} className="senior-button senior-danger-call" onClick={() => setStep("confirm")}>🚨 긴급 상황이에요 (119 연결)</Button>
      <p>숨쉬기 힘들거나, 의식이 흐려지거나, 같이 먹으면 안 되는 약을 먹고 몸에 이상이 생겼을 때만 눌러 주세요.</p>
      {step === "confirm" && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4" role="alertdialog" aria-modal="true" aria-labelledby="sos-title" aria-describedby="sos-text">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="sos-box">
            <h2 id="sos-title">지금 정말 위급한 상황인가요?</h2>
            <p id="sos-text">이 버튼은 119로 바로 연결돼요.{note ? ` ${note}` : ""}</p>
            <p className="sos-warn">⚠ 장난이나 거짓 신고는 법에 따라 과태료나 형사처벌을 받을 수 있어요.</p>
            <div className="sos-actions">
              <Button variant="outline" autoFocus className="senior-button senior-outline" onClick={close}>취소</Button>
              <Button className="senior-button senior-danger-call" onClick={() => setStep("call")}>네, 119에 연결할게요</Button>
            </div>
          </motion.div>
        </div>
      )}
      {step === "call" && <CallWindow who="119" onClose={close} note={note} />}
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
