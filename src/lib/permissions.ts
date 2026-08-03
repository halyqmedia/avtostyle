export const PERMISSIONS = {
  ADMIN_ACCESS: "admin.access",
  ADMIN_USERS_MANAGE: "admin.users.manage",
  ADMIN_ROLES_MANAGE: "admin.roles.manage",
  ADMIN_PIPELINE_MANAGE: "admin.pipeline.manage",
  ADMIN_QUICK_REPLIES_MANAGE: "admin.quick_replies.manage",
  DEALS_VIEW_OWN: "deals.view.own",
  DEALS_VIEW_ALL: "deals.view.all",
  DEALS_CREATE: "deals.create",
  DEALS_ASSIGN: "deals.assign",
  DEALS_MOVE: "deals.move",
  PRODUCTION_ORDER_CREATE: "production.order.create",
  PRODUCTION_ACCESS: "production.access",
  FINANCE_ACCESS: "finance.access",
  WAREHOUSE_ACCESS: "warehouse.access",
  WAREHOUSE_MANAGE: "warehouse.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_DEFINITIONS: {
  key: PermissionKey;
  label: string;
  module: "admin" | "sales" | "production" | "finance" | "warehouse";
}[] = [
  { key: PERMISSIONS.ADMIN_ACCESS, label: "Админ панельге кіру", module: "admin" },
  { key: PERMISSIONS.ADMIN_USERS_MANAGE, label: "Қызметкерлерді басқару", module: "admin" },
  { key: PERMISSIONS.ADMIN_ROLES_MANAGE, label: "Рөлдер мен доступты басқару", module: "admin" },
  { key: PERMISSIONS.ADMIN_PIPELINE_MANAGE, label: "Pipeline кезеңдерін басқару", module: "admin" },
  { key: PERMISSIONS.ADMIN_QUICK_REPLIES_MANAGE, label: "Жылдам жауаптарды басқару", module: "admin" },
  { key: PERMISSIONS.DEALS_VIEW_OWN, label: "Тек өз сделкаларын көру", module: "sales" },
  { key: PERMISSIONS.DEALS_VIEW_ALL, label: "Барлық сделкаларды көру", module: "sales" },
  { key: PERMISSIONS.DEALS_CREATE, label: "Сделка құру", module: "sales" },
  { key: PERMISSIONS.DEALS_ASSIGN, label: "Сделканы маманға бөлу", module: "sales" },
  { key: PERMISSIONS.DEALS_MOVE, label: "Сделканы этаптар арасында жылжыту", module: "sales" },
  { key: PERMISSIONS.PRODUCTION_ORDER_CREATE, label: "Өндіріске заявка құру", module: "sales" },
  { key: PERMISSIONS.PRODUCTION_ACCESS, label: "Өндіріс модуліне кіру (конвейр)", module: "production" },
  { key: PERMISSIONS.FINANCE_ACCESS, label: "Қаржы модуліне кіру", module: "finance" },
  { key: PERMISSIONS.WAREHOUSE_ACCESS, label: "Склад модуліне кіру", module: "warehouse" },
  {
    key: PERMISSIONS.WAREHOUSE_MANAGE,
    label: "Складты басқару (тауар, жабдықтаушы, заказ, түзету)",
    module: "warehouse",
  },
];

export function hasPermission(
  userPermissions: string[] | undefined,
  required: PermissionKey,
): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes(required);
}
