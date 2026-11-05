"use client";

// 해든: 3004의 약사 화면(오늘 알림 → 접수 목록 → 접수 상세)을 API로 연결했습니다. 역할 확인은 화면과 API가 함께 합니다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { CircleAlert, Lock, Send } from "lucide-react";
import { api } from "@/lib/api";
import { isAdmin, useWho, type Who } from "@/lib/session";
import { LoginPanel } from "@/components/login";
import { Pager } from "@/components/pager";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Ticket = { ticket_id: string; title: string; requester: string; category: string; priority: string; status: string; product?: string; note?: string; created_at?: string };
type Alert = { reason: string; severity: string; message: string; ticket_id?: string; at?: string };
type Notice = { count: number; notices: { phone: string }[] };
const categoryNames: Record<string, string> = { recall: "회수", other: "기타", closing: "마감", stockout: "품절", senior: "어르신", record_status: "접수 확인" };
const STATUS = ["접수됨", "처리 중", "처리 완료"];
const FILTERS = [
  { key: "all", label: "전체", test: () => true },
  { key: "new", label: "접수됨", test: (t: Ticket) => t.status === "접수됨" },
  { key: "doing", label: "처리 중", test: (t: Ticket) => t.status === "처리 중" },
  { key: "done", label: "완료", test: (t: Ticket) => t.status === "처리 완료" },
];
const MotionRow = motion.create(TableRow);
const timeLabel = (value?: string) => {
  const date = new Date(value ?? "");
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
};
const statusTone = (status: string) => status === "처리 완료" ? "done" : status === "처리 중" ? "doing" : "new";
const StatusPill = ({ status }: { status: string }) => <span className={`status-pill tone-${statusTone(status)}`}>{status}</span>;

function TicketDetail({ ticket, who, onSaved }: { ticket: Ticket; who: Who; onSaved: (id: string, status: string, note: string) => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [note, setNote] = useState(ticket.note ?? "");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      await api("PATCH", `/api/admin/tickets/${ticket.ticket_id}`, who, { status, note });
      onSaved(ticket.ticket_id, status, note);
      setError("");
      toast.success("상태를 저장했어요.", { description: `${ticket.ticket_id} · ${status}` });
    } catch (e) { setError(e instanceof Error ? e.message : "상태를 저장하지 못했어요."); }
    finally { setSaving(false); }
  };
  const notify = async () => {
    setSending(true);
    try {
      const result = await api<Notice>("POST", `/api/admin/tickets/${ticket.ticket_id}/recall-notice`, who);
      setNotice(result);
      setError("");
      toast.success("손님 안내 연습 기록을 남겼어요.");
    } catch (e) { setError(e instanceof Error ? e.message : "안내 기록을 남기지 못했어요."); }
    finally { setSending(false); }
  };

  return <motion.div className="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
    <div className="detail-head"><span className="detail-id">{ticket.ticket_id}</span>{ticket.priority === "high" && <span className="urgent-pill">긴급</span>}<StatusPill status={ticket.status} /></div>
    <h3 className="detail-title">{ticket.title}</h3>
    <dl className="kv"><dt>요청</dt><dd>{ticket.requester} · {timeLabel(ticket.created_at)}</dd><dt>분류</dt><dd>{categoryNames[ticket.category] ?? ticket.category}</dd>{ticket.product && <><dt>제품</dt><dd>{ticket.product}</dd></>}</dl>
    {error && <p className="error-box" role="alert">{error}</p>}
    <h4 className="section-label">처리 상태</h4>
    <div className="status-switch">{STATUS.map(item => <button key={item} type="button" aria-pressed={status === item} className={status === item ? "on" : ""} onClick={() => setStatus(item)}>{status === item && <motion.span layoutId={`status-${ticket.ticket_id}`} className="status-switch-bg" transition={{ duration: 0.2 }} />}<span className="relative">{item}</span></button>)}</div>
    <label htmlFor="memo" className="field-label mt-1">메모</label>
    <Textarea id="memo" rows={2} className="bg-white" value={note} onChange={e => setNote(e.target.value)} />
    <Button className="primary-action" disabled={saving} onClick={save}>{saving ? "저장하는 중" : "상태 저장"}</Button>
    {ticket.category === "recall" && who.role === "pharmacist" && <div className="notice-box"><div><b>손님 안내 보내기</b><p>이 제품을 산 손님 중 동의한 분만 기록해요. 실제로 발송되지 않아요.</p></div><Button className="primary-action danger-action" disabled={sending} onClick={notify}><Send size={16} /> {sending ? "기록하는 중" : "손님 안내 보내기 (연습)"}</Button></div>}
    {ticket.category === "recall" && who.role === "owner" && <p className="callout"><b>권한 안내</b> 손님 안내는 약사 계정에서만 할 수 있어요.</p>}
    {notice && <div className="notice-result" aria-live="polite"><strong>연습 기록 · 실제 발송 없음</strong><p>동의한 손님 {notice.count}명에게 안내한 것으로 기록했어요.</p><p>가린 번호: {notice.notices.map(item => item.phone).join(", ")}</p></div>}
  </motion.div>;
}

export default function AdminPage() {
  const who = useWho();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async (me: Who) => {
    setLoading(true);
    try {
      const [alertResult, ticketResult] = await Promise.all([
        api<{ items: Alert[] }>("GET", "/api/admin/alerts", me),
        api<{ items: Ticket[] }>("GET", "/api/admin/tickets", me),
      ]);
      const sorted = ticketResult.items.sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high"));
      setAlerts(alertResult.items);
      setTickets(sorted);
      setSelected(current => current ?? sorted[0]?.ticket_id ?? null);
      setLoaded(true);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "목록을 불러오지 못했어요."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin(who)) void load(who!); }, [who]);

  if (who === undefined) return <Skeleton className="h-72 w-full" />;
  if (!who) return <LoginPanel />;
  if (!isAdmin(who)) return <div className="forbidden"><span><Lock size={32} /></span><h1>약사 · 약국장 전용 화면입니다</h1><p>현재 계정으로는 접근할 수 없습니다.</p><Link className={buttonVariants({ className: "primary-action" })} href="/">질문하기로 가기</Link></div>;

  const open = (id?: string) => { if (id) { setSelected(id); setPage(2); } };
  const shown = tickets.filter(FILTERS.find(item => item.key === filter)!.test);
  const ticket = tickets.find(item => item.ticket_id === selected);
  const urgentAlerts = alerts.filter(alert => alert.severity === "high" || alert.severity === "critical");
  const lead = urgentAlerts[0];
  const leadTicket = tickets.find(item => item.ticket_id === lead?.ticket_id);

  return <div>
    {error && <p className="error-box mb-4" role="alert">{error}</p>}
    {loading && !loaded ? <div className="stack" aria-live="polite" aria-label="목록을 불러오고 있어요"><Skeleton className="h-12 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-44 w-full" /></div> :
    !loaded ? <Button variant="outline" className="secondary-action" onClick={() => void load(who)}>다시 불러오기</Button> :
    <Pager steps={["오늘 알림", "접수 목록", "접수 상세"]} index={page} onIndex={setPage}>
      <div>
        <div className="sr-only"><h1>약사 업무 화면</h1></div>
        {lead ? <motion.div className="recall-banner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <span className="recall-icon"><CircleAlert size={24} /></span>
          <div className="recall-text"><span>{leadTicket?.category === "recall" ? "회수 공표 · 연습" : "긴급 확인이 필요해요"}</span><b>{leadTicket?.title ?? lead.message}</b>{lead.ticket_id && <small>접수 {lead.ticket_id}{lead.at ? ` · ${timeLabel(lead.at)}` : ""}</small>}</div>
          <div className="recall-count"><small>확인할 티켓</small><b>{tickets.filter(t => t.status !== "처리 완료").length}</b></div>
          {lead.ticket_id && <Button className="primary-action danger-action" onClick={() => open(lead.ticket_id)}>접수 상세 보기</Button>}
        </motion.div> : <div className="soft-card panel-pad text-sm text-muted-foreground">새 알림이 없어요.</div>}
        {urgentAlerts.length > 0 && <div className="alert-pills">{urgentAlerts.map((alert, index) => <button key={`${alert.ticket_id ?? "alert"}-${index}`} type="button" className="alert-pill" onClick={() => open(alert.ticket_id)}><span className="urgent-pill">긴급</span><span>{tickets.find(item => item.ticket_id === alert.ticket_id)?.title ?? alert.message}<em> · {alert.ticket_id ?? ""}</em></span></button>)}</div>}
        <Button variant="outline" className="primary-action mt-4" onClick={() => setPage(1)}>접수 목록 보기</Button>
      </div>
      <div className="table-card">
        <div className="table-head"><h2>접수 목록 <small>긴급 먼저</small></h2>
          <Tabs value={filter} onValueChange={value => setFilter(String(value))}><TabsList className="ticket-tab-list">{FILTERS.map(item => <TabsTrigger key={item.key} value={item.key} className="ticket-tab">{item.label} {tickets.filter(item.test).length}{filter === item.key && <motion.span layoutId="ticket-tab-underline" className="ticket-tab-underline" />}</TabsTrigger>)}</TabsList></Tabs>
        </div>
        {shown.length === 0 ? <div className="empty-state"><strong>표시할 티켓이 없어요</strong><p>다른 항목을 확인해 주세요.</p></div> :
          <Table className="ticket-table"><TableHeader><TableRow><TableHead className="pl-4">번호</TableHead><TableHead>제목</TableHead><TableHead className="hide-sm">분류</TableHead><TableHead className="hide-sm">요청</TableHead><TableHead className="pr-4">상태</TableHead></TableRow></TableHeader>
            <TableBody>{shown.map(item => <MotionRow key={item.ticket_id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} onClick={() => open(item.ticket_id)} className={`ticket-row ${item.priority === "high" ? "high" : ""} ${item.ticket_id === selected ? "selected" : ""}`}>
              <TableCell className="pl-4 font-bold">{item.ticket_id}</TableCell>
              <TableCell className="whitespace-normal"><div className="flex flex-wrap items-center gap-1.5">{item.priority === "high" && <span className="urgent-pill small">긴급</span>}<button type="button" className="ticket-link">{item.title}</button></div><div className="request-id">{timeLabel(item.created_at)}</div></TableCell>
              <TableCell className="hide-sm">{categoryNames[item.category] ?? item.category}</TableCell>
              <TableCell className="hide-sm">{item.requester}</TableCell>
              <TableCell className="pr-4"><StatusPill status={item.status} /></TableCell>
            </MotionRow>)}</TableBody></Table>}
      </div>
      <div className="detail-card">{ticket ? <TicketDetail key={ticket.ticket_id} ticket={ticket} who={who} onSaved={(id, status, note) => setTickets(current => current.map(item => item.ticket_id === id ? { ...item, status, note } : item))} /> : <div className="empty-state"><strong>목록에서 접수 건을 골라 주세요</strong></div>}</div>
    </Pager>}
  </div>;
}
