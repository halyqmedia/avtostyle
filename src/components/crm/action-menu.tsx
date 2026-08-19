"use client";

import { MoreHorizontal, History, NotebookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ActionMenu({ dealId }: { dealId: string }) {
  void dealId; // reserved for future per-deal actions (transfer, close, etc.)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href="#notes">
            <NotebookText className="size-3.5" />
            Ескертпелерге өту
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="#history">
            <History className="size-3.5" />
            Кезеңдер тарихына өту
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
