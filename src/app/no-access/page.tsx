import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">Доступ жоқ</h1>
      <p className="max-w-md text-muted-foreground">
        Бұл бетке кіру құқығыңыз жоқ. Егер бұл қате деп ойласаңыз, әкімшіге хабарласыңыз.
      </p>
      <Button asChild className="mt-2">
        <Link href="/crm">Бас бетке оралу</Link>
      </Button>
    </div>
  );
}
