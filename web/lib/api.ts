// 해든: 화면 요청을 연습 데이터와 FastAPI 사이에서 전환하고 오류를 짧은 한국어로 보여 줍니다.
import { mock } from "./mock";
import type { Who } from "./session";
const MODE = process.env.NEXT_PUBLIC_API_MODE || "mock";
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export async function api<T = unknown>(method: string, path: string, who: Who | null, body?: unknown): Promise<T> {
  if (MODE !== "real") return mock(method, path, body, who) as T;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", "X-Entry-Code": who?.code || "", "X-User": encodeURIComponent(who?.name || "") },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("지금 서버가 응답하지 않아요. 잠시 뒤에 다시 시도해 주세요.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = res.status === 401 ? "입장 코드가 맞지 않아요. 한 번 더 확인해 주세요." :
      res.status === 403 ? "이 화면을 볼 권한이 없어요." :
      res.status === 404 ? "요청한 내용을 찾지 못했어요." :
      "지금 서버가 응답하지 않아요. 잠시 뒤에 다시 시도해 주세요.";
    throw new Error(typeof data.error === "string" && data.error ? data.error : fallback);
  }
  return data as T;
}

// 퇴근 인수인계 (서버 저장): 남길 말을 보내면 서버가 지금 열린 접수 건(번호 · 제목 · 상태)을 붙여 저장 → 어느 태블릿에서 들어와도 보임
export type Handover = { id: number; by: string; note: string; open: { ticket_id: string; title: string; status: string }[]; at: string; done_at: string | null; done_by: string | null };
export const getHandover = (who: Who) => api<{ item: Handover | null }>("GET", "/api/admin/handover", who);
export const leaveHandover = (who: Who, note: string) => api<{ item: Handover }>("POST", "/api/admin/handover", who, { note });
export const doneHandover = (who: Who, id: number) => api<{ item: Handover }>("POST", `/api/admin/handover/${id}/done`, who);
