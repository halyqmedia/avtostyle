"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { updateUserPhoto } from "@/actions/users";
import { Button } from "@/components/ui/button";

export function EmployeePhotoForm({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateUserPhoto(userId, formData);
        toast.success("Фото жаңартылды");
        if (inputRef.current) inputRef.current.value = "";
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Фото жүктелмеді");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2">
      <input ref={inputRef} type="file" name="photo" accept="image/*" className="text-xs" required />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Жүктелуде..." : "Фото жүктеу"}
      </Button>
    </form>
  );
}
