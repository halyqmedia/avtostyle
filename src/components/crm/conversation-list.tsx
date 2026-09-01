"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { kk } from "date-fns/locale";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { ChatConversation } from "@/lib/whatsapp-inbox";

export function ConversationList({ items }: { items: ChatConversation[] }) {
  const router = useRouter();
  const params = useParams<{ dealId?: string }>();
  const activeDealId = params?.dealId;
  const [search, setSearch] = useState("");

  // Client can reply any time between polls — pick up new/reordered conversations without a manual reload.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [router]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.clientName.toLowerCase().includes(query) || (item.clientPhone ?? "").toLowerCase().includes(query),
    );
  }, [items, search]);

  return (
    <div className="flex h-full min-h-0 w-[300px] shrink-0 flex-col border-r">
      <div className="shrink-0 border-b p-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Клиент немесе телефон..."
            className="h-9 pl-8"
          />
        </div>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {items.length === 0 ? "Хат-хабары бар мәміле табылмады." : "Ештеңе табылмады."}
          </p>
        ) : (
          filtered.map((item) => {
            const active = activeDealId === item.dealId;
            const awaitingReply = item.lastMessage.direction === "IN";
            return (
              <Link
                key={item.dealId}
                href={`/crm/chats/${item.dealId}`}
                className={cn(
                  "flex items-start gap-2.5 border-b px-3 py-2.5 text-sm transition-colors hover:bg-muted/60",
                  active && "bg-muted",
                )}
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {item.clientName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{item.clientName}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(item.lastMessage.createdAt), { locale: kk })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.aiTemperature === "HOT" && <span className="shrink-0 text-xs">🔴</span>}
                    <p
                      className={cn(
                        "truncate text-xs text-muted-foreground",
                        awaitingReply && "font-medium text-foreground",
                      )}
                    >
                      {item.lastMessage.direction === "OUT" ? "Сіз: " : ""}
                      {item.lastMessage.messageType === "text" ? item.lastMessage.body : "📎 Файл"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
