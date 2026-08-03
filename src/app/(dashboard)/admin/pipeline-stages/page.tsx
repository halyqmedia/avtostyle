import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { PipelineStageRow } from "@/components/admin/pipeline-stage-row";
import { CreateStageForm } from "@/components/admin/create-stage-form";

export default async function AdminPipelineStagesPage() {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);

  const [salesStages, productionStages] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { pipeline: "SALES" }, orderBy: { order: "asc" } }),
    prisma.pipelineStage.findMany({ where: { pipeline: "PRODUCTION" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Сату (CRM)</h2>
          <p className="text-sm text-muted-foreground">
            Сату pipeline-ы (kanban) кезеңдерінің атауы, түсі және реті. Түстер kanban тақтасындағы
            әр ұяшықты бөлек түспен көрсету үшін қолданылады.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {salesStages.map((s, i) => (
            <PipelineStageRow
              key={s.id}
              stage={s}
              isFirst={i === 0}
              isLast={i === salesStages.length - 1}
            />
          ))}
        </div>
        <CreateStageForm pipeline="SALES" />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Өндіріс (конвейр)</h2>
          <p className="text-sm text-muted-foreground">
            Өндіріс бөлімінің конвейр kanban-ындағы кезеңдер. Атауы, түсі және реті осы жерден
            басқарылады.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {productionStages.map((s, i) => (
            <PipelineStageRow
              key={s.id}
              stage={s}
              isFirst={i === 0}
              isLast={i === productionStages.length - 1}
            />
          ))}
        </div>
        <CreateStageForm pipeline="PRODUCTION" />
      </section>
    </div>
  );
}
