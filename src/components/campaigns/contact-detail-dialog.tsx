"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getContactChat, updateContact, type ContactChatMessage } from "@/actions/contacts";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WhatsAppChat } from "@/components/crm/whatsapp-chat";
import type { ContactRow } from "@/components/campaigns/edit-contact-dialog";

export function ContactDetailDialog({
  contact,
  open,
  onOpenChange,
}: {
  contact: (ContactRow & { dealId: string | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [chat, setChat] = useState<{
    contactId: string;
    dealId: string | null;
    messages: ContactChatMessage[];
  } | null>(null);

  useEffect(() => {
    if (!open || !contact) return;
    let cancelled = false;
    getContactChat(contact.id)
      .then((result) => {
        if (!cancelled) setChat({ contactId: contact.id, ...result });
      })
      .catch(() => {
        if (!cancelled) setChat({ contactId: contact.id, dealId: null, messages: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [open, contact]);

  if (!contact) return null;

  const loadingChat = chat?.contactId !== contact.id;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateContact(contact!.id, formData);
        toast.success("Сақталды");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Сақталмады");
      }
    });
  }

  const link = buildWhatsAppLink(contact.phone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {contact.fullName || contact.phone}
            {contact.dealId && (
              <Link
                href={`/crm/deals/${contact.dealId}`}
                className="text-xs font-normal text-muted-foreground hover:underline"
              >
                Сделкада ашу →
              </Link>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <form action={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Телефон">
                <Input defaultValue={contact.phone} disabled />
              </Field>
              <Field label="Аты-жөні">
                <Input name="fullName" defaultValue={contact.fullName ?? ""} />
              </Field>
              <Field label="Қаласы">
                <Input name="city" defaultValue={contact.city ?? ""} />
              </Field>
              <Field label="Кәсібі">
                <Input name="profession" defaultValue={contact.profession ?? ""} />
              </Field>
              <Field label="Бағыты">
                <Input name="category" defaultValue={contact.category ?? ""} />
              </Field>
              <Field label="Статус">
                <Input name="status" defaultValue={contact.status ?? ""} />
              </Field>
            </div>
            <Field label="Тегтер (үтірмен)">
              <Input name="tags" defaultValue={contact.tags.join(", ")} />
            </Field>
            <Field label="Ескертпе">
              <textarea
                name="notes"
                defaultValue={contact.notes ?? ""}
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
            <Button type="submit" disabled={pending} className="self-start">
              {pending ? "Сақталуда..." : "Сақтау"}
            </Button>
          </form>

          <div className="flex flex-col gap-2 border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
            <Label className="text-xs text-muted-foreground">WhatsApp чат</Label>
            {loadingChat ? (
              <p className="text-sm text-muted-foreground">Жүктелуде...</p>
            ) : chat?.dealId ? (
              <WhatsAppChat
                dealId={chat.dealId}
                clientName={contact.fullName ?? contact.phone}
                phone={contact.phone}
                messages={chat.messages}
                canSend
              />
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Бұл клиент әлі жауап берген жоқ — чат тарихы жоқ. Рассылка немесе тізбек арқылы хат кетіп, клиент
                  жауап бергенде сөйлесу осында көрінеді.
                </p>
                {link && (
                  <Button asChild size="sm" variant="outline" className="self-start">
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      WhatsApp-та жазу
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
