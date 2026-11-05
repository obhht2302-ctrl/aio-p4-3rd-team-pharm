"use client";

import * as React from "react";
import { BatteryFull, Wifi } from "lucide-react";

// 넓은 화면(PC)에서는 매장 태블릿처럼 테두리 안에 보여 줘요. 진짜 태블릿 · 휴대폰에서는 화면을 꽉 채워요.
export function TabletFrame({ children }: { children: React.ReactNode }) {
  const [now, setNow] = React.useState<string | null>(null);
  React.useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="tablet-stage">
      <div className="tablet-device">
        <div className="tablet-status" aria-hidden>
          <span className="tabular-nums">{now ?? ""}</span>
          <span className="truncate">매장 업무 태블릿</span>
          <span className="flex items-center gap-1.5">
            <Wifi className="size-3.5" />
            <span className="tabular-nums">87%</span>
            <BatteryFull className="size-4" />
          </span>
        </div>
        <div className="tablet-clip"><div className="tablet-screen">{children}</div></div>
      </div>
    </div>
  );
}
