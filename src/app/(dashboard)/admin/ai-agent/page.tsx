import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getOrCreateAiSettings } from "@/actions/ai-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiSettingsForm } from "@/components/admin/ai-settings-form";
import { AiDocumentsForm } from "@/components/admin/ai-documents-form";

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default async function AiAgentPage() {
  await requirePermission(PERMISSIONS.ADMIN_AI_MANAGE);

  const [settings, todayMessages, monthMessages, hasApiKey] = await Promise.all([
    getOrCreateAiSettings(),
    prisma.whatsAppMessage.findMany({
      where: { aiGenerated: true, createdAt: { gte: startOfDay() } },
      select: { promptTokens: true, completionTokens: true },
    }),
    prisma.whatsAppMessage.findMany({
      where: { aiGenerated: true, createdAt: { gte: startOfMonth() } },
      select: { promptTokens: true, completionTokens: true },
    }),
    Promise.resolve(Boolean(process.env.GEMINI_API_KEY)),
  ]);

  const sumTokens = (rows: { promptTokens: number | null; completionTokens: number | null }[]) =>
    rows.reduce((s, r) => s + (r.promptTokens ?? 0) + (r.completionTokens ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        ИИ агент — жаңа WhatsApp лидтеріне автоматты жауап беріп, сатуға дейін жеткізуге тырысатын
        көмекші. Кез келген сделкада менеджер оны кез келген сәтте өшіріп, әңгімені өз қолына ала
        алады (сделка бетінде).
      </p>

      {!hasApiKey && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">
            GEMINI_API_KEY орнатылмаған — ИИ агент іске қосылса да, хабарлама жіберілмейді. Railway
            айнымалыларына (Variables) GEMINI_API_KEY қосыңыз.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Бүгінгі токен саны</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {new Intl.NumberFormat("ru-RU").format(sumTokens(todayMessages))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Осы айдағы токен саны</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {new Intl.NumberFormat("ru-RU").format(sumTokens(monthMessages))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Баптаулар</CardTitle>
        </CardHeader>
        <CardContent>
          <AiSettingsForm
            settings={{
              enabled: settings.enabled,
              systemPrompt: settings.systemPrompt,
              model: settings.model,
              maxHistoryMessages: settings.maxHistoryMessages,
              maxOutputTokens: settings.maxOutputTokens,
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
            hasKpKk={Boolean(settings.kpMediaKeyKk)}
            hasKpRu={Boolean(settings.kpMediaKeyRu)}
            hasCatalogKk={Boolean(settings.catalogMediaKeyKk)}
            hasCatalogRu={Boolean(settings.catalogMediaKeyRu)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
