import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { PipelineStageRow } from "@/components/admin/pipeline-stage-row";
import { CreateStageForm } from "@/components/admin/create-stage-form";

export default async function AdminPipelineStagesPage() {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);

  const stages = await prisma.pipelineStage.findMany({
    where: { pipeline: "SALES" },
    orderBy: { order: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Сату pipeline-ы (kanban) кезеңдерінің атауы, түсі және реті. Түстер kanban тақтасындағы
        әр ұяшықты бөлек түспен көрсету үшін қолданылады.
      </p>
      <div className="flex flex-col gap-2">
        {stages.map((s, i) => (
          <PipelineStageRow
            key={s.id}
            stage={s}
            isFirst={i === 0}
            isLast={i === stages.length - 1}
          />
        ))}
      </div>
      <CreateStageForm pipeline="SALES" />
    </div>
  );
}
