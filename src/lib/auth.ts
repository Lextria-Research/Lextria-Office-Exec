// src/lib/auth.ts
// Handles authentication in dual modes: 'test' (preset role accounts) and 'otp' (6-digit email OTP).
// Also manages SUPER_ADMIN "View As Role" simulation and role authorization helpers.

export type Role =
  | 'SUPER_ADMIN'
  | 'DEPT_ADMIN'
  | 'FINANCE'
  | 'PARALEGAL'
  | 'DRAFTER'
  | 'ASSOCIATE'
  | 'INTERN'
  | 'OFFICE_EXEC'
  | 'STAFF';

export type Department =
  | 'MANAGEMENT'
  | 'IP_PATENT'
  | 'IP_SOFT'
  | 'PARALEGAL'
  | 'LITIGATION'
  | 'AGREEMENT'
  | 'FINANCE'
  | 'OFFICE';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  department: Department;
  reports_to?: string | null;
  is_finance_lead: boolean;
  active: boolean;
}

export const AUTH_MODE: 'test' | 'otp' = 
  (import.meta.env.VITE_AUTH_MODE as 'test' | 'otp') || 'test';

export const SEEDED_TEST_USERS: UserProfile[] = [
  {
    id: '5181fd8c-5ab0-49ca-a239-7777c4b9def9',
    email: 'oe@lextria-demo.test',
    display_name: 'Suresh Kumar (Office Executive)',
    role: 'OFFICE_EXEC',
    department: 'OFFICE',
    is_finance_lead: false,
    active: true,
  },
  {
    id: '8bef58e0-d345-4909-b58f-d639ef469b00',
    email: 'fe1@lextria-demo.test',
    display_name: 'Pooja Iyer (Finance Executive)',
    role: 'FINANCE',
    department: 'FINANCE',
    is_finance_lead: false,
    active: true,
  },
  {
    id: 'fl-uuid-finance-lead',
    email: 'fl@lextria-demo.test',
    display_name: 'Ramesh Patel (Finance Lead)',
    role: 'FINANCE',
    department: 'FINANCE',
    is_finance_lead: true,
    active: true,
  },
  {
    id: '38716429-116c-446b-8f13-a2731d60b31b',
    email: 'pa1@lextria-demo.test',
    display_name: 'Meera Rao (Staff / Associate)',
    role: 'STAFF',
    department: 'PARALEGAL',
    is_finance_lead: false,
    active: true,
  },
  {
    id: 'pl1-uuid-dept-admin',
    email: 'pl1@lextria-demo.test',
    display_name: 'Vikram Seth (Department Admin)',
    role: 'DEPT_ADMIN',
    department: 'IP_PATENT',
    is_finance_lead: false,
    active: true,
  },
  {
    id: 'sa1-uuid-super-admin',
    email: 'sa1@lextria-demo.test',
    display_name: 'Ananya Sharma (Admin / Partner)',
    role: 'SUPER_ADMIN',
    department: 'MANAGEMENT',
    is_finance_lead: false,
    active: true,
  },
];

const LOCAL_STORAGE_USER_KEY = 'lextria_active_profile';
const LOCAL_STORAGE_VIEW_AS_KEY = 'lextria_view_as_role';

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  // Default to Office Executive for initial testing
  return SEEDED_TEST_USERS[0];
}

export function setStoredUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_VIEW_AS_KEY);
  }
}

export function signOutUser() {
  setStoredUser(null);
}

export function getViewAsRole(): Role | null {
  return (localStorage.getItem(LOCAL_STORAGE_VIEW_AS_KEY) as Role) || null;
}

export function setViewAsRole(role: Role | null) {
  if (role) {
    localStorage.setItem(LOCAL_STORAGE_VIEW_AS_KEY, role);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_VIEW_AS_KEY);
  }
}

/**
 * Returns effective role accounting for SUPER_ADMIN "View As Role" simulation
 */
export function getEffectiveRole(user: UserProfile | null): Role {
  if (!user) return 'STAFF';
  if (user.role === 'SUPER_ADMIN') {
    const viewAs = getViewAsRole();
    if (viewAs) return viewAs;
  }
  return user.role;
}

export function hasRole(user: UserProfile | null, allowedRoles: Role[]): boolean {
  const role = getEffectiveRole(user);
  return allowedRoles.includes(role);
}

export function isOfficeExec(user: UserProfile | null): boolean {
  return hasRole(user, ['OFFICE_EXEC', 'SUPER_ADMIN']);
}

export function isFinance(user: UserProfile | null): boolean {
  return hasRole(user, ['FINANCE', 'SUPER_ADMIN']);
}

export function isSuperAdmin(user: UserProfile | null): boolean {
  return user?.role === 'SUPER_ADMIN';
}
