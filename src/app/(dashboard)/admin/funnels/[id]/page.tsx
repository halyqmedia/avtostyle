import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiSettingsForm } from "@/components/admin/ai-settings-form";
import { AiDocumentsForm } from "@/components/admin/ai-documents-form";

export default async function FunnelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.ADMIN_AI_MANAGE);
  const { id } = await params;

  const funnel = await prisma.funnel.findUnique({ where: { id } });
  if (!funnel) notFound();

  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/funnels"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Артқа
        </Link>
        <h1 className="text-xl font-semibold">{funnel.name}</h1>
        <p className="text-sm text-muted-foreground">
          Осы воронкаға бекітілген WhatsApp нөмірлерінен келген лидтерге дәл осы ИИ скрипті мен
          КП/каталог файлдары қолданылады.
        </p>
      </div>

      {!hasApiKey && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">
            GEMINI_API_KEY орнатылмаған — ИИ агент іске қосылса да, хабарлама жіберілмейді. Railway
            айнымалыларына (Variables) GEMINI_API_KEY қосыңыз.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Баптаулар</CardTitle>
        </CardHeader>
        <CardContent>
          <AiSettingsForm
            funnelId={funnel.id}
            settings={{
              aiEnabled: funnel.aiEnabled,
              systemPrompt: funnel.systemPrompt,
              model: funnel.model,
              maxHistoryMessages: funnel.maxHistoryMessages,
              maxOutputTokens: funnel.maxOutputTokens,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">КП мен каталог файлдары</CardTitle>
        </CardHeader>
        <CardContent>
          <AiDocumentsForm
            funnelId={funnel.id}
            hasKpKk={Boolean(funnel.kpMediaKeyKk)}
            hasKpRu={Boolean(funnel.kpMediaKeyRu)}
            hasCatalogKk={Boolean(funnel.catalogMediaKeyKk)}
            hasCatalogRu={Boolean(funnel.catalogMediaKeyRu)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
