// 고른 사용자 · 입장 코드 (sessionStorage, 막혀 있으면 메모리만)
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
export const isAdmin = (who: Who | null) => !!who && (who.role === "pharmacist" || who.role === "owner");
