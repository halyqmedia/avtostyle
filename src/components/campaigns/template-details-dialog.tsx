"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABEL: Record<string, string> = { MARKETING: "Marketing", UTILITY: "Utility" };
const HEADER_TYPE_LABEL: Record<string, string> = { IMAGE: "Сурет", DOCUMENT: "Файл" };

export function TemplateDetailsDialog({
  template,
  children,
}: {
  template: {
    name: string;
    language: string;
    category: string;
    bodyText: string;
    footerText: string | null;
    buttons: string[];
    headerType: string | null;
    headerFileName: string | null;
    rejectedReason: string | null;
  };
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{template.language === "kk" ? "Қазақша" : "Орысша"}</Badge>
            <Badge variant="outline">{CATEGORY_LABEL[template.category] ?? template.category}</Badge>
            {template.headerType && (
              <Badge variant="outline">{HEADER_TYPE_LABEL[template.headerType] ?? template.headerType}</Badge>
            )}
          </div>
          {template.headerFileName && (
            <p className="text-muted-foreground">Файл атауы: {template.headerFileName}</p>
          )}
          <div>
            <p className="mb-1 font-medium">Мәтін</p>
            <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3">{template.bodyText}</p>
          </div>
          {template.footerText && (
            <div>
              <p className="mb-1 font-medium">Аяқтауыш жол</p>
              <p className="text-muted-foreground">{template.footerText}</p>
            </div>
          )}
          {template.buttons.length > 0 && (
            <div>
              <p className="mb-1 font-medium">Жылдам жауап түймелері</p>
              <div className="flex flex-wrap gap-2">
                {template.buttons.map((b) => (
                  <Badge key={b} variant="secondary">
                    {b}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {template.rejectedReason && (
            <p className="text-destructive">Қабылданбау себебі: {template.rejectedReason}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
