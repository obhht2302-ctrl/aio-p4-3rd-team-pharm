"use client";

// 해든: 역할별 접근, 오늘 알림 → 접수 목록 단계, 티켓 처리, 회수 안내 연습 기록을 구현했습니다.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Bell, CheckCircle2, ClipboardList, Megaphone, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { isAdmin, loadWho, type Who } from "@/lib/session";
import { Pager } from "@/components/pager";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Ticket = { ticket_id: string; title: string; requester: string; category: string; priority: string; status: string; created_at?: string };
type Alert = { reason: string; severity: string; message: string; ticket_id?: string; at?: string };
type Notice = { count: number; notices: { phone: string }[] };
const categoryNames: Record<string, string> = { recall: "회수", other: "기타", closing: "마감", stockout: "품절", senior: "어르신", record_status: "접수 확인" };

export default function AdminPage() {
  const [who, setWho] = useState<Who | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [noticeResult, setNoticeResult] = useState<{ id: string; result: Notice } | null>(null);

  const load = async (selected: Who) => {
    setLoading(true);
    try {
      const [alertResult, ticketResult] = await Promise.all([
        api<{ items: Alert[] }>("GET", "/api/admin/alerts", selected),
        api<{ items: Ticket[] }>("GET", "/api/admin/tickets", selected),
      ]);
      setAlerts(alertResult.items);
      setTickets(ticketResult.items.sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high")));
      setLoaded(true);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "목록을 불러오지 못했어요."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const selected = loadWho();
    setWho(selected);
    setReady(true);
    if (isAdmin(selected)) void load(selected!);
  }, []);

  const filtered = useMemo(() => tickets.filter(ticket => filter === "all" || (filter === "urgent" ? ticket.priority === "high" : ticket.status !== "처리 완료")), [tickets, filter]);

  const saveStatus = async (ticket: Ticket, status: string) => {
    if (!who) return;
    setBusy(ticket.ticket_id);
    try {
      await api("PATCH", `/api/admin/tickets/${ticket.ticket_id}`, who, { status });
      setTickets(current => current.map(item => item.ticket_id === ticket.ticket_id ? { ...item, status } : item));
      setError("");
      toast.success("상태를 저장했어요.");
    } catch (e) { setError(e instanceof Error ? e.message : "상태를 저장하지 못했어요."); }
    finally { setBusy(null); }
  };

  const recordNotice = async (ticket: Ticket) => {
    if (!who || who.role !== "pharmacist") return;
    setBusy(ticket.ticket_id);
    try {
      const result = await api<Notice>("POST", `/api/admin/tickets/${ticket.ticket_id}/recall-notice`, who);
      setNoticeResult({ id: ticket.ticket_id, result });
      setError("");
      toast.success("손님 안내 연습 기록을 남겼어요.");
    } catch (e) { setError(e instanceof Error ? e.message : "안내 기록을 남기지 못했어요."); }
    finally { setBusy(null); }
  };

  if (!ready) return <Skeleton className="h-72 w-full" />;
  if (!isAdmin(who)) return <div><div className="page-intro"><p className="eyebrow">{BRAND.service}</p><h1 className="page-title">약사 화면</h1></div><Card className="soft-card max-w-xl"><CardContent className="panel-pad"><ShieldAlert size={30} color="var(--primary)" /><h2 className="section-heading mt-4">접근할 수 없어요</h2><p className="page-description">이 화면은 약사 · 약국장만 볼 수 있어요. 사용자 역할을 확인해 주세요.</p><Link className={buttonVariants({ className: "primary-action mt-5" })} href="/">사용자 선택으로 가기 <ArrowRight size={16} /></Link></CardContent></Card></div>;

  return <div>
    <div className="page-intro"><p className="eyebrow">{BRAND.service}</p><h1 className="page-title">약사 업무 화면</h1><p className="page-description">{who!.name}님, 회수 알림과 담당자에게 넘어온 문의를 확인하세요.</p></div>
    {error && <p className="error-box mb-5" role="alert">{error}</p>}
    {loading && !loaded ? <div className="stack" aria-live="polite" aria-label="목록을 불러오고 있어요"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-44 w-full" /></div> :
    !loaded ? <Button variant="outline" className="secondary-action" onClick={() => void load(who!)}>다시 불러오기</Button> :
    <Pager steps={["오늘 알림", "접수 목록"]} index={page} onIndex={setPage}>
      <div>
        <div className="mb-7 grid gap-4 sm:grid-cols-2">
          <div className="soft-card panel-pad flex items-center justify-between"><div><p className="text-sm text-muted-foreground">확인할 티켓</p><strong className="mt-1 block text-3xl">{tickets.filter(t => t.status !== "처리 완료").length}</strong></div><ClipboardList size={27} color="var(--primary)" /></div>
          <div className="soft-card panel-pad flex items-center justify-between"><div><p className="text-sm text-muted-foreground">긴급 알림</p><strong className="mt-1 block text-3xl">{alerts.filter(a => a.severity === "high").length}</strong></div><Bell size={27} color="#bd4542" /></div>
        </div>
        <section aria-labelledby="alerts-heading"><div className="mb-4 flex items-center gap-2"><Megaphone size={19} color="var(--primary)" /><h2 id="alerts-heading" className="section-heading">회수 · 긴급 알림</h2></div>
          {alerts.length === 0 ? <div className="soft-card panel-pad text-sm text-muted-foreground">새 알림이 없어요.</div> :
            <div className="stack">{alerts.map((alert, index) => <motion.div key={`${alert.ticket_id ?? "alert"}-${index}`} className={`soft-card alert-card ${alert.severity === "high" ? "urgent" : ""}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}><ShieldAlert size={20} /><div><strong>{alert.reason === "urgent" ? "긴급 확인이 필요해요" : "새 알림"}</strong><p>{alert.message}</p>{alert.ticket_id && <span className="request-id">접수 {alert.ticket_id}</span>}</div></motion.div>)}</div>}
        </section>
      </div>
      <section aria-labelledby="tickets-heading"><div className="ticket-toolbar mb-4"><div><h2 id="tickets-heading" className="section-heading">담당자 접수</h2><p className="section-sub">지금 꼭 볼 것 {tickets.filter(t => t.priority === "high" && t.status !== "처리 완료").length}건 · 나머지는 차례대로 보셔도 돼요.</p></div><Tabs value={filter} onValueChange={setFilter}><TabsList className="ticket-tab-list">{[{ value: "all", label: "전체" }, { value: "open", label: "처리할 일" }, { value: "urgent", label: "긴급" }].map(tab => <TabsTrigger key={tab.value} value={tab.value} className="ticket-tab">{tab.label}{filter === tab.value && <motion.span layoutId="ticket-tab-underline" className="ticket-tab-underline" />}</TabsTrigger>)}</TabsList></Tabs></div>
        {filtered.length === 0 ? <div className="soft-card empty-state"><CheckCircle2 size={35} /><strong>표시할 티켓이 없어요</strong><p>다른 항목을 확인해 주세요.</p></div> : <div className="stack"><AnimatePresence initial={false} mode="popLayout">{filtered.map(ticket => <motion.div layout key={ticket.ticket_id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}><Card className={`soft-card gap-0 ${ticket.priority === "high" ? "urgent" : ""}`}><CardContent className="panel-pad">
          <div className="flex flex-wrap items-center gap-2"><Badge variant={ticket.priority === "high" ? "destructive" : "secondary"}>{ticket.priority === "high" ? "긴급" : "일반"}</Badge><Badge variant="outline">{categoryNames[ticket.category] ?? ticket.category}</Badge><span className="request-id ml-auto">{ticket.ticket_id}</span></div>
          <h3 className="mt-4 text-lg font-bold tracking-tight">{ticket.title}</h3><p className="mt-2 text-sm text-muted-foreground">요청자 {ticket.requester} · 현재 상태 <motion.span key={ticket.status} className="font-semibold text-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>{ticket.status}</motion.span></p>
          <div className="ticket-actions"><Button variant="outline" className="secondary-action" disabled={busy === ticket.ticket_id || ticket.status === "처리 중"} onClick={() => saveStatus(ticket, "처리 중")}>처리 중</Button><Button variant="outline" className="secondary-action" disabled={busy === ticket.ticket_id || ticket.status === "처리 완료"} onClick={() => saveStatus(ticket, "처리 완료")}>처리 완료</Button>{ticket.category === "recall" && who!.role === "pharmacist" && <Button className="secondary-action" disabled={busy === ticket.ticket_id} onClick={() => recordNotice(ticket)}>손님 안내 보내기 (연습)</Button>}</div>
          {noticeResult?.id === ticket.ticket_id && <div className="notice-result" aria-live="polite"><strong>연습 기록 · 실제 발송 없음</strong><p>동의한 손님 {noticeResult.result.count}명에게 안내한 것으로 기록했어요.</p><p>가린 번호: {noticeResult.result.notices.map(notice => notice.phone).join(", ")}</p></div>}
        </CardContent></Card></motion.div>)}</AnimatePresence></div>}
      </section>
    </Pager>}
  </div>;
}
