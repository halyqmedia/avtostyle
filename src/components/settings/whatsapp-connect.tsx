"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  connectMyWhatsApp,
  disconnectMyWhatsApp,
  getMyWhatsAppStatus,
  type WhatsAppSessionStatus,
} from "@/actions/whatsapp-sessions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const POLL_MS = 2500;

const STATUS_LABEL: Record<WhatsAppSessionStatus["status"], string> = {
  NOT_CONNECTED: "Қосылмаған",
  PENDING: "QR күтілуде",
  CONNECTED: "Қосылған",
  DISCONNECTED: "Қайта қосылуда...",
  LOGGED_OUT: "Шықты (қайта қосу керек)",
};

export function WhatsAppConnect({ initial }: { initial: WhatsAppSessionStatus }) {
  const [status, setStatus] = useState<WhatsAppSessionStatus>(initial);
  const [pending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startPolling() {
    stopPolling();
    intervalRef.current = setInterval(async () => {
      const next = await getMyWhatsAppStatus();
      setStatus(next);
      if (next.status === "CONNECTED" || next.status === "NOT_CONNECTED" || next.status === "LOGGED_OUT") {
        stopPolling();
      }
    }, POLL_MS);
  }

  useEffect(() => {
    if (status.status === "PENDING" || status.status === "DISCONNECTED") startPolling();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function connect() {
    startTransition(async () => {
      try {
        await connectMyWhatsApp();
        const next = await getMyWhatsAppStatus();
        setStatus(next);
        startPolling();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Қосылмады");
      }
    });
  }

  function disconnect() {
    startTransition(async () => {
      try {
        stopPolling();
        await disconnectMyWhatsApp();
        setStatus({ status: "NOT_CONNECTED", qr: null, phoneNumber: null, lastError: null });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ажыратылмады");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant={status.status === "CONNECTED" ? "default" : "secondary"}>
          {STATUS_LABEL[status.status]}
        </Badge>
        {status.phoneNumber && <span className="text-sm text-muted-foreground">{status.phoneNumber}</span>}
      </div>

      {status.status === "PENDING" && status.qr && (
        <div className="flex flex-col items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- locally generated data: URL QR code */}
          <img src={status.qr} alt="WhatsApp QR коды" className="size-56 rounded-md border bg-white p-2" />
          <p className="max-w-sm text-xs text-muted-foreground">
            Телефоныңызда WhatsApp → Баптаулар → Байланысқан құрылғылар → Құрылғы қосу арқылы осы кодты сканерлеңіз.
          </p>
        </div>
      )}

      {status.status === "DISCONNECTED" && (
        <p className="text-xs text-muted-foreground">
          Байланыс үзілді, автоматты түрде қайта қосылуда... {status.lastError && `(${status.lastError})`}
        </p>
      )}

      <div className="flex gap-2">
        {status.status === "CONNECTED" ? (
          <Button size="sm" variant="destructive" disabled={pending} onClick={disconnect}>
            Ажырату
          </Button>
        ) : (
          <Button size="sm" disabled={pending || status.status === "PENDING"} onClick={connect}>
            {status.status === "PENDING" ? "QR күтілуде..." : "WhatsApp қосу"}
          </Button>
        )}
      </div>
    </div>
  );
}
