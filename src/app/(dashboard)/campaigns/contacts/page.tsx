import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactsBoard } from "@/components/campaigns/contacts-board";

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort();
}

export default async function CampaignContactsPage() {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const [contacts, approvedTemplates, sequences] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { client: { include: { deals: { orderBy: { createdAt: "desc" }, take: 1 } } } },
    }),
    prisma.whatsAppTemplate.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, bodyText: true },
    }),
    prisma.sequence.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, steps: { select: { id: true } } },
    }),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Клиенттер базасы</CardTitle>
      </CardHeader>
      <CardContent>
        <ContactsBoard
          contacts={contacts.map((c) => ({
            id: c.id,
            phone: c.phone,
            fullName: c.fullName,
            city: c.city,
            profession: c.profession,
            category: c.category,
            status: c.status,
            tags: c.tags,
            notes: c.notes,
            dealId: c.client?.deals[0]?.id ?? null,
          }))}
          cities={distinct(contacts.map((c) => c.city))}
          professions={distinct(contacts.map((c) => c.profession))}
          categories={distinct(contacts.map((c) => c.category))}
          statuses={distinct(contacts.map((c) => c.status))}
          tags={distinct(contacts.flatMap((c) => c.tags))}
          templates={approvedTemplates}
          sequences={sequences.map((s) => ({ id: s.id, name: s.name, stepCount: s.steps.length }))}
        />
      </CardContent>
    </Card>
  );
}
