import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSION_DEFINITIONS, PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

const DEV_PASSWORD = "avtostyle2026";

const SALES_STAGES = [
  { key: "NEW", name: "Жаңа лид", color: "#3B82F6", order: 0, isDefault: true, isFinal: false },
  { key: "IN_PROGRESS", name: "Жұмыста", color: "#F59E0B", order: 1, isDefault: false, isFinal: false },
  { key: "OFFER_SENT", name: "КП жіберілді", color: "#8B5CF6", order: 2, isDefault: false, isFinal: false },
  { key: "NEGOTIATION", name: "Келіссөз", color: "#EC4899", order: 3, isDefault: false, isFinal: false },
  { key: "WON", name: "Сәтті", color: "#22C55E", order: 4, isDefault: false, isFinal: true },
  { key: "LOST", name: "Бас тартылды", color: "#EF4444", order: 5, isDefault: false, isFinal: true },
];

async function main() {
  console.log("Seeding permissions...");
  for (const p of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, module: p.module },
      create: { key: p.key, label: p.label, module: p.module },
    });
  }

  console.log("Seeding roles...");
  const allPermKeys = PERMISSION_DEFINITIONS.map((p) => p.key);
  const salesPermKeys = [
    PERMISSIONS.DEALS_VIEW_OWN,
    PERMISSIONS.DEALS_CREATE,
    PERMISSIONS.DEALS_MOVE,
  ];
  const ropPermKeys = [
    PERMISSIONS.DEALS_VIEW_ALL,
    PERMISSIONS.DEALS_ASSIGN,
    PERMISSIONS.DEALS_CREATE,
    PERMISSIONS.DEALS_MOVE,
    PERMISSIONS.ADMIN_PIPELINE_MANAGE,
  ];

  const roleDefs: { key: string; label: string; isSystem: boolean; permKeys: string[] }[] = [
    { key: "ADMIN", label: "Әкімші", isSystem: true, permKeys: allPermKeys },
    { key: "ROP", label: "Сату бөлімінің басшысы", isSystem: true, permKeys: ropPermKeys },
    { key: "SALES", label: "Сату маманы", isSystem: true, permKeys: salesPermKeys },
    { key: "PRODUCTION_WORKER", label: "Өндіріс жұмысшысы", isSystem: false, permKeys: [] },
    { key: "PRODUCTION_HEAD", label: "Өндіріс басшысы", isSystem: false, permKeys: [] },
    { key: "FINANCE", label: "Қаржы маманы", isSystem: false, permKeys: [] },
    { key: "WAREHOUSE", label: "Склад менеджері", isSystem: false, permKeys: [] },
  ];

  const roleIdByKey: Record<string, string> = {};

  for (const r of roleDefs) {
    const role = await prisma.role.upsert({
      where: { key: r.key },
      update: { label: r.label, isSystem: r.isSystem },
      create: { key: r.key, label: r.label, isSystem: r.isSystem },
    });
    roleIdByKey[r.key] = role.id;

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (r.permKeys.length > 0) {
      const perms = await prisma.permission.findMany({ where: { key: { in: r.permKeys } } });
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }

  console.log("Seeding pipeline stages...");
  const stageIdByKey: Record<string, string> = {};
  for (const s of SALES_STAGES) {
    const stage = await prisma.pipelineStage.upsert({
      where: { pipeline_key: { pipeline: "SALES", key: s.key } },
      update: { name: s.name, color: s.color, order: s.order, isDefault: s.isDefault, isFinal: s.isFinal },
      create: {
        pipeline: "SALES",
        key: s.key,
        name: s.name,
        color: s.color,
        order: s.order,
        isDefault: s.isDefault,
        isFinal: s.isFinal,
      },
    });
    stageIdByKey[s.key] = stage.id;
  }

  console.log("Seeding users...");
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const userDefs = [
    { email: "admin@avtostyle.kz", name: "Әкімші", roleKey: "ADMIN" },
    { email: "rop@avtostyle.kz", name: "Айгүл Сатбаева (РОП)", roleKey: "ROP" },
    { email: "sales1@avtostyle.kz", name: "Сату маманы 1", roleKey: "SALES" },
    { email: "sales2@avtostyle.kz", name: "Сату маманы 2", roleKey: "SALES" },
    { email: "sales3@avtostyle.kz", name: "Сату маманы 3", roleKey: "SALES" },
    { email: "sales4@avtostyle.kz", name: "Сату маманы 4", roleKey: "SALES" },
    { email: "sales5@avtostyle.kz", name: "Сату маманы 5", roleKey: "SALES" },
    { email: "sales6@avtostyle.kz", name: "Сату маманы 6", roleKey: "SALES" },
    { email: "sales7@avtostyle.kz", name: "Сату маманы 7", roleKey: "SALES" },
    { email: "production@avtostyle.kz", name: "Өндіріс жұмысшысы", roleKey: "PRODUCTION_WORKER" },
    { email: "production.head@avtostyle.kz", name: "Өндіріс басшысы", roleKey: "PRODUCTION_HEAD" },
    { email: "finance@avtostyle.kz", name: "Қаржы маманы", roleKey: "FINANCE" },
    { email: "warehouse@avtostyle.kz", name: "Склад менеджері", roleKey: "WAREHOUSE" },
  ];

  const userIdByEmail: Record<string, string> = {};
  for (const u of userDefs) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, roleId: roleIdByKey[u.roleKey] },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        roleId: roleIdByKey[u.roleKey],
      },
    });
    userIdByEmail[u.email] = user.id;
  }

  console.log("Seeding demo products...");
  const products = await Promise.all(
    [
      { name: "EVA Premium ковриктер жинағы (седан)", sku: "EVA-SED-01", price: 45000, cost: 18000 },
      { name: "EVA Premium ковриктер жинағы (кроссовер)", sku: "EVA-CRV-01", price: 55000, cost: 22000 },
      { name: "3D резеңке ковриктер жинағы", sku: "3D-RUB-01", price: 32000, cost: 14000 },
    ].map((p) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: { name: p.name, price: p.price, cost: p.cost },
        create: p,
      }),
    ),
  );

  console.log("Seeding demo clients...");
  const clientDefs = [
    { fullName: "Ерлан Жақсыбеков", phone: "+7 701 111 2233", source: "whatsapp" },
    { fullName: "Динара Ахметова", phone: "+7 702 222 3344", source: "instagram" },
    { fullName: "Марат Оспанов", phone: "+7 705 333 4455", source: "whatsapp" },
    { fullName: "Гүлнара Сериккызы", phone: "+7 707 444 5566", source: "referral" },
  ];
  const clients = [];
  for (const c of clientDefs) {
    const existing = await prisma.client.findFirst({ where: { fullName: c.fullName } });
    clients.push(existing ?? (await prisma.client.create({ data: c })));
  }

  console.log("Seeding demo deals...");
  const adminId = userIdByEmail["admin@avtostyle.kz"];
  const dealSeeds = [
    { title: "Camry үшін ковриктер", clientIdx: 0, productIdx: 0, stage: "NEW", assignee: "sales1@avtostyle.kz", amount: 45000, prepayment: 0 },
    { title: "X5 үшін ковриктер жинағы", clientIdx: 1, productIdx: 1, stage: "IN_PROGRESS", assignee: "sales2@avtostyle.kz", amount: 55000, prepayment: 20000 },
    { title: "Optima ковриктер", clientIdx: 2, productIdx: 2, stage: "OFFER_SENT", assignee: "sales1@avtostyle.kz", amount: 32000, prepayment: 0 },
    { title: "Tucson резеңке ковриктер", clientIdx: 3, productIdx: 2, stage: "NEGOTIATION", assignee: "sales3@avtostyle.kz", amount: 32000, prepayment: 10000 },
    { title: "Sportage ковриктер жинағы", clientIdx: 1, productIdx: 1, stage: "WON", assignee: "sales2@avtostyle.kz", amount: 55000, prepayment: 55000 },
    { title: "Rio ковриктер (бас тартты)", clientIdx: 2, productIdx: 2, stage: "LOST", assignee: "sales4@avtostyle.kz", amount: 32000, prepayment: 0 },
  ];

  for (const d of dealSeeds) {
    const existing = await prisma.deal.findFirst({ where: { title: d.title } });
    if (existing) continue;
    await prisma.deal.create({
      data: {
        title: d.title,
        clientId: clients[d.clientIdx].id,
        productId: products[d.productIdx].id,
        amount: d.amount,
        prepayment: d.prepayment,
        pipelineStageId: stageIdByKey[d.stage],
        assignedToId: userIdByEmail[d.assignee],
        createdById: adminId,
        source: "manual",
      },
    });
  }

  console.log("Seed complete. Dev password for all seeded users:", DEV_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
