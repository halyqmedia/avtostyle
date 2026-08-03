import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { QuickReplyRow } from "@/components/admin/quick-reply-row";
import { CreateQuickReplyForm } from "@/components/admin/create-quick-reply-form";

export default async function AdminQuickRepliesPage() {
  await requirePermission(PERMISSIONS.ADMIN_QUICK_REPLIES_MANAGE);

  const replies = await prisma.quickReply.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Менеджерлер WhatsApp чатында бір батырма басып жіберетін дайын жауаптар.
      </p>
      <div className="flex flex-col gap-2">
        {replies.map((r) => (
          <QuickReplyRow key={r.id} reply={r} />
        ))}
      </div>
      <CreateQuickReplyForm />
    </div>
  );
}
