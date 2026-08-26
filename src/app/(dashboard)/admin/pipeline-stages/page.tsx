import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { PipelineStageRow } from "@/components/admin/pipeline-stage-row";
import { CreateStageForm } from "@/components/admin/create-stage-form";

export default async function AdminPipelineStagesPage() {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);

  const [funnels, productionStages] = await Promise.all([
    prisma.funnel.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.pipelineStage.findMany({ where: { pipeline: "PRODUCTION" }, orderBy: { order: "asc" } }),
  ]);
  const stagesByFunnel = await Promise.all(
    funnels.map((f) => prisma.pipelineStage.findMany({ where: { pipeline: f.key }, orderBy: { order: "asc" } })),
  );

  return (
    <div className="flex flex-col gap-8">
      {funnels.map((funnel, i) => (
        <section key={funnel.id} className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold">Сату — {funnel.name}</h2>
            <p className="text-sm text-muted-foreground">
              «{funnel.name}» воронкасының kanban кезеңдерінің атауы, түсі және реті. Түстер kanban
              тақтасындағы әр ұяшықты бөлек түспен көрсету үшін қолданылады.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {stagesByFunnel[i].map((s, j) => (
              <PipelineStageRow
                key={s.id}
                stage={s}
                isFirst={j === 0}
                isLast={j === stagesByFunnel[i].length - 1}
              />
            ))}
          </div>
          <CreateStageForm pipeline={funnel.key} />
        </section>
      ))}

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
