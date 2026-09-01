import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getChatConversations } from "@/lib/whatsapp-inbox";
import { ConversationList } from "@/components/crm/conversation-list";

export default async function ChatsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const canViewAll = hasPermission(session.user.permissions, PERMISSIONS.DEALS_VIEW_ALL);
  const canViewOwn = hasPermission(session.user.permissions, PERMISSIONS.DEALS_VIEW_OWN);
  if (!canViewAll && !canViewOwn) redirect("/no-access");

  const conversations = await getChatConversations({
    assignedToId: canViewAll ? undefined : session.user.id,
  });

  return (
    <div className="flex h-[calc(100dvh-96px)] min-h-[500px] gap-0 overflow-hidden rounded-xl border">
      <ConversationList items={conversations} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
