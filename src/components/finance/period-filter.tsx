import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/** Plain GET form (no client JS needed) — reads/writes ?from=&to= on the current path. */
export function PeriodFilter({
  action,
  from,
  to,
  exportHref,
}: {
  action: string;
  from: string;
  to: string;
  exportHref?: string;
}) {
  return (
    <form action={action} method="GET" className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from">Кезең басы</Label>
        <Input id="from" name="from" type="date" defaultValue={from} className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to">Кезең соңы</Label>
        <Input id="to" name="to" type="date" defaultValue={to} className="w-40" />
      </div>
      <Button type="submit" variant="secondary">
        Есеп жасау
      </Button>
      {exportHref && (
        <Button asChild variant="outline">
          <a href={exportHref}>Excel-ге жүктеу</a>
        </Button>
      )}
    </form>
  );
}
