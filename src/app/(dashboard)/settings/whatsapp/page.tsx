import { requireSession } from "@/lib/auth-guard";
import { getMyWhatsAppStatus } from "@/actions/whatsapp-sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsAppConnect } from "@/components/settings/whatsapp-connect";

export default async function MyWhatsAppPage() {
  await requireSession();
  const status = await getMyWhatsAppStatus();

  return (
    <div className="grid max-w-xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Менің WhatsApp-ым</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Өз телефоныңыздағы WhatsApp-ты осында QR код арқылы қосыңыз — содан кейін клиенттермен өз нөміріңізден
            жазысасыз, ал бүкіл хат-хабар осы CRM-де сақталады.
          </p>
          <WhatsAppConnect initial={status} />
        </CardContent>
      </Card>
    </div>
  );
}
