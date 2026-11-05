// 고른 사용자 · 입장 코드 (sessionStorage, 막혀 있으면 메모리만)
import { useEffect, useState } from "react";

export type Who = { name: string; role: string; code: string };
let memory: Who | null = null;
export function loadWho(): Who | null {
  try { const raw = sessionStorage.getItem("team3-who"); return raw ? (JSON.parse(raw) as Who) : memory; } catch { return memory; }
}
export function saveWho(who: Who | null) {
  memory = who;
  try { who ? sessionStorage.setItem("team3-who", JSON.stringify(who)) : sessionStorage.removeItem("team3-who"); } catch { /* 사생활 모드 */ }
  window.dispatchEvent(new Event("team3-session-change"));
}
export const isAdmin = (who: Who | null | undefined) => !!who && (who.role === "pharmacist" || who.role === "owner");
// undefined = 아직 읽는 중, null = 들어오기 전
export function useWho(): Who | null | undefined {
  const [who, setWho] = useState<Who | null | undefined>(undefined);
  useEffect(() => {
    const sync = () => setWho(loadWho());
    sync();
    window.addEventListener("team3-session-change", sync);
    return () => window.removeEventListener("team3-session-change", sync);
  }, []);
  return who;
}
