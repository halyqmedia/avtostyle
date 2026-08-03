"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { resetUserPassword } from "@/actions/users";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    startTransition(async () => {
      try {
        await resetUserPassword(userId, password);
        setError(undefined);
        toast.success("Құпия сөз ауыстырылды");
        if (inputRef.current) inputRef.current.value = "";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Қате шықты");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          name="password"
          type="text"
          placeholder="Жаңа құпия сөз"
          minLength={6}
          required
          className="w-56"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Сақталуда..." : "Құпия сөзді ауыстыру"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
