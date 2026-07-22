/** Permission helpers — no Prisma enum runtime imports (safe for middleware). */

export const MODULES = [
  'DASHBOARD',
  'STUDENTS',
  'ADMISSIONS',
  'ATTENDANCE',
  'EXAMS',
  'FEES',
  'TEACHERS',
  'ACCOUNTS',
  'INVENTORY',
  'REPORTS',
  'SETTINGS',
  'USERS',
  'CONFIGURATION',
] as const;

export const ACTIONS = [
  'VIEW',
  'CREATE',
  'EDIT',
  'DELETE',
  'APPROVE',
] as const;

export type ModuleKey = (typeof MODULES)[number];
export type ActionKey = (typeof ACTIONS)[number];
export type PermissionKey = `${ModuleKey}:${ActionKey}`;
export type RoleKey =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT'
  | 'ACCOUNTANT'
  | 'STAFF';

export function permissionKey(module: string, action: string): PermissionKey {
  return `${module}:${action}` as PermissionKey;
}

export const PATH_MODULE_MAP: { prefix: string; module: ModuleKey }[] = [
  { prefix: '/configuration', module: 'CONFIGURATION' },
  { prefix: '/schools', module: 'CONFIGURATION' },
  { prefix: '/class-groups', module: 'CONFIGURATION' },
  { prefix: '/subject-groups', module: 'CONFIGURATION' },
  { prefix: '/classes', module: 'CONFIGURATION' },
  { prefix: '/users', module: 'USERS' },
  { prefix: '/staff', module: 'TEACHERS' },
  { prefix: '/students', module: 'STUDENTS' },
  { prefix: '/attendance', module: 'ATTENDANCE' },
  { prefix: '/exams', module: 'EXAMS' },
  { prefix: '/finance', module: 'FEES' },
];

type AuthUser = {
  role?: string | null;
  permissions?: string[] | null;
  campusIds?: string[] | null;
  schoolId?: string | null;
  id?: string | null;
};

type PrismaLike = {
  rolePermission: {
    findMany: (args: unknown) => Promise<
      { permission: { module: string; action: string } }[]
    >;
    upsert: (args: unknown) => Promise<unknown>;
  };
  userPermission: {
    findMany: (args: unknown) => Promise<
      { granted: boolean; permission: { module: string; action: string } }[]
    >;
  };
  campusAccess: {
    findMany: (args: unknown) => Promise<{ campusId: string }[]>;
  };
  permission: {
    findMany: (args?: unknown) => Promise<
      { id: string; module: string; action: string }[]
    >;
    upsert: (args: unknown) => Promise<unknown>;
  };
};

export function can(
  user: AuthUser | null | undefined,
  module: ModuleKey | string,
  action: ActionKey | string = 'VIEW'
): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const key = permissionKey(module, String(action));

  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(key);
  }

  const role = user.role as Exclude<RoleKey, 'SUPER_ADMIN'> | undefined;
  if (!role || !(role in ROLE_DEFAULT_MODULES)) return false;
  const defaults = ROLE_DEFAULT_MODULES[role];
  const actions = defaults?.[module as ModuleKey] || [];
  return actions.includes(String(action) as ActionKey);
}

export function hasCampusAccess(
  user: AuthUser | null | undefined,
  campusId: string
): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  const ids = user.campusIds;
  if (!ids || ids.length === 0) return false;
  return ids.includes(campusId);
}

export function moduleForPath(pathname: string): ModuleKey | null {
  const match = PATH_MODULE_MAP.find((m) => pathname.startsWith(m.prefix));
  return match?.module ?? null;
}

export const ROLE_DEFAULT_MODULES: Record<
  Exclude<RoleKey, 'SUPER_ADMIN'>,
  Partial<Record<ModuleKey, ActionKey[]>>
> = {
  ADMIN: {
    DASHBOARD: [...ACTIONS],
    STUDENTS: [...ACTIONS],
    ADMISSIONS: [...ACTIONS],
    ATTENDANCE: [...ACTIONS],
    EXAMS: [...ACTIONS],
    FEES: [...ACTIONS],
    TEACHERS: [...ACTIONS],
    ACCOUNTS: [...ACTIONS],
    INVENTORY: [...ACTIONS],
    REPORTS: [...ACTIONS],
    SETTINGS: [...ACTIONS],
    USERS: [...ACTIONS],
    CONFIGURATION: [...ACTIONS],
  },
  TEACHER: {
    DASHBOARD: ['VIEW'],
    STUDENTS: ['VIEW', 'EDIT'],
    ATTENDANCE: ['VIEW', 'CREATE', 'EDIT'],
    EXAMS: ['VIEW', 'CREATE', 'EDIT'],
    REPORTS: ['VIEW'],
  },
  ACCOUNTANT: {
    DASHBOARD: ['VIEW'],
    STUDENTS: ['VIEW'],
    FEES: [...ACTIONS],
    ACCOUNTS: [...ACTIONS],
    REPORTS: ['VIEW'],
  },
  STAFF: {
    DASHBOARD: ['VIEW'],
    ATTENDANCE: ['VIEW'],
  },
  STUDENT: {
    DASHBOARD: ['VIEW'],
  },
  PARENT: {
    DASHBOARD: ['VIEW'],
  },
};

export async function resolveUserPermissions(
  prisma: PrismaLike,
  userId: string,
  role: string
): Promise<string[]> {
  if (role === 'SUPER_ADMIN') {
    return MODULES.flatMap((m) => ACTIONS.map((a) => permissionKey(m, a)));
  }

  const rolePerms = await prisma.rolePermission.findMany({
    where: { role },
    include: { permission: true },
  });

  const set = new Set(
    rolePerms.map((rp) =>
      permissionKey(rp.permission.module, rp.permission.action)
    )
  );

  const overrides = await prisma.userPermission.findMany({
    where: { userId },
    include: { permission: true },
  });

  for (const o of overrides) {
    const key = permissionKey(o.permission.module, o.permission.action);
    if (o.granted) set.add(key);
    else set.delete(key);
  }

  return Array.from(set);
}

export async function resolveCampusIds(
  prisma: PrismaLike,
  userId: string
): Promise<string[]> {
  const rows = await prisma.campusAccess.findMany({
    where: { userId },
    select: { campusId: true },
  });
  return rows.map((r) => r.campusId);
}

export async function seedPermissionCatalog(prisma: PrismaLike) {
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action },
      });
    }
  }

  const allPerms = await prisma.permission.findMany();
  const byKey = new Map(
    allPerms.map((p) => [permissionKey(p.module, p.action), p])
  );

  for (const [role, modules] of Object.entries(ROLE_DEFAULT_MODULES) as [
    Exclude<RoleKey, 'SUPER_ADMIN'>,
    Partial<Record<ModuleKey, ActionKey[]>>,
  ][]) {
    for (const [module, actions] of Object.entries(modules) as [
      ModuleKey,
      ActionKey[],
    ][]) {
      for (const action of actions) {
        const perm = byKey.get(permissionKey(module, action));
        if (!perm) continue;
        await prisma.rolePermission.upsert({
          where: {
            role_permissionId: { role, permissionId: perm.id },
          },
          update: {},
          create: { role, permissionId: perm.id },
        });
      }
    }
  }
}
