import { MessagesSquare } from "lucide-react";

export default function ChatsIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <MessagesSquare className="size-10 opacity-40" />
      <p className="text-sm">Чатты таңдау үшін сол жақтан таңдаңыз</p>
    </div>
  );
}
