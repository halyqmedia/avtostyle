"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertDealAccess } from "@/lib/deal-access";
import { sendWhatsAppMessage, toWhatsAppRecipient } from "@/lib/whatsapp-cloud";

export async function sendDealWhatsAppMessage(dealId: string, body: string) {
  const { session, deal } = await assertDealAccess(dealId);
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Хабарлама бос болмауы керек");

  const client = await prisma.client.findUnique({ where: { id: deal.clientId } });
  const recipient = toWhatsAppRecipient(client?.whatsappId ?? null, client?.phone ?? null);
  if (!recipient) throw new Error("Клиенттің WhatsApp/телефон нөмірі көрсетілмеген");

  const { idMessage } = await sendWhatsAppMessage(recipient, trimmed);

  await prisma.whatsAppMessage.create({
    data: {
      dealId,
      direction: "OUT",
      body: trimmed,
      whatsappMessageId: idMessage,
      sentById: session.user.id,
    },
  });

  revalidatePath(`/crm/deals/${dealId}`);
}
