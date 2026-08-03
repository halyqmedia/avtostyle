import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSION_DEFINITIONS, PERMISSIONS } from "../src/lib/permissions";
import { applyStockMovement } from "../src/lib/stock";

const prisma = new PrismaClient();

const DEV_PASSWORD = "avtostyle2026";

const SALES_STAGES = [
  {
    key: "NEW",
    name: "Жаңа лид",
    color: "#3B82F6",
    order: 0,
    isDefault: true,
    isFinal: false,
  },
  {
    key: "IN_PROGRESS",
    name: "Жұмыста",
    color: "#F59E0B",
    order: 1,
    isDefault: false,
    isFinal: false,
  },
  {
    key: "OFFER_SENT",
    name: "КП жіберілді",
    color: "#8B5CF6",
    order: 2,
    isDefault: false,
    isFinal: false,
  },
  {
    key: "NEGOTIATION",
    name: "Келіссөз",
    color: "#EC4899",
    order: 3,
    isDefault: false,
    isFinal: false,
  },
  {
    key: "WON",
    name: "Сәтті",
    color: "#22C55E",
    order: 4,
    isDefault: false,
    isFinal: true,
  },
  {
    key: "LOST",
    name: "Бас тартылды",
    color: "#EF4444",
    order: 5,
    isDefault: false,
    isFinal: true,
  },
];

const PRODUCTION_STAGES = [
  {
    key: "NEW_ORDER",
    name: "Жаңа тапсырыс",
    color: "#3B82F6",
    order: 0,
    isDefault: true,
    isFinal: false,
  },
  {
    key: "PATTERN_CUT",
    name: "Лекало кесу",
    color: "#F59E0B",
    order: 1,
    isDefault: false,
    isFinal: false,
  },
  {
    key: "SEWING",
    name: "Тігу бөлімі",
    color: "#8B5CF6",
    order: 2,
    isDefault: false,
    isFinal: false,
  },
  {
    key: "INSPECTION",
    name: "Тексеру",
    color: "#EC4899",
    order: 3,
    isDefault: false,
    isFinal: false,
  },
  {
    key: "PACKAGING",
    name: "Упаковка",
    color: "#06B6D4",
    order: 4,
    isDefault: false,
    isFinal: false,
  },
  {
    key: "LOGISTICS",
    name: "Логистика",
    color: "#F97316",
    order: 5,
    isDefault: false,
    isFinal: false,
  },
  {
    key: "DELIVERED",
    name: "Жеткізілді",
    color: "#22C55E",
    order: 6,
    isDefault: false,
    isFinal: true,
  },
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
    PERMISSIONS.PRODUCTION_ORDER_CREATE,
  ];
  const ropPermKeys = [
    PERMISSIONS.DEALS_VIEW_ALL,
    PERMISSIONS.DEALS_ASSIGN,
    PERMISSIONS.DEALS_CREATE,
    PERMISSIONS.DEALS_MOVE,
    PERMISSIONS.PRODUCTION_ORDER_CREATE,
    PERMISSIONS.ADMIN_PIPELINE_MANAGE,
    PERMISSIONS.ADMIN_QUICK_REPLIES_MANAGE,
  ];
  const productionPermKeys = [PERMISSIONS.PRODUCTION_ACCESS];
  const warehousePermKeys = [
    PERMISSIONS.WAREHOUSE_ACCESS,
    PERMISSIONS.WAREHOUSE_MANAGE,
  ];

  const roleDefs: {
    key: string;
    label: string;
    isSystem: boolean;
    permKeys: string[];
  }[] = [
    { key: "ADMIN", label: "Әкімші", isSystem: true, permKeys: allPermKeys },
    {
      key: "ROP",
      label: "Сату бөлімінің басшысы",
      isSystem: true,
      permKeys: ropPermKeys,
    },
    {
      key: "SALES",
      label: "Сату маманы",
      isSystem: true,
      permKeys: salesPermKeys,
    },
    {
      key: "PRODUCTION_WORKER",
      label: "Өндіріс жұмысшысы",
      isSystem: false,
      permKeys: productionPermKeys,
    },
    {
      key: "PRODUCTION_HEAD",
      label: "Өндіріс басшысы",
      isSystem: false,
      permKeys: productionPermKeys,
    },
    { key: "FINANCE", label: "Қаржы маманы", isSystem: false, permKeys: [] },
    {
      key: "WAREHOUSE",
      label: "Склад менеджері",
      isSystem: false,
      permKeys: warehousePermKeys,
    },
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
      const perms = await prisma.permission.findMany({
        where: { key: { in: r.permKeys } },
      });
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
      update: {
        name: s.name,
        color: s.color,
        order: s.order,
        isDefault: s.isDefault,
        isFinal: s.isFinal,
      },
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

  const productionStageIdByKey: Record<string, string> = {};
  for (const s of PRODUCTION_STAGES) {
    const stage = await prisma.pipelineStage.upsert({
      where: { pipeline_key: { pipeline: "PRODUCTION", key: s.key } },
      update: {
        name: s.name,
        color: s.color,
        order: s.order,
        isDefault: s.isDefault,
        isFinal: s.isFinal,
      },
      create: {
        pipeline: "PRODUCTION",
        key: s.key,
        name: s.name,
        color: s.color,
        order: s.order,
        isDefault: s.isDefault,
        isFinal: s.isFinal,
      },
    });
    productionStageIdByKey[s.key] = stage.id;
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
    {
      email: "production@avtostyle.kz",
      name: "Өндіріс жұмысшысы",
      roleKey: "PRODUCTION_WORKER",
    },
    {
      email: "production.head@avtostyle.kz",
      name: "Өндіріс басшысы",
      roleKey: "PRODUCTION_HEAD",
    },
    { email: "finance@avtostyle.kz", name: "Қаржы маманы", roleKey: "FINANCE" },
    {
      email: "warehouse@avtostyle.kz",
      name: "Склад менеджері",
      roleKey: "WAREHOUSE",
    },
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
      {
        name: "EVA Premium ковриктер жинағы (седан)",
        sku: "EVA-SED-01",
        category: "finished",
        price: 45000,
        cost: 18000,
      },
      {
        name: "EVA Premium ковриктер жинағы (кроссовер)",
        sku: "EVA-CRV-01",
        category: "finished",
        price: 55000,
        cost: 22000,
      },
      {
        name: "3D резеңке ковриктер жинағы",
        sku: "3D-RUB-01",
        category: "finished",
        price: 32000,
        cost: 14000,
      },
      {
        name: "EVA материал (рулон, қара)",
        sku: "MAT-EVA-BLK",
        category: "material",
        price: 0,
        cost: 8500,
        unit: "м",
      },
      {
        name: "Негіз резинасы (қаптама)",
        sku: "MAT-BASE-RUB",
        category: "material",
        price: 0,
        cost: 6200,
        unit: "дана",
      },
    ].map((p) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: {
          name: p.name,
          category: p.category,
          price: p.price,
          cost: p.cost,
          unit: p.unit ?? undefined,
        },
        create: p,
      }),
    ),
  );

  console.log("Seeding warehouse module...");
  const mainWarehouse =
    (await prisma.warehouse.findFirst({ where: { isDefault: true } })) ??
    (await prisma.warehouse.create({
      data: { name: "Негізгі склад", isDefault: true },
    }));

  const mainSupplier =
    (await prisma.supplier.findFirst({ where: { name: "EVA Market ЖШС" } })) ??
    (await prisma.supplier.create({
      data: {
        name: "EVA Market ЖШС",
        contactPerson: "Асхат",
        phone: "+7 707 111 9922",
      },
    }));

  const adminUserId = userIdByEmail["admin@avtostyle.kz"];
  const evaMaterial = products.find((p) => p.sku === "MAT-EVA-BLK")!;
  const baseRubber = products.find((p) => p.sku === "MAT-BASE-RUB")!;

  const existingDemoPO = await prisma.purchaseOrder.findFirst({
    where: { supplierId: mainSupplier.id },
  });
  if (!existingDemoPO) {
    await prisma.$transaction(
      async (tx) => {
        const po = await tx.purchaseOrder.create({
          data: {
            supplierId: mainSupplier.id,
            warehouseId: mainWarehouse.id,
            status: "RECEIVED",
            isPaid: true,
            comment: "Бастапқы қор — демо",
            createdById: adminUserId,
            items: {
              create: [
                {
                  productId: evaMaterial.id,
                  quantity: 100,
                  receivedQty: 100,
                  price: 8500,
                },
                {
                  productId: baseRubber.id,
                  quantity: 50,
                  receivedQty: 50,
                  price: 6200,
                },
              ],
            },
          },
          include: { items: true },
        });

        for (const item of po.items) {
          await applyStockMovement(tx, {
            productId: item.productId,
            warehouseId: mainWarehouse.id,
            type: "IN",
            quantity: Number(item.receivedQty),
            reason: "purchase_order",
            refId: po.id,
            createdById: adminUserId,
          });
        }
      },
      { timeout: 15000, maxWait: 10000 },
    );
  }

  console.log("Seeding demo clients...");
  const clientDefs = [
    {
      fullName: "Ерлан Жақсыбеков",
      phone: "+7 701 111 2233",
      source: "whatsapp",
    },
    {
      fullName: "Динара Ахметова",
      phone: "+7 702 222 3344",
      source: "instagram",
    },
    { fullName: "Марат Оспанов", phone: "+7 705 333 4455", source: "whatsapp" },
    {
      fullName: "Гүлнара Сериккызы",
      phone: "+7 707 444 5566",
      source: "referral",
    },
  ];
  const clients = [];
  for (const c of clientDefs) {
    const existing = await prisma.client.findFirst({
      where: { fullName: c.fullName },
    });
    clients.push(existing ?? (await prisma.client.create({ data: c })));
  }

  console.log("Seeding demo deals...");
  const adminId = userIdByEmail["admin@avtostyle.kz"];
  const dealSeeds = [
    {
      title: "Camry үшін ковриктер",
      clientIdx: 0,
      productIdx: 0,
      stage: "NEW",
      assignee: "sales1@avtostyle.kz",
      amount: 45000,
      prepayment: 0,
    },
    {
      title: "X5 үшін ковриктер жинағы",
      clientIdx: 1,
      productIdx: 1,
      stage: "IN_PROGRESS",
      assignee: "sales2@avtostyle.kz",
      amount: 55000,
      prepayment: 20000,
    },
    {
      title: "Optima ковриктер",
      clientIdx: 2,
      productIdx: 2,
      stage: "OFFER_SENT",
      assignee: "sales1@avtostyle.kz",
      amount: 32000,
      prepayment: 0,
    },
    {
      title: "Tucson резеңке ковриктер",
      clientIdx: 3,
      productIdx: 2,
      stage: "NEGOTIATION",
      assignee: "sales3@avtostyle.kz",
      amount: 32000,
      prepayment: 10000,
    },
    {
      title: "Sportage ковриктер жинағы",
      clientIdx: 1,
      productIdx: 1,
      stage: "WON",
      assignee: "sales2@avtostyle.kz",
      amount: 55000,
      prepayment: 55000,
    },
    {
      title: "Rio ковриктер (бас тартты)",
      clientIdx: 2,
      productIdx: 2,
      stage: "LOST",
      assignee: "sales4@avtostyle.kz",
      amount: 32000,
      prepayment: 0,
    },
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

  console.log("Seeding demo production orders...");
  const sportageDeal = await prisma.deal.findFirst({
    where: { title: "Sportage ковриктер жинағы" },
  });
  const productionOrderSeeds = [
    {
      dealId: sportageDeal?.id,
      clientName: "Динара Ахметова",
      clientPhone: "+7 702 222 3344",
      city: "Алматы",
      address: "Әл-Фараби даңғылы, 15",
      carBrand: "Kia",
      carYear: "2022",
      carGeneration: "4-ұрпақ (QL)",
      paymentAmount: 55000,
      paymentType: "card",
      remainingAmount: 0,
      note: "Демо тапсырыс — seed деректері",
      stage: "SEWING",
      items: [{ productType: "EVA Premium ковриктер жинағы (кроссовер)" }],
    },
    {
      dealId: null,
      clientName: "Ерлан Жақсыбеков",
      clientPhone: "+7 701 111 2233",
      city: "Астана",
      address: null,
      carBrand: "Toyota",
      carYear: "2021",
      carGeneration: null,
      paymentAmount: 45000,
      paymentType: "cash",
      remainingAmount: 0,
      note: null,
      stage: "NEW_ORDER",
      items: [{ productType: "EVA Premium ковриктер жинағы (седан)" }],
    },
  ];

  for (const o of productionOrderSeeds) {
    const existing = await prisma.productionOrder.findFirst({
      where: { clientName: o.clientName, note: o.note },
    });
    if (existing) continue;
    await prisma.productionOrder.create({
      data: {
        dealId: o.dealId ?? null,
        clientName: o.clientName,
        clientPhone: o.clientPhone,
        city: o.city,
        address: o.address,
        carBrand: o.carBrand,
        carYear: o.carYear,
        carGeneration: o.carGeneration,
        paymentAmount: o.paymentAmount,
        paymentType: o.paymentType,
        remainingAmount: o.remainingAmount,
        note: o.note,
        pipelineStageId: productionStageIdByKey[o.stage],
        createdById: adminId,
        items: { create: o.items },
      },
    });
  }

  console.log("Seeding quick replies...");
  const quickReplyDefs = [
    {
      title: "Сәлемдесу",
      body: "Сәлеметсіз бе! Avtostyle-ға хабарласқаныңыз үшін рахмет. Сізге қалай көмектесе аламын?",
    },
    {
      title: "Бағаны сұрау",
      body: "Дәл қазір бағаны нақтылап, сізге хабарлаймын, сәл күте тұрыңызшы.",
    },
    {
      title: "Дайын, алуға болады",
      body: "Тапсырысыңыз дайын болды, алуға келе аласыз.",
    },
  ];
  for (const q of quickReplyDefs) {
    const existing = await prisma.quickReply.findFirst({
      where: { title: q.title },
    });
    if (!existing) await prisma.quickReply.create({ data: q });
  }

  console.log(
    "Seed complete. Dev password for all seeded users:",
    DEV_PASSWORD,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
