// 화면 → FastAPI. 스위치 한 곳: NEXT_PUBLIC_API_MODE = mock | real
import { mock } from "./mock";
import type { Who } from "./session";
const MODE = process.env.NEXT_PUBLIC_API_MODE || "mock";
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export const apiMode = MODE;
export async function api<T = any>(method: string, path: string, who: Who | null, body?: unknown): Promise<T> {
  if (MODE !== "real") return mock(method, path, body) as T;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", "X-Entry-Code": who?.code || "", "X-User": encodeURIComponent(who?.name || "") },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("지금 서버가 응답하지 않아요. 잠시 뒤 다시 해 주세요.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청이 실패했어요 (${res.status})`);
  return data as T;
}
